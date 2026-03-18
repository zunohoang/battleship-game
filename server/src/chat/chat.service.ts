import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { RedisService } from '../common/infrastructure/cache/redis.service';
import { MatchEntity } from '../game/infrastructure/persistence/relational/entities/match.entity';
import { RoomEntity } from '../game/infrastructure/persistence/relational/entities/room.entity';
import type { ChatMessageSnapshot } from './types/chat.types';

@Injectable()
export class ChatService {
  private readonly historyLimit: number;

  private readonly historyTtlSeconds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @InjectRepository(RoomEntity)
    private readonly roomRepo: Repository<RoomEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,
  ) {
    this.historyLimit = Number(
      this.configService.get<string>('CHAT_HISTORY_LIMIT') ?? '80',
    );
    this.historyTtlSeconds = Number(
      this.configService.get<string>('CHAT_HISTORY_TTL_SECONDS') ??
        `${60 * 60 * 12}`,
    );
  }

  async getRecentMessages(
    userId: string,
    roomId: string,
  ): Promise<ChatMessageSnapshot[]> {
    await this.assertRoomMember(roomId, userId);

    const serializedMessages = await this.redisService
      .getClient()
      .lrange(this.messagesKey(roomId), 0, -1);

    return serializedMessages
      .map((value) => this.parseMessage(value))
      .filter((message): message is ChatMessageSnapshot => message !== null);
  }

  async sendMessage(
    userId: string,
    roomId: string,
    content: unknown,
  ): Promise<ChatMessageSnapshot> {
    await this.assertRoomMember(roomId, userId);

    if (typeof content !== 'string') {
      throw new BadRequestException({
        error: 'CHAT_MESSAGE_REQUIRED',
        message: 'Message content is required',
      });
    }

    const normalizedContent = content.trim();
    if (normalizedContent.length === 0) {
      throw new BadRequestException({
        error: 'CHAT_MESSAGE_REQUIRED',
        message: 'Message content is required',
      });
    }

    if (normalizedContent.length > 280) {
      throw new BadRequestException({
        error: 'CHAT_MESSAGE_TOO_LONG',
        message: 'Message content exceeds the 280 character limit',
      });
    }

    const sequence = await this.redisService
      .getClient()
      .incr(this.sequenceKey(roomId));
    const message: ChatMessageSnapshot = {
      id: randomUUID(),
      roomId,
      senderId: userId,
      content: normalizedContent,
      sequence,
      sentAt: new Date().toISOString(),
    };

    const pipeline = this.redisService.getClient().pipeline();
    pipeline.rpush(this.messagesKey(roomId), JSON.stringify(message));
    pipeline.ltrim(this.messagesKey(roomId), -this.historyLimit, -1);
    pipeline.expire(this.messagesKey(roomId), this.historyTtlSeconds);
    pipeline.expire(this.sequenceKey(roomId), this.historyTtlSeconds);
    await pipeline.exec();

    return message;
  }

  private async assertRoomMember(
    roomId: string,
    userId: string,
  ): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    if (room.ownerId === userId || room.guestId === userId) {
      return;
    }

    if (!room.currentMatchId) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }

    const match = await this.matchRepo.findOne({
      where: { id: room.currentMatchId },
    });
    const isMatchMember =
      !!match && (match.player1Id === userId || match.player2Id === userId);

    if (!isMatchMember) {
      throw new BadRequestException({
        error: 'ROOM_MEMBER_ONLY',
        message: 'User is not in this room',
      });
    }
  }

  private messagesKey(roomId: string): string {
    return `chat:room:${roomId}:messages`;
  }

  private sequenceKey(roomId: string): string {
    return `chat:room:${roomId}:sequence`;
  }

  private parseMessage(value: string): ChatMessageSnapshot | null {
    try {
      return JSON.parse(value) as ChatMessageSnapshot;
    } catch {
      return null;
    }
  }
}
