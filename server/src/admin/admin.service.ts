import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { User } from '../auth/domain/entities/user';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { ForumCommentEntity } from '../forum/infrastructure/persistence/relational/entities/forum-comment.entity';
import { ForumPostEntity } from '../forum/infrastructure/persistence/relational/entities/forum-post.entity';
import { MatchEntity } from '../game/infrastructure/persistence/relational/entities/match.entity';
import { RoomEntity } from '../game/infrastructure/persistence/relational/entities/room.entity';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { AdminForceFinishMatchDto } from './dto/admin-force-finish-match.dto';
import { AdminRoomBanUserActionDto } from './dto/admin-room-ban-user-action.dto';
import { AdminMatchesQueryDto } from './dto/admin-matches-query.dto';
import { AdminModerationQueryDto } from './dto/admin-moderation-query.dto';
import { AdminOverviewQueryDto } from './dto/admin-overview-query.dto';
import { AdminRoomsQueryDto } from './dto/admin-rooms-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { BanUserDto } from './dto/ban-user.dto';

type PagedResult<T> = {
  page: number;
  limit: number;
  total: number;
  data: T[];
};

type ModerationQueueItem = {
  reportId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  authorId: string;
  contentPreview: string;
  authorUsername: string;
  reportCount: number;
  status: 'pending' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoomEntity)
    private readonly roomRepo: Repository<RoomEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,
    @InjectRepository(ForumPostEntity)
    private readonly postRepo: Repository<ForumPostEntity>,
    @InjectRepository(ForumCommentEntity)
    private readonly commentRepo: Repository<ForumCommentEntity>,
  ) {}

  async getOverview(actor: User, query: AdminOverviewQueryDto) {
    this.assertAdmin(actor);
    const now = new Date();
    const since =
      query.from && !Number.isNaN(new Date(query.from).getTime())
        ? new Date(query.from)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [activeRooms, inGameMatches, newPosts24h, activeBans] =
      await Promise.all([
        this.roomRepo.count({
          where: {
            status: In(['waiting', 'setup', 'in_game']),
          },
        }),
        this.matchRepo.count({
          where: {
            status: 'in_progress',
          },
        }),
        this.postRepo
          .createQueryBuilder('post')
          .where('post.createdAt >= :since', { since })
          .getCount(),
        this.userRepo
          .createQueryBuilder('user')
          .where(
            new Brackets((qb) => {
              qb.where('user.bannedPermanent = true').orWhere(
                'user.bannedUntil IS NOT NULL AND user.bannedUntil >= :now',
                { now },
              );
            }),
          )
          .getCount(),
      ]);

    const pendingReports =
      (await this.postRepo
        .createQueryBuilder('post')
        .where('post.status = :status', { status: 'archived' })
        .orWhere('post.voteScore <= :threshold', { threshold: -2 })
        .getCount()) +
      (await this.commentRepo
        .createQueryBuilder('comment')
        .where('comment.voteScore <= :threshold', { threshold: -2 })
        .getCount());

    const activeUsersRaw = await this.roomRepo
      .createQueryBuilder('room')
      .select(['room.ownerId AS "ownerId"', 'room.guestId AS "guestId"'])
      .where('room.status IN (:...statuses)', {
        statuses: ['waiting', 'setup', 'in_game'],
      })
      .getRawMany<{ ownerId: string; guestId: string | null }>();

    const userSet = new Set<string>();
    for (const room of activeUsersRaw) {
      if (room.ownerId) {
        userSet.add(room.ownerId);
      }
      if (room.guestId) {
        userSet.add(room.guestId);
      }
    }

    const alerts = [
      {
        id: 'stuck-setup',
        level: activeRooms > 20 ? ('high' as const) : ('medium' as const),
        message: `${activeRooms} active rooms currently monitored`,
      },
      {
        id: 'reports',
        level: pendingReports > 10 ? ('high' as const) : ('low' as const),
        message: `${pendingReports} moderation items need review`,
      },
      {
        id: 'elo-settle',
        level: 'low' as const,
        message: `${inGameMatches} matches in progress`,
      },
    ];

    return {
      onlineUsers: userSet.size,
      activeRooms,
      inGameMatches,
      newPosts24h,
      pendingReports,
      activeBans,
      alerts,
    };
  }

  async listRooms(actor: User, query: AdminRoomsQueryDto) {
    this.assertAdmin(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.roomRepo
      .createQueryBuilder('room')
      .leftJoin(UserEntity, 'owner', 'owner.id = room.ownerId')
      .leftJoin(UserEntity, 'guest', 'guest.id = room.guestId');

    if (query.status) {
      qb.andWhere('room.status = :status', { status: query.status });
    }
    if (query.visibility) {
      qb.andWhere('room.visibility = :visibility', { visibility: query.visibility });
    }
    if (query.q) {
      qb.andWhere(
        '(room.code ILIKE :search OR owner.username ILIKE :search OR guest.username ILIKE :search)',
        {
          search: `%${query.q}%`,
        },
      );
    }

    qb.orderBy('room.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [rooms, total] = await qb.getManyAndCount();
    const userIds = [...new Set(rooms.flatMap((room) => [room.ownerId, room.guestId]).filter(Boolean))] as string[];
    const users = userIds.length
      ? await this.userRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'username'],
        })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user.username]));

    return {
      page,
      limit,
      total,
      data: rooms.map((room) => ({
        roomId: room.id,
        roomCode: room.code,
        status: room.status,
        visibility: room.visibility,
        currentMatchId: room.currentMatchId,
        ownerUsername: userMap.get(room.ownerId) ?? 'unknown',
        guestUsername: room.guestId ? (userMap.get(room.guestId) ?? 'unknown') : null,
        phase:
          room.status === 'setup'
            ? 'setup'
            : room.status === 'in_game'
              ? 'in_progress'
              : room.status === 'finished'
                ? 'finished'
                : '-',
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      })),
    };
  }

  async listMatches(actor: User, query: AdminMatchesQueryDto) {
    this.assertAdmin(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.matchRepo
      .createQueryBuilder('match')
      .leftJoin(RoomEntity, 'room', 'room.id = match.roomId');

    if (query.status) {
      qb.andWhere('match.status = :status', { status: query.status });
    }
    if (query.q) {
      qb.andWhere('(room.code ILIKE :search OR match.id::text ILIKE :search)', {
        search: `%${query.q}%`,
      });
    }

    qb.orderBy('match.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [matches, total] = await qb.getManyAndCount();

    const roomIds = [...new Set(matches.map((match) => match.roomId))];
    const userIds = [
      ...new Set(
        matches.flatMap((match) => [match.player1Id, match.player2Id, match.winnerId]).filter(Boolean),
      ),
    ] as string[];

    const [rooms, users] = await Promise.all([
      roomIds.length
        ? this.roomRepo.find({
            where: { id: In(roomIds) },
            select: ['id', 'code'],
          })
        : [],
      userIds.length
        ? this.userRepo.find({
            where: { id: In(userIds) },
            select: ['id', 'username'],
          })
        : [],
    ]);

    const roomCodeMap = new Map<string, string>(
      rooms.map((room) => [room.id, room.code] as const),
    );
    const userNameMap = new Map<string, string>(
      users.map((user) => [user.id, user.username] as const),
    );

    return {
      page,
      limit,
      total,
      data: matches.map((match) => ({
        matchId: match.id,
        roomId: match.roomId,
        roomCode: roomCodeMap.get(match.roomId) ?? 'unknown',
        status: match.status,
        player1Id: match.player1Id,
        player1Username: userNameMap.get(match.player1Id) ?? 'unknown',
        player2Id: match.player2Id,
        player2Username: userNameMap.get(match.player2Id) ?? 'unknown',
        winnerId: match.winnerId,
        winnerUsername: match.winnerId
          ? (userNameMap.get(match.winnerId) ?? 'unknown')
          : null,
        endedByAdmin: match.endedByAdmin,
        adminInterventionType: match.adminInterventionType,
        adminInterventionReason: match.adminInterventionReason,
        updatedAt: match.updatedAt.toISOString(),
      })),
    };
  }

  async forceCloseRoom(actor: User, roomId: string, reason: string): Promise<void> {
    this.assertAdmin(actor);
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }
    if (room.status === 'closed') {
      throw new ConflictException({
        error: 'ROOM_ALREADY_CLOSED',
        message: 'Room is already closed',
      });
    }
    if (!reason.trim()) {
      throw new BadRequestException({
        error: 'FORCE_CLOSE_REASON_REQUIRED',
        message: 'Reason is required',
      });
    }

    const currentMatchId = room.currentMatchId;
    await this.closeRoomByAdminIntervention(room, 'admin_force_close', reason);

    if (currentMatchId) {
      const match = await this.matchRepo.findOne({
        where: { id: currentMatchId },
      });
      if (match && match.status !== 'finished') {
        match.status = 'finished';
        match.winnerId = null;
        match.setupDeadlineAt = null;
        match.turnDeadlineAt = null;
        match.endedByAdmin = true;
        match.adminInterventionType = 'kick';
        match.adminInterventionReason = reason;
        match.adminActorId = actor.id;
        match.eloSettled = true;
        await this.matchRepo.save(match);
      }
    }
  }

  async forceFinishMatch(
    actor: User,
    matchId: string,
    dto: AdminForceFinishMatchDto,
  ): Promise<void> {
    this.assertAdmin(actor);
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Match not found',
      });
    }
    if (match.status === 'finished') {
      throw new ConflictException({
        error: 'MATCH_ALREADY_FINISHED',
        message: 'Match already finished',
      });
    }
    if (!dto.reason.trim()) {
      throw new BadRequestException({
        error: 'FORCE_FINISH_REASON_REQUIRED',
        message: 'Reason is required',
      });
    }
    if (dto.result === 'win') {
      if (!dto.winnerId) {
        throw new BadRequestException({
          error: 'INVALID_WINNER_ID',
          message: 'winnerId is required when result is win',
        });
      }
      if (dto.winnerId !== match.player1Id && dto.winnerId !== match.player2Id) {
        throw new BadRequestException({
          error: 'INVALID_WINNER_ID',
          message: 'winnerId must be one of match players',
        });
      }
      match.winnerId = dto.winnerId;
    } else {
      match.winnerId = null;
    }

    match.status = 'finished';
    match.setupDeadlineAt = null;
    match.turnDeadlineAt = null;
    match.endedByAdmin = true;
    match.adminInterventionType = dto.result === 'win' ? 'force_win' : 'kick';
    match.adminInterventionReason = dto.reason;
    match.adminActorId = actor.id;
    match.eloSettled = true;
    await this.matchRepo.save(match);

    const room = await this.roomRepo.findOne({
      where: { id: match.roomId },
    });
    if (room) {
      await this.closeRoomByAdminIntervention(
        room,
        dto.result === 'win' ? 'admin_force_result' : 'admin_intervention',
        dto.reason,
      );
    }
  }

  async forceWinInRoom(
    actor: User,
    roomId: string,
    winnerUserId: string,
    reason: string,
  ): Promise<void> {
    this.assertAdmin(actor);
    if (!reason.trim()) {
      throw new BadRequestException({
        error: 'FORCE_FINISH_REASON_REQUIRED',
        message: 'Reason is required',
      });
    }
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }
    if (!room.currentMatchId) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Room has no active match',
      });
    }
    await this.forceFinishMatch(actor, room.currentMatchId, {
      result: 'win',
      winnerId: winnerUserId,
      reason,
    });
  }

  async kickUserFromRoom(
    actor: User,
    roomId: string,
    targetUserId: string,
    reason: string,
  ): Promise<void> {
    this.assertAdmin(actor);
    if (!reason.trim()) {
      throw new BadRequestException({
        error: 'KICK_REASON_REQUIRED',
        message: 'Reason is required',
      });
    }
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }
    const isOwner = room.ownerId === targetUserId;
    const isGuest = room.guestId === targetUserId;
    if (!isOwner && !isGuest) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'Target user is not in this room',
      });
    }

    const counterpartUserId = isOwner ? room.guestId : room.ownerId;

    if (room.currentMatchId) {
      const match = await this.matchRepo.findOne({
        where: { id: room.currentMatchId },
      });
      if (match && match.status !== 'finished') {
        if (targetUserId === match.player1Id || targetUserId === match.player2Id) {
          match.status = 'finished';
          const winnerId =
            counterpartUserId &&
            (counterpartUserId === match.player1Id ||
              counterpartUserId === match.player2Id)
              ? counterpartUserId
              : targetUserId === match.player1Id
                ? match.player2Id
                : match.player1Id;
          match.winnerId = winnerId;
          match.setupDeadlineAt = null;
          match.turnDeadlineAt = null;
          match.endedByAdmin = true;
          match.adminInterventionType = 'kick';
          match.adminInterventionReason = reason;
          match.adminActorId = actor.id;
          match.eloSettled = true;
          await this.matchRepo.save(match);
        }
      }
    }

    await this.closeRoomByAdminIntervention(
      room,
      'admin_kick',
      reason,
      targetUserId,
    );
  }

  async banUserInRoom(
    actor: User,
    roomId: string,
    targetUserId: string,
    dto: AdminRoomBanUserActionDto,
  ): Promise<void> {
    this.assertSuperAdmin(actor);
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }
    if (targetUserId !== room.ownerId && targetUserId !== room.guestId) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'Target user is not in this room',
      });
    }

    const reason = dto.reason?.trim()
      ? dto.reason.trim()
      : dto.type === 'permanent'
        ? 'Admin permanent ban from spectator controls'
        : `Admin temporary ban (${dto.days ?? 7} days) from spectator controls`;

    await this.banUser(actor, targetUserId, dto);
    await this.kickUserFromRoom(actor, roomId, targetUserId, reason);

    const refreshedRoom = await this.roomRepo.findOne({ where: { id: roomId } });
    if (refreshedRoom) {
      await this.closeRoomByAdminIntervention(
        refreshedRoom,
        'admin_ban',
        reason,
        targetUserId,
      );
    }

    if (room.currentMatchId) {
      const match = await this.matchRepo.findOne({
        where: { id: room.currentMatchId },
      });
      if (match) {
        match.endedByAdmin = true;
        match.adminInterventionType = 'ban';
        match.adminInterventionReason = reason;
        match.adminActorId = actor.id;
        match.eloSettled = true;
        await this.matchRepo.save(match);
      }
    }
  }

  async listModerationQueue(
    actor: User,
    query: AdminModerationQueryDto,
  ): Promise<PagedResult<ModerationQueueItem>> {
    this.assertAdmin(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const postQb = this.postRepo.createQueryBuilder('post').where(
      '(post.status = :archived OR post.voteScore <= :negativeThreshold)',
      { archived: 'archived', negativeThreshold: -2 },
    );
    const commentQb = this.commentRepo
      .createQueryBuilder('comment')
      .where('comment.voteScore <= :negativeThreshold', {
        negativeThreshold: -2,
      });

    if (query.q) {
      postQb.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${query.q}%` },
      );
      commentQb.andWhere('comment.content ILIKE :search', {
        search: `%${query.q}%`,
      });
    }

    const [posts, comments] = await Promise.all([
      postQb.orderBy('post.updatedAt', 'DESC').take(200).getMany(),
      commentQb.orderBy('comment.updatedAt', 'DESC').take(200).getMany(),
    ]);

    const userIds = [
      ...new Set([
        ...posts.map((post) => post.authorId),
        ...comments.map((comment) => comment.authorId),
      ]),
    ];
    const users = userIds.length
      ? await this.userRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'username'],
        })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user.username]));

    const postItems: ModerationQueueItem[] = posts.map((post) => {
      const reportCount = this.estimateReportCount(
        post.status === 'archived' ? -4 : post.voteScore,
      );
      return {
        reportId: `post:${post.id}`,
        targetType: 'post',
        targetId: post.id,
        authorId: post.authorId,
        contentPreview: `${post.title} - ${post.content}`.slice(0, 140),
        authorUsername: userMap.get(post.authorId) ?? 'unknown',
        reportCount,
        status: post.status === 'archived' ? 'resolved' : 'pending',
        severity: this.toSeverity(reportCount),
        createdAt: post.createdAt.toISOString(),
      };
    });

    const commentItems: ModerationQueueItem[] = comments.map((comment) => {
      const reportCount = this.estimateReportCount(comment.voteScore);
      return {
        reportId: `comment:${comment.id}`,
        targetType: 'comment',
        targetId: comment.id,
        authorId: comment.authorId,
        contentPreview: comment.content.slice(0, 140),
        authorUsername: userMap.get(comment.authorId) ?? 'unknown',
        reportCount,
        status: 'pending',
        severity: this.toSeverity(reportCount),
        createdAt: comment.createdAt.toISOString(),
      };
    });

    let merged = [...postItems, ...commentItems];

    if (query.targetType) {
      merged = merged.filter((item) => item.targetType === query.targetType);
    }
    if (query.status) {
      merged = merged.filter((item) => item.status === query.status);
    }
    if (query.severity) {
      merged = merged.filter((item) => item.severity === query.severity);
    }

    merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return this.paginateArray(merged, page, limit);
  }

  async archiveForumPost(actor: User, postId: string, reason: string): Promise<void> {
    this.assertAdmin(actor);
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException({
        error: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    if (post.status === 'archived') {
      throw new ConflictException({
        error: 'FORUM_POST_ALREADY_ARCHIVED',
        message: 'Post already archived',
      });
    }
    if (!reason.trim()) {
      throw new BadRequestException({
        error: 'ARCHIVE_REASON_REQUIRED',
        message: 'Reason is required',
      });
    }
    post.status = 'archived';
    post.archivedByAdminId = actor.id;
    await this.postRepo.save(post);
  }

  async deleteForumComment(actor: User, commentId: string): Promise<void> {
    this.assertAdmin(actor);
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException({
        error: 'FORUM_COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    await this.commentRepo.delete({ id: comment.id });
    await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1);
  }

  async listUsers(actor: User, query: AdminUsersQueryDto) {
    this.assertAdmin(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const now = new Date();

    const qb = this.userRepo.createQueryBuilder('user');
    if (query.q) {
      qb.andWhere('(user.username ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.q}%`,
      });
    }
    if (query.role) {
      qb.andWhere('UPPER(user.role) = :role', { role: query.role });
    }
    if (query.banStatus === 'permanent') {
      qb.andWhere('user.bannedPermanent = true');
    } else if (query.banStatus === 'temporary') {
      qb
        .andWhere('user.bannedPermanent = false')
        .andWhere('user.bannedUntil IS NOT NULL')
        .andWhere('user.bannedUntil >= :now', { now });
    } else if (query.banStatus === 'not_banned') {
      qb.andWhere('user.bannedPermanent = false').andWhere(
        new Brackets((subQb) => {
          subQb
            .where('user.bannedUntil IS NULL')
            .orWhere('user.bannedUntil < :now', { now });
        }),
      );
    }

    qb.orderBy('user.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [users, total] = await qb.getManyAndCount();

    return {
      page,
      limit,
      total,
      data: users.map((item) => ({
        userId: item.id,
        username: item.username,
        email: item.email,
        role: item.role?.toUpperCase(),
        elo: item.elo,
        banStatus: this.resolveBanStatus(item, now),
        banReason: item.banReason,
        bannedAt:
          this.resolveBanStatus(item, now) === 'not_banned'
            ? null
            : item.bannedAt
              ? item.bannedAt.toISOString()
              : null,
      })),
    };
  }

  async banUser(actor: User, userId: string, dto: BanUserDto): Promise<void> {
    this.assertSuperAdmin(actor);

    const target = await this.userRepo.findOne({ where: { id: userId } });
    if (!target) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (target.id === actor.id) {
      throw new BadRequestException({
        error: 'ADMIN_CANNOT_BAN_SELF',
        message: 'Admin cannot ban themselves',
      });
    }

    const reason = dto.reason?.trim() || null;
    target.banReason = reason;
    target.bannedAt = new Date();
    target.banActorId = actor.id;
    target.lastBanAction =
      dto.type === 'permanent' ? 'BAN_USER_PERMANENT' : 'BAN_USER_TEMP';
    target.unbannedAt = null;
    target.unbanActorId = null;

    if (dto.type === 'temporary') {
      if (!dto.days) {
        throw new BadRequestException({
          error: 'BAN_DAYS_REQUIRED',
          message: 'days is required for temporary ban',
        });
      }
      const until = new Date();
      until.setDate(until.getDate() + dto.days);
      target.bannedPermanent = false;
      target.bannedUntil = until;
    } else {
      target.bannedPermanent = true;
      target.bannedUntil = null;
    }

    // Revoke refresh session to force re-authentication.
    target.refreshTokenHash = null;
    target.refreshTokenAbsoluteExpiry = null;

    await this.userRepo.save(target);
  }

  async unbanUser(actor: User, userId: string): Promise<void> {
    this.assertSuperAdmin(actor);
    const target = await this.userRepo.findOne({ where: { id: userId } });
    if (!target) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    const now = new Date();
    if (this.resolveBanStatus(target, now) === 'not_banned') {
      throw new ConflictException({
        error: 'USER_NOT_BANNED',
        message: 'User is not banned',
      });
    }

    target.bannedPermanent = false;
    target.bannedUntil = null;
    target.banReason = null;
    target.unbannedAt = now;
    target.unbanActorId = actor.id;
    await this.userRepo.save(target);
  }

  async grantModeratorRole(actor: User, userId: string): Promise<void> {
    this.assertSuperAdmin(actor);
    const target = await this.userRepo.findOne({ where: { id: userId } });
    if (!target) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    const currentRole = (target.role ?? 'USER').toUpperCase();
    if (currentRole === 'MOD') {
      throw new ConflictException({
        error: 'USER_ALREADY_MODERATOR',
        message: 'User is already moderator',
      });
    }
    if (currentRole === 'ADMIN') {
      throw new ConflictException({
        error: 'USER_ALREADY_ADMIN',
        message: 'User is already admin',
      });
    }
    target.role = 'MOD';
    await this.userRepo.save(target);
  }

  async revokeModeratorRole(actor: User, userId: string): Promise<void> {
    this.assertSuperAdmin(actor);
    const target = await this.userRepo.findOne({ where: { id: userId } });
    if (!target) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    const currentRole = (target.role ?? 'USER').toUpperCase();
    if (currentRole === 'ADMIN') {
      throw new ConflictException({
        error: 'CANNOT_REVOKE_ADMIN_ROLE',
        message: 'Cannot revoke admin role with this action',
      });
    }
    if (currentRole !== 'MOD') {
      throw new ConflictException({
        error: 'USER_IS_NOT_MODERATOR',
        message: 'User is not a moderator',
      });
    }
    target.role = 'USER';
    await this.userRepo.save(target);
  }

  async listAuditLogs(actor: User, query: AdminAuditQueryDto) {
    this.assertAdmin(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [bannedUsers, archivedPosts, finishedMatches, users] = await Promise.all([
      this.userRepo
        .createQueryBuilder('user')
        .where('user.bannedAt IS NOT NULL OR user.unbannedAt IS NOT NULL')
        .orderBy('COALESCE(user.unbannedAt, user.bannedAt, user.updatedAt)', 'DESC')
        .take(300)
        .getMany(),
      this.postRepo
        .createQueryBuilder('post')
        .where('post.status = :status', { status: 'archived' })
        .orderBy('post.updatedAt', 'DESC')
        .take(300)
        .getMany(),
      this.matchRepo
        .createQueryBuilder('match')
        .where('match.status = :status', { status: 'finished' })
        .orderBy('match.updatedAt', 'DESC')
        .take(300)
        .getMany(),
      this.userRepo.find({
        select: ['id', 'username'],
      }),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user.username]));
    const roomIds = [...new Set(finishedMatches.map((match) => match.roomId))];
    const rooms = roomIds.length
      ? await this.roomRepo.find({
          where: { id: In(roomIds) },
          select: ['id', 'code'],
        })
      : [];
    const roomCodeMap = new Map(rooms.map((room) => [room.id, room.code]));

    let data = [
      ...bannedUsers
        .filter((user) => !!user.bannedAt)
        .map((user) => ({
          id: `ban:${user.id}:${user.bannedAt?.toISOString() ?? user.updatedAt.toISOString()}`,
          actor: user.banActorId
            ? (userMap.get(user.banActorId) ?? 'system')
            : 'system',
          action: user.lastBanAction ?? 'BAN_USER_TEMP',
          target: `user:${user.username}`,
          createdAt: user.bannedAt?.toISOString() ?? user.updatedAt.toISOString(),
          metadata: user.banReason ?? undefined,
        })),
      ...bannedUsers
        .filter((user) => !!user.unbannedAt)
        .map((user) => ({
          id: `unban:${user.id}:${user.unbannedAt?.toISOString() ?? user.updatedAt.toISOString()}`,
          actor: user.unbanActorId
            ? (userMap.get(user.unbanActorId) ?? 'system')
            : 'system',
          action: 'UNBAN_USER',
          target: `user:${user.username}`,
          createdAt: user.unbannedAt?.toISOString() ?? user.updatedAt.toISOString(),
          metadata: undefined,
        })),
      ...archivedPosts.map((post) => ({
        id: `archive:${post.id}`,
        actor: post.archivedByAdminId
          ? (userMap.get(post.archivedByAdminId) ?? 'system')
          : 'system',
        action: 'ARCHIVE_FORUM_POST',
        target: `post:${post.id}:${userMap.get(post.authorId) ?? 'unknown'}`,
        createdAt: post.updatedAt.toISOString(),
        metadata: post.title,
      })),
      ...finishedMatches.map((match) => ({
        id: `match:${match.id}`,
        actor:
          match.endedByAdmin && match.adminActorId
            ? (userMap.get(match.adminActorId) ?? 'system')
            : 'system',
        action: match.endedByAdmin ? 'MATCH_SUSPENDED_BY_ADMIN' : 'MATCH_FINISHED',
        target: `match:${match.id}:room:${roomCodeMap.get(match.roomId) ?? match.roomId}`,
        createdAt: match.updatedAt.toISOString(),
        metadata: match.endedByAdmin
          ? `reason=${match.adminInterventionReason ?? '-'} type=${match.adminInterventionType ?? '-'}`
          : `winner=${match.winnerId ? (userMap.get(match.winnerId) ?? match.winnerId) : 'draw'}`,
      })),
    ];

    if (query.action) {
      data = data.filter((item) => item.action === query.action);
    }
    if (query.q) {
      const normalized = query.q.toLowerCase();
      data = data.filter(
        (item) =>
          item.actor.toLowerCase().includes(normalized) ||
          item.target.toLowerCase().includes(normalized),
      );
    }
    data.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return this.paginateArray(data, page, limit);
  }

  private assertAdmin(actor: User): void {
    const role = actor.role?.toUpperCase();
    if (role !== 'ADMIN' && role !== 'MOD') {
      throw new ForbiddenException({
        error: 'ADMIN_FORBIDDEN',
        message: 'Only admins can perform this action',
      });
    }
  }

  private assertSuperAdmin(actor: User): void {
    if (actor.role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException({
        error: 'ADMIN_FORBIDDEN',
        message: 'Only admins can perform this action',
      });
    }
  }

  private resolveBanStatus(
    user: UserEntity,
    now: Date,
  ): 'not_banned' | 'temporary' | 'permanent' {
    if (user.bannedPermanent) {
      return 'permanent';
    }
    if (user.bannedUntil && user.bannedUntil >= now) {
      return 'temporary';
    }
    return 'not_banned';
  }

  private estimateReportCount(voteScore: number): number {
    const value = Math.abs(Math.min(voteScore, 0));
    if (value === 0) {
      return 1;
    }
    return Math.max(1, Math.round(value * 1.5));
  }

  private toSeverity(reportCount: number): 'low' | 'medium' | 'high' {
    if (reportCount >= 8) {
      return 'high';
    }
    if (reportCount >= 4) {
      return 'medium';
    }
    return 'low';
  }

  private paginateArray<T>(
    source: T[],
    page: number,
    limit: number,
  ): PagedResult<T> {
    const start = (page - 1) * limit;
    return {
      page,
      limit,
      total: source.length,
      data: source.slice(start, start + limit),
    };
  }

  private async closeRoomByAdminIntervention(
    room: RoomEntity,
    reasonCode: string,
    reasonMessage: string,
    targetUserId?: string | null,
  ): Promise<void> {
    room.status = 'closed';
    room.currentMatchId = null;
    room.ownerReady = false;
    room.guestReady = false;
    room.expiresAt = new Date();
    room.closeReasonCode = reasonCode;
    room.closeReasonMessage = reasonMessage;
    room.closeReasonTargetUserId = targetUserId ?? null;
    await this.roomRepo.save(room);
  }
}
