import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { MatchEntity } from './infrastructure/persistence/relational/entities/match.entity';
import { MoveEntity } from './infrastructure/persistence/relational/entities/move.entity';
import { RoomEntity } from './infrastructure/persistence/relational/entities/room.entity';
import type {
  BoardConfig,
  MatchSnapshot,
  Orientation,
  PlacedShip,
  RoomListSummary,
  RoomSnapshot,
  ShipDefinition,
  ShotRecord,
} from './types/game.types';
import {
  ConfigureRoomSetupDto,
  CreateRoomDto,
  MoveDto,
  RoomReadyDto,
} from './dto/game-events.dto';

const RANDOM_PLACEMENT_MAX_ATTEMPTS = 300;
const DEFAULT_TURN_TIMER_SECONDS = 30;
const DEFAULT_SETUP_TIMER_SECONDS = 60;
const ACTIVE_ROOM_STATUSES: Array<RoomEntity['status']> = [
  'waiting',
  'setup',
  'in_game',
];

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

function makeRoomCode(): string {
  const source = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += source[Math.floor(Math.random() * source.length)];
  }
  return code;
}

function shipCells(
  ship: PlacedShip,
  size: number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < size; i += 1) {
    out.push({
      x: ship.x + (ship.orientation === 'horizontal' ? i : 0),
      y: ship.y + (ship.orientation === 'vertical' ? i : 0),
    });
  }
  return out;
}

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepo: Repository<RoomEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,
    @InjectRepository(MoveEntity)
    private readonly moveRepo: Repository<MoveEntity>,
  ) {}

  async createRoom(
    userId: string,
    payload: CreateRoomDto,
  ): Promise<RoomSnapshot> {
    const activeRoom = await this.findUserActiveRoom(userId);
    if (activeRoom) {
      throw new BadRequestException({
        error: 'USER_ALREADY_IN_ACTIVE_ROOM',
        message: 'User is already in an active room',
        activeRoomId: activeRoom.id,
        activeRoomCode: activeRoom.code,
        activeRoomStatus: activeRoom.status,
      });
    }

    const code = await this.createUniqueRoomCode();
    const room = this.roomRepo.create({
      id: randomUUID(),
      code,
      status: 'waiting',
      visibility: payload.visibility ?? 'public',
      ownerId: userId,
      guestId: null,
      ownerReady: false,
      guestReady: false,
      currentMatchId: null,
      expiresAt: null,
    });
    const savedRoom = await this.roomRepo.save(room);
    return this.toRoomSnapshot(savedRoom);
  }

  async listOpenRooms(userId: string): Promise<RoomListSummary[]> {
    const [memberRooms, publicRooms] = await Promise.all([
      this.roomRepo.find({
        where: [
          {
            status: In(ACTIVE_ROOM_STATUSES),
            ownerId: userId,
          },
          {
            status: In(ACTIVE_ROOM_STATUSES),
            guestId: userId,
          },
        ],
        order: { updatedAt: 'DESC' },
        take: 25,
      }),
      this.roomRepo.find({
        where: [
          {
            status: 'waiting',
            visibility: 'public',
          },
          {
            status: 'in_game',
            visibility: 'public',
          },
        ],
        order: { updatedAt: 'DESC' },
        take: 50,
      }),
    ]);

    const seenRoomIds = new Set<string>();

    const listRooms = [...memberRooms, ...publicRooms]
      .filter((room) => {
        if (seenRoomIds.has(room.id)) {
          return false;
        }
        const isRoomMember = room.ownerId === userId || room.guestId === userId;
        const canShowFromRoomList =
          room.visibility === 'public' &&
          (room.status === 'waiting' || room.status === 'in_game');

        if (!isRoomMember && !canShowFromRoomList) {
          return false;
        }

        seenRoomIds.add(room.id);
        return true;
      })
      .sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      )
      .slice(0, 50);

    const matchIds = listRooms.flatMap((room) =>
      room.currentMatchId ? [room.currentMatchId] : [],
    );
    const matches =
      matchIds.length === 0
        ? []
        : await this.matchRepo.find({
            where: { id: In(matchIds) },
          });
    const matchesById = new Map(matches.map((match) => [match.id, match]));

    return listRooms.map((room) =>
      this.toRoomListSummary(
        room,
        userId,
        room.currentMatchId
          ? (matchesById.get(room.currentMatchId) ?? null)
          : null,
      ),
    );
  }

  async joinRoom(
    userId: string,
    options: { roomId?: string; roomCode?: string },
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot | null }> {
    let room: RoomEntity | null = null;

    if (options.roomId) {
      room = await this.roomRepo.findOne({
        where: { id: options.roomId },
      });
    } else if (options.roomCode) {
      room = await this.roomRepo.findOne({
        where: { code: options.roomCode.toUpperCase() },
      });
    } else {
      room = await this.roomRepo.findOne({
        where: {
          status: 'waiting',
          visibility: 'public',
        },
        order: { createdAt: 'ASC' },
      });
    }

    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    const activeRoom = await this.findUserActiveRoom(userId);
    if (activeRoom && activeRoom.id !== room.id) {
      throw new BadRequestException({
        error: 'USER_ALREADY_IN_ACTIVE_ROOM',
        message: 'User is already in an active room',
        activeRoomId: activeRoom.id,
        activeRoomCode: activeRoom.code,
        activeRoomStatus: activeRoom.status,
      });
    }

    const isRoomMember = room.ownerId === userId || room.guestId === userId;

    if (
      options.roomId &&
      !isRoomMember &&
      (room.visibility !== 'public' || room.status !== 'waiting')
    ) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    if (!isRoomMember && room.status !== 'waiting') {
      throw new BadRequestException({
        error: 'MATCH_INVALID_STATE',
        message: 'Room is not available to join',
      });
    }

    if (room.ownerId === userId || room.guestId === userId) {
      const existing = room.currentMatchId
        ? await this.matchRepo.findOne({ where: { id: room.currentMatchId } })
        : null;

      return {
        room: this.toRoomSnapshot(room),
        match: existing ? this.toMatchSnapshot(existing) : null,
      };
    }

    if (room.guestId && room.guestId !== userId) {
      throw new BadRequestException({
        error: 'ROOM_FULL',
        message: 'Room is full',
      });
    }

    const match = room.currentMatchId
      ? await this.matchRepo.findOne({ where: { id: room.currentMatchId } })
      : null;

    if (!match) {
      throw new BadRequestException({
        error: 'ROOM_SETUP_MISSING',
        message: 'Room setup is not initialized',
      });
    }

    room.guestId = userId;
    room.status = 'waiting';

    match.player2Id = userId;
    match.updatedAt = new Date();

    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async initializeMatch(
    roomId: string,
    ownerId: string,
    boardConfig: BoardConfig,
    ships: ShipDefinition[],
    turnTimerSeconds: number,
  ): Promise<MatchSnapshot> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    if (room.ownerId !== ownerId) {
      throw new BadRequestException({
        error: 'ROOM_OWNER_ONLY',
        message: 'Only room owner can initialize match',
      });
    }

    if (room.currentMatchId) {
      const existing = await this.matchRepo.findOne({
        where: { id: room.currentMatchId },
      });
      if (existing) {
        return this.toMatchSnapshot(existing);
      }
    }

    const match = this.matchRepo.create({
      id: randomUUID(),
      roomId,
      status: 'setup',
      boardConfig,
      ships,
      turnTimerSeconds,
      player1Id: ownerId,
      player2Id: room.guestId ?? ownerId,
      player1Placements: null,
      player2Placements: null,
      player1Shots: [],
      player2Shots: [],
      turnPlayerId: null,
      winnerId: null,
      setupDeadlineAt: null,
      turnDeadlineAt: null,
      version: 0,
      rematchVotes: {},
    });

    const savedMatch = await this.matchRepo.save(match);
    room.currentMatchId = match.id;
    await this.roomRepo.save(room);
    return this.toMatchSnapshot(savedMatch);
  }

  async configureRoomSetup(
    userId: string,
    payload: ConfigureRoomSetupDto,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    const room = await this.getRoomOrThrow(payload.roomId);

    if (room.ownerId !== userId) {
      throw new BadRequestException({
        error: 'ROOM_OWNER_ONLY',
        message: 'Only room owner can configure phase 1',
      });
    }

    if (room.status !== 'waiting') {
      throw new BadRequestException({
        error: 'MATCH_INVALID_STATE',
        message: 'Room is not available for phase 1 setup',
      });
    }

    if (room.guestId) {
      throw new BadRequestException({
        error: 'ROOM_SETUP_LOCKED',
        message: 'Phase 1 is locked after an opponent joins',
      });
    }

    if (room.currentMatchId) {
      throw new BadRequestException({
        error: 'ROOM_SETUP_LOCKED',
        message: 'Phase 1 has already been configured',
      });
    }

    const match = await this.initializeMatch(
      room.id,
      userId,
      payload.boardConfig,
      payload.ships,
      payload.turnTimerSeconds,
    );
    const savedRoom = await this.getRoomOrThrow(room.id);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match,
    };
  }

  async startRoom(
    roomId: string,
    userId: string,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    const room = await this.getRoomOrThrow(roomId);
    if (!room.currentMatchId) {
      throw new BadRequestException({
        error: 'ROOM_SETUP_MISSING',
        message: 'Room setup is not initialized',
      });
    }
    const match = await this.getCurrentMatchOrThrow(room);

    if (userId !== room.ownerId) {
      throw new BadRequestException({
        error: 'ROOM_OWNER_ONLY',
        message: 'Only room owner can start setup',
      });
    }

    if (!room.guestId) {
      throw new BadRequestException({
        error: 'ROOM_NEEDS_OPPONENT',
        message: 'Room has no opponent yet',
      });
    }

    if (match.status !== 'setup') {
      throw new BadRequestException({
        error: 'MATCH_INVALID_STATE',
        message: 'Match setup already finished',
      });
    }

    room.status = 'setup';
    room.ownerReady = false;
    room.guestReady = false;

    match.player2Id = room.guestId;
    match.setupDeadlineAt = new Date(
      Date.now() + DEFAULT_SETUP_TIMER_SECONDS * 1000,
    );
    match.turnDeadlineAt = null;
    match.version += 1;

    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async markReady(
    roomId: string,
    userId: string,
    payload: RoomReadyDto,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);

    if (room.status !== 'setup' || match.status !== 'setup') {
      throw new BadRequestException({
        error: 'ROOM_NOT_IN_SETUP',
        message: 'Room is not in setup phase',
      });
    }

    if (this.isSetupExpired(match)) {
      this.forceStartAfterSetupTimeout(room, match);
      const [savedRoom, savedMatch] = await Promise.all([
        this.roomRepo.save(room),
        this.matchRepo.save(match),
      ]);
      return {
        room: this.toRoomSnapshot(savedRoom),
        match: this.toMatchSnapshot(savedMatch),
      };
    }

    const placements = payload.placements as PlacedShip[];

    this.validatePlacements(match.boardConfig, match.ships, placements);

    if (match.player1Id === userId) {
      match.player1Placements = placements;
      room.ownerReady = true;
    } else if (match.player2Id === userId) {
      match.player2Placements = placements;
      room.guestReady = true;
    } else {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    if (room.ownerReady && room.guestReady) {
      match.status = 'in_progress';
      room.status = 'in_game';
      match.turnPlayerId = match.player1Id;
      match.setupDeadlineAt = null;
      match.turnDeadlineAt = this.makeTurnDeadline(match);
    }

    match.version += 1;
    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async submitMove(userId: string, payload: MoveDto): Promise<MatchSnapshot> {
    const match = await this.matchRepo.findOne({
      where: { id: payload.matchId },
    });
    if (!match) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Match not found',
      });
    }

    const room = await this.getRoomOrThrow(match.roomId);
    const resolvedTimedOutTurn = this.resolveExpiredTurns(room, match);
    if (resolvedTimedOutTurn) {
      await Promise.all([this.roomRepo.save(room), this.matchRepo.save(match)]);
    }

    if (match.status !== 'in_progress') {
      throw new BadRequestException({
        error: 'MATCH_NOT_ACTIVE',
        message: 'Match is not active',
      });
    }

    if (match.turnPlayerId !== userId) {
      throw new BadRequestException({
        error: 'NOT_YOUR_TURN',
        message: 'Not your turn',
      });
    }

    if (
      payload.x < 0 ||
      payload.y < 0 ||
      payload.x >= match.boardConfig.cols ||
      payload.y >= match.boardConfig.rows
    ) {
      throw new BadRequestException({
        error: 'INVALID_COORDINATE',
        message: 'Coordinate is outside board',
      });
    }

    const attackerShots =
      userId === match.player1Id ? match.player1Shots : match.player2Shots;
    if (
      attackerShots.some((shot) => shot.x === payload.x && shot.y === payload.y)
    ) {
      throw new BadRequestException({
        error: 'CELL_ALREADY_SHOT',
        message: 'Cell already targeted',
      });
    }

    const opponentPlacements =
      userId === match.player1Id
        ? match.player2Placements
        : match.player1Placements;
    const hitSet = this.placementHitSet(match.ships, opponentPlacements ?? []);
    const shotHit = hitSet.has(keyOf(payload.x, payload.y));
    const nextSequence = attackerShots.length + 1;
    const clientMoveId =
      payload.clientMoveId?.trim() ||
      `${userId}:${payload.x}:${payload.y}:${nextSequence}`;

    const shotRecord: ShotRecord = {
      x: payload.x,
      y: payload.y,
      isHit: shotHit,
      at: new Date().toISOString(),
      by: userId,
      sequence: nextSequence,
      clientMoveId,
    };

    if (userId === match.player1Id) {
      match.player1Shots = [...match.player1Shots, shotRecord];
    } else {
      match.player2Shots = [...match.player2Shots, shotRecord];
    }

    const destroyed = this.checkFleetDestroyed(
      match.ships,
      opponentPlacements ?? [],
      userId === match.player1Id ? match.player1Shots : match.player2Shots,
    );

    if (destroyed) {
      this.finishMatch(room, match, userId);
    } else {
      match.turnPlayerId =
        userId === match.player1Id ? match.player2Id : match.player1Id;
      match.turnDeadlineAt = this.makeTurnDeadline(match);
    }

    match.version += 1;

    await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
      this.moveRepo.save(
        this.moveRepo.create({
          id: randomUUID(),
          matchId: match.id,
          playerId: userId,
          x: payload.x,
          y: payload.y,
          isHit: shotHit,
          sequence: nextSequence,
          clientMoveId,
        }),
      ),
    ]);

    return this.toMatchSnapshot(match);
  }

  async forfeit(roomId: string, userId: string): Promise<MatchSnapshot> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);
    if (match.status === 'finished') {
      return this.toMatchSnapshot(match);
    }

    if (userId !== match.player1Id && userId !== match.player2Id) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    this.finishMatch(
      room,
      match,
      userId === match.player1Id ? match.player2Id : match.player1Id,
    );
    match.version += 1;

    const [savedMatch] = await Promise.all([
      this.matchRepo.save(match),
      this.roomRepo.save(room),
    ]);
    return this.toMatchSnapshot(savedMatch);
  }

  async rematchVote(
    roomId: string,
    userId: string,
    accept: boolean,
  ): Promise<{
    room: RoomSnapshot;
    match: MatchSnapshot;
  }> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);

    if (match.status !== 'finished') {
      throw new BadRequestException({
        error: 'MATCH_NOT_FINISHED',
        message: 'Rematch is only available after match finished',
      });
    }

    if (userId !== match.player1Id && userId !== match.player2Id) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    match.rematchVotes = {
      ...match.rematchVotes,
      [userId]: accept,
    };
    match.version += 1;

    const bothAccepted =
      match.rematchVotes[match.player1Id] === true &&
      match.rematchVotes[match.player2Id] === true;

    if (bothAccepted) {
      const turnTimerSeconds = this.readTurnTimerSeconds(match);
      const nextMatch = this.matchRepo.create({
        id: randomUUID(),
        roomId: room.id,
        status: 'setup',
        boardConfig: match.boardConfig,
        ships: match.ships,
        turnTimerSeconds,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        player1Placements: null,
        player2Placements: null,
        player1Shots: [],
        player2Shots: [],
        turnPlayerId: null,
        winnerId: null,
        setupDeadlineAt: null,
        turnDeadlineAt: null,
        version: 0,
        rematchVotes: {},
      });
      const savedNext = await this.matchRepo.save(nextMatch);
      room.currentMatchId = nextMatch.id;
      room.status = 'setup';
      room.ownerReady = false;
      room.guestReady = false;
      const savedRoom = await this.roomRepo.save(room);

      return {
        room: this.toRoomSnapshot(savedRoom),
        match: this.toMatchSnapshot(savedNext),
      };
    }

    const [savedRoom, savedMatch] = await Promise.all([
      this.roomRepo.save(room),
      this.matchRepo.save(match),
    ]);

    return {
      room: this.toRoomSnapshot(savedRoom),
      match: this.toMatchSnapshot(savedMatch),
    };
  }

  async leaveRoom(roomId: string, userId: string): Promise<RoomSnapshot> {
    const room = await this.getRoomOrThrow(roomId);

    if (room.ownerId === userId) {
      room.status = 'closed';
      room.expiresAt = new Date();
    } else if (room.guestId === userId) {
      room.guestId = null;
      room.guestReady = false;
      room.status = 'waiting';
    } else {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    const saved = await this.roomRepo.save(room);
    return this.toRoomSnapshot(saved);
  }

  async getRoomState(
    roomId: string,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot | null }> {
    const room = await this.getRoomOrThrow(roomId);
    const match = room.currentMatchId
      ? await this.matchRepo.findOne({ where: { id: room.currentMatchId } })
      : null;

    if (match && room.status === 'setup' && match.status === 'setup') {
      if (this.isSetupExpired(match)) {
        this.forceStartAfterSetupTimeout(room, match);
        const [savedRoom, savedMatch] = await Promise.all([
          this.roomRepo.save(room),
          this.matchRepo.save(match),
        ]);
        return {
          room: this.toRoomSnapshot(savedRoom),
          match: this.toMatchSnapshot(savedMatch),
        };
      }
    }

    if (match && room.status === 'in_game' && match.status === 'in_progress') {
      if (this.resolveExpiredTurns(room, match)) {
        const [savedRoom, savedMatch] = await Promise.all([
          this.roomRepo.save(room),
          this.matchRepo.save(match),
        ]);
        return {
          room: this.toRoomSnapshot(savedRoom),
          match: this.toMatchSnapshot(savedMatch),
        };
      }
    }

    return {
      room: this.toRoomSnapshot(room),
      match: match ? this.toMatchSnapshot(match) : null,
    };
  }

  async reconnect(
    userId: string,
    params: { roomId?: string; matchId?: string },
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot | null }> {
    let room: RoomEntity | null = null;
    let match: MatchEntity | null = null;

    if (params.roomId) {
      room = await this.roomRepo.findOne({ where: { id: params.roomId } });
    }

    if (!room && params.matchId) {
      match = await this.matchRepo.findOne({ where: { id: params.matchId } });
      if (match) {
        room = await this.roomRepo.findOne({ where: { id: match.roomId } });
      }
    }

    if (!room) {
      room = await this.roomRepo.findOne({
        where: [{ ownerId: userId }, { guestId: userId }],
        order: { updatedAt: 'DESC' },
      });
    }

    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'No room to reconnect',
      });
    }

    if (!match && room.currentMatchId) {
      match = await this.getCurrentMatchOrThrow(room);
    }

    if (
      match &&
      room.status === 'setup' &&
      match.status === 'setup' &&
      this.isSetupExpired(match)
    ) {
      this.forceStartAfterSetupTimeout(room, match);
      [room, match] = await Promise.all([
        this.roomRepo.save(room),
        this.matchRepo.save(match),
      ]);
    }

    if (
      match &&
      room.status === 'in_game' &&
      match.status === 'in_progress' &&
      this.resolveExpiredTurns(room, match)
    ) {
      [room, match] = await Promise.all([
        this.roomRepo.save(room),
        this.matchRepo.save(match),
      ]);
    }

    const isRoomMember = userId === room.ownerId || userId === room.guestId;
    const isMatchMember =
      !!match && (userId === match.player1Id || userId === match.player2Id);

    if (!isRoomMember && !isMatchMember) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    return {
      room: this.toRoomSnapshot(room),
      match: match ? this.toMatchSnapshot(match) : null,
    };
  }

  async spectateJoin(
    userId: string,
    roomId: string,
  ): Promise<{ room: RoomSnapshot; match: MatchSnapshot }> {
    const room = await this.getRoomOrThrow(roomId);
    const match = await this.getCurrentMatchOrThrow(room);

    this.assertSpectatorAccess(room, match, userId);

    return {
      room: this.toRoomSnapshot(room),
      match: this.toSpectatorMatchSnapshot(this.toMatchSnapshot(match)),
    };
  }

  toSpectatorMatchSnapshot(match: MatchSnapshot): MatchSnapshot {
    if (match.status === 'finished') {
      return match;
    }

    return {
      ...match,
      player1Placements: null,
      player2Placements: null,
    };
  }

  private finishMatch(
    room: RoomEntity,
    match: MatchEntity,
    winnerId: string | null,
  ): void {
    room.status = 'finished';
    room.ownerReady = false;
    room.guestReady = false;

    match.status = 'finished';
    match.winnerId = winnerId;
    match.turnPlayerId = null;
    match.setupDeadlineAt = null;
    match.turnDeadlineAt = null;
  }

  private async createUniqueRoomCode(): Promise<string> {
    for (let i = 0; i < 10; i += 1) {
      const code = makeRoomCode();
      const existing = await this.roomRepo.findOne({ where: { code } });
      if (!existing) {
        return code;
      }
    }
    throw new BadRequestException({
      error: 'ROOM_CODE_UNAVAILABLE',
      message: 'Could not allocate room code',
    });
  }

  private async findUserActiveRoom(userId: string): Promise<RoomEntity | null> {
    return this.roomRepo.findOne({
      where: [
        {
          ownerId: userId,
          status: In(ACTIVE_ROOM_STATUSES),
        },
        {
          guestId: userId,
          status: In(ACTIVE_ROOM_STATUSES),
        },
      ],
      order: { updatedAt: 'DESC' },
    });
  }

  private async getRoomOrThrow(roomId: string): Promise<RoomEntity> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }
    return room;
  }

  private async getCurrentMatchOrThrow(room: RoomEntity): Promise<MatchEntity> {
    if (!room.currentMatchId) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Room has no active match',
      });
    }

    const match = await this.matchRepo.findOne({
      where: { id: room.currentMatchId },
    });
    if (!match) {
      throw new NotFoundException({
        error: 'MATCH_NOT_FOUND',
        message: 'Match not found',
      });
    }
    return match;
  }

  private validatePlacements(
    board: BoardConfig,
    ships: ShipDefinition[],
    placements: PlacedShip[],
  ): void {
    const shipMap = new Map(ships.map((ship) => [ship.id, ship]));
    const usedCells = new Set<string>();
    const counters = new Map<string, number>();

    for (const placement of placements) {
      const ship = shipMap.get(placement.definitionId);
      if (!ship) {
        throw new BadRequestException({
          error: 'INVALID_SHIP_DEFINITION',
          message: 'Placement references unknown ship',
        });
      }

      counters.set(
        placement.definitionId,
        (counters.get(placement.definitionId) ?? 0) + 1,
      );

      for (const cell of shipCells(placement, ship.size)) {
        if (
          cell.x < 0 ||
          cell.y < 0 ||
          cell.x >= board.cols ||
          cell.y >= board.rows
        ) {
          throw new BadRequestException({
            error: 'PLACEMENT_OUT_OF_BOUNDS',
            message: 'Placement is outside board',
          });
        }

        const key = keyOf(cell.x, cell.y);
        if (usedCells.has(key)) {
          throw new BadRequestException({
            error: 'PLACEMENT_COLLISION',
            message: 'Placement overlap detected',
          });
        }
        usedCells.add(key);
      }
    }

    for (const ship of ships) {
      const expected = ship.count;
      const actual = counters.get(ship.id) ?? 0;
      if (actual !== expected) {
        throw new BadRequestException({
          error: 'PLACEMENT_COUNT_MISMATCH',
          message: 'Ship count mismatch',
        });
      }
    }
  }

  private placementHitSet(
    ships: ShipDefinition[],
    placements: PlacedShip[],
  ): Set<string> {
    const shipMap = new Map(ships.map((ship) => [ship.id, ship]));
    const hitSet = new Set<string>();
    for (const placement of placements) {
      const ship = shipMap.get(placement.definitionId);
      if (!ship) continue;
      for (const cell of shipCells(placement, ship.size)) {
        hitSet.add(keyOf(cell.x, cell.y));
      }
    }
    return hitSet;
  }

  private checkFleetDestroyed(
    ships: ShipDefinition[],
    placements: PlacedShip[],
    shots: ShotRecord[],
  ): boolean {
    const shotSet = new Set(
      shots.filter((shot) => shot.isHit).map((shot) => keyOf(shot.x, shot.y)),
    );
    const shipMap = new Map(ships.map((ship) => [ship.id, ship]));
    for (const placement of placements) {
      const ship = shipMap.get(placement.definitionId);
      if (!ship) continue;
      for (const cell of shipCells(placement, ship.size)) {
        if (!shotSet.has(keyOf(cell.x, cell.y))) {
          return false;
        }
      }
    }
    return placements.length > 0;
  }

  private toRoomSnapshot(room: RoomEntity): RoomSnapshot {
    return {
      roomId: room.id,
      roomCode: room.code,
      visibility: room.visibility,
      status: room.status,
      ownerId: room.ownerId,
      guestId: room.guestId,
      currentMatchId: room.currentMatchId,
      ownerReady: room.ownerReady,
      guestReady: room.guestReady,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }

  private toRoomListSummary(
    room: RoomEntity,
    userId: string,
    match: MatchEntity | null,
  ): RoomListSummary {
    const isRoomMember = room.ownerId === userId || room.guestId === userId;
    const phase1Config = match ? this.toRoomListPhase1Config(match) : null;

    return {
      roomId: room.id,
      roomCode: room.code,
      status: room.status,
      accessState: this.toRoomListAccessState(room),
      occupancy: room.guestId ? '2/2' : '1/2',
      actionKind: isRoomMember
        ? 'open'
        : room.status === 'in_game'
          ? 'watch'
          : 'join',
      phase1Config,
    };
  }

  private assertSpectatorAccess(
    room: RoomEntity,
    match: MatchEntity,
    userId: string,
  ): void {
    const isPlayer =
      room.ownerId === userId ||
      room.guestId === userId ||
      match.player1Id === userId ||
      match.player2Id === userId;

    if (isPlayer) {
      throw new BadRequestException({
        error: 'SPECTATOR_PLAYER_FORBIDDEN',
        message: 'Players cannot spectate their own match',
      });
    }

    if (room.visibility !== 'public') {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    if (room.status !== 'in_game' || match.status !== 'in_progress') {
      throw new BadRequestException({
        error: 'SPECTATOR_NOT_AVAILABLE',
        message: 'This room is not available for spectating',
      });
    }
  }

  private toRoomListAccessState(
    room: RoomEntity,
  ): RoomListSummary['accessState'] {
    if (room.status === 'in_game') {
      return 'playing';
    }

    return room.currentMatchId ? 'ready' : 'setting_up';
  }

  private toRoomListPhase1Config(
    match: MatchEntity,
  ): NonNullable<RoomListSummary['phase1Config']> {
    return {
      boardConfig: match.boardConfig,
      ships: match.ships,
      turnTimerSeconds: this.readTurnTimerSeconds(match),
    };
  }

  private toMatchSnapshot(match: MatchEntity): MatchSnapshot {
    const turnTimerSeconds = this.readTurnTimerSeconds(match);

    return {
      id: match.id,
      roomId: match.roomId,
      status: match.status,
      boardConfig: match.boardConfig,
      ships: match.ships,
      turnTimerSeconds,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1Placements: match.player1Placements,
      player2Placements: match.player2Placements,
      player1Shots: match.player1Shots,
      player2Shots: match.player2Shots,
      turnPlayerId: match.turnPlayerId,
      winnerId: match.winnerId,
      setupDeadlineAt: this.toIsoDateString(match.setupDeadlineAt),
      turnDeadlineAt: this.toIsoDateString(match.turnDeadlineAt),
      version: match.version,
      rematchVotes: match.rematchVotes,
      updatedAt: match.updatedAt.toISOString(),
    };
  }

  private toDateOrNull(value: unknown): Date | null {
    return value instanceof Date ? value : null;
  }

  private toIsoDateString(value: unknown): string | null {
    const dateValue = this.toDateOrNull(value);
    return dateValue ? dateValue.toISOString() : null;
  }

  private readTurnTimerSeconds(
    match: Pick<MatchEntity, 'turnTimerSeconds'>,
  ): number {
    return match.turnTimerSeconds ?? DEFAULT_TURN_TIMER_SECONDS;
  }

  private isSetupExpired(match: MatchEntity): boolean {
    const setupDeadlineAt = this.toDateOrNull(match.setupDeadlineAt);
    if (!setupDeadlineAt) {
      return false;
    }

    return Date.now() >= setupDeadlineAt.getTime();
  }

  private isTurnExpired(match: MatchEntity): boolean {
    const turnDeadlineAt = this.toDateOrNull(match.turnDeadlineAt);
    if (!match.turnPlayerId || !turnDeadlineAt) {
      return false;
    }

    return Date.now() >= turnDeadlineAt.getTime();
  }

  private makeTurnDeadline(match: Pick<MatchEntity, 'turnTimerSeconds'>): Date {
    return new Date(Date.now() + this.readTurnTimerSeconds(match) * 1000);
  }

  private resolveExpiredTurns(room: RoomEntity, match: MatchEntity): boolean {
    if (room.status !== 'in_game' || match.status !== 'in_progress') {
      return false;
    }

    let changed = false;
    while (match.status === 'in_progress' && this.isTurnExpired(match)) {
      this.resolveTimedOutTurn(room, match);
      changed = true;
    }

    return changed;
  }

  private resolveTimedOutTurn(room: RoomEntity, match: MatchEntity): void {
    const attackerId = match.turnPlayerId;
    if (!attackerId) {
      match.turnDeadlineAt = null;
      return;
    }

    const attackerShots =
      attackerId === match.player1Id ? match.player1Shots : match.player2Shots;
    const target = this.pickRandomAvailableTarget(
      match.boardConfig,
      attackerShots,
    );

    if (!target) {
      this.finishMatch(room, match, attackerId);
      match.version += 1;
      return;
    }

    const opponentPlacements =
      attackerId === match.player1Id
        ? match.player2Placements
        : match.player1Placements;
    const hitSet = this.placementHitSet(match.ships, opponentPlacements ?? []);
    const shotHit = hitSet.has(keyOf(target.x, target.y));
    const shotRecord: ShotRecord = {
      x: target.x,
      y: target.y,
      isHit: shotHit,
      at: new Date().toISOString(),
      by: attackerId,
      sequence: attackerShots.length + 1,
      clientMoveId: `timeout:${attackerId}:${target.x}:${target.y}:${attackerShots.length + 1}`,
      source: 'timeout_auto',
    };

    if (attackerId === match.player1Id) {
      match.player1Shots = [...match.player1Shots, shotRecord];
    } else {
      match.player2Shots = [...match.player2Shots, shotRecord];
    }

    const nextShots =
      attackerId === match.player1Id ? match.player1Shots : match.player2Shots;
    const destroyed = this.checkFleetDestroyed(
      match.ships,
      opponentPlacements ?? [],
      nextShots,
    );

    if (destroyed) {
      this.finishMatch(room, match, attackerId);
    } else {
      match.turnPlayerId =
        attackerId === match.player1Id ? match.player2Id : match.player1Id;
      match.turnDeadlineAt = this.makeTurnDeadline(match);
    }

    match.version += 1;
  }

  private pickRandomAvailableTarget(
    board: BoardConfig,
    shots: ShotRecord[],
  ): { x: number; y: number } | null {
    const used = new Set(shots.map((shot) => keyOf(shot.x, shot.y)));
    const available: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < board.rows; y += 1) {
      for (let x = 0; x < board.cols; x += 1) {
        if (!used.has(keyOf(x, y))) {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) {
      return null;
    }

    return available[Math.floor(Math.random() * available.length)];
  }

  private forceStartAfterSetupTimeout(
    room: RoomEntity,
    match: MatchEntity,
  ): void {
    if (!match.player1Placements) {
      match.player1Placements = this.generateRandomPlacements(
        match.boardConfig,
        match.ships,
      );
      room.ownerReady = true;
    }

    if (!match.player2Placements) {
      match.player2Placements = this.generateRandomPlacements(
        match.boardConfig,
        match.ships,
      );
      room.guestReady = true;
    }

    room.status = 'in_game';
    match.status = 'in_progress';
    match.turnPlayerId = match.player1Id;
    match.setupDeadlineAt = null;
    match.turnDeadlineAt = this.makeTurnDeadline(match);
    match.version += 1;
  }

  private generateRandomPlacements(
    board: BoardConfig,
    ships: ShipDefinition[],
  ): PlacedShip[] {
    const placements: PlacedShip[] = [];
    const occupied = new Set<string>();

    for (const ship of ships) {
      for (
        let instanceIndex = 0;
        instanceIndex < ship.count;
        instanceIndex += 1
      ) {
        let placed = false;

        for (
          let attempt = 0;
          attempt < RANDOM_PLACEMENT_MAX_ATTEMPTS;
          attempt += 1
        ) {
          const orientation: Orientation =
            Math.random() > 0.5 ? 'horizontal' : 'vertical';
          const maxX =
            orientation === 'horizontal'
              ? board.cols - ship.size
              : board.cols - 1;
          const maxY =
            orientation === 'vertical'
              ? board.rows - ship.size
              : board.rows - 1;
          const x = Math.floor(Math.random() * (maxX + 1));
          const y = Math.floor(Math.random() * (maxY + 1));

          const candidate: PlacedShip = {
            definitionId: ship.id,
            instanceIndex,
            x,
            y,
            orientation,
          };

          const cells = shipCells(candidate, ship.size);
          const blocked = cells.some((cell) =>
            occupied.has(keyOf(cell.x, cell.y)),
          );
          if (blocked) {
            continue;
          }

          placements.push(candidate);
          for (const cell of cells) {
            occupied.add(keyOf(cell.x, cell.y));
          }
          placed = true;
          break;
        }

        if (!placed) {
          throw new BadRequestException({
            error: 'AUTO_PLACEMENT_FAILED',
            message: 'Could not auto place ships in setup timeout',
          });
        }
      }
    }

    return placements;
  }
}
