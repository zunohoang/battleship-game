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

interface RedisPipelineLike {
  rpush(key: string, value: string): RedisPipelineLike;
  ltrim(key: string, start: number, stop: number): RedisPipelineLike;
  expire(key: string, seconds: number): RedisPipelineLike;
  exec(): Promise<unknown>;
}

interface RedisClientLike {
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  incr(key: string): Promise<number>;
  pipeline(): RedisPipelineLike;
}

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

    return this.getMessagesByChannel(this.messagesKey(roomId));
  }

  async getRecentSpectatorMessages(
    roomId: string,
  ): Promise<ChatMessageSnapshot[]> {
    return this.getMessagesByChannel(this.spectatorMessagesKey(roomId));
  }

  async sendSpectatorMessage(
    userId: string,
    roomId: string,
    content: unknown,
  ): Promise<ChatMessageSnapshot> {
    const normalizedContent = this.normalizeMessageContent(content);
    return this.pushMessage(this.spectatorMessagesKey(roomId), {
      id: randomUUID(),
      roomId,
      senderId: userId,
      content: normalizedContent,
      sequence: 0,
      sentAt: new Date().toISOString(),
    });
  }

  async sendMessage(
    userId: string,
    roomId: string,
    content: unknown,
  ): Promise<ChatMessageSnapshot> {
    await this.assertRoomMember(roomId, userId);

    const normalizedContent = this.normalizeMessageContent(content);
    return this.pushMessage(this.messagesKey(roomId), {
      id: randomUUID(),
      roomId,
      senderId: userId,
      content: normalizedContent,
      sequence: 0,
      sentAt: new Date().toISOString(),
    });
  }

  private async getMessagesByChannel(
    messageKey: string,
  ): Promise<ChatMessageSnapshot[]> {
    const serializedMessages = await this.redisClient().lrange(
      messageKey,
      0,
      -1,
    );

    return serializedMessages
      .map((value) => this.parseMessage(value))
      .filter((message): message is ChatMessageSnapshot => message !== null);
  }

  private normalizeMessageContent(content: unknown): string {
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

    return normalizedContent;
  }

  private async pushMessage(
    messageKey: string,
    message: ChatMessageSnapshot,
  ): Promise<ChatMessageSnapshot> {
    const sequenceKey = this.sequenceKey(messageKey);

    const sequence = await this.redisClient().incr(sequenceKey);
    const resolvedMessage: ChatMessageSnapshot = {
      ...message,
      sequence,
    };

    const pipeline = this.redisClient().pipeline();
    pipeline.rpush(messageKey, JSON.stringify(resolvedMessage));
    pipeline.ltrim(messageKey, -this.historyLimit, -1);
    pipeline.expire(messageKey, this.historyTtlSeconds);
    pipeline.expire(sequenceKey, this.historyTtlSeconds);
    await pipeline.exec();

    return resolvedMessage;
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

  private spectatorMessagesKey(roomId: string): string {
    return `chat:spectator:${roomId}:messages`;
  }

  private sequenceKey(messageKey: string): string {
    return `${messageKey}:sequence`;
  }

  private parseMessage(value: string): ChatMessageSnapshot | null {
    try {
      return JSON.parse(value) as ChatMessageSnapshot;
    } catch {
      return null;
    }
  }

  private redisClient(): RedisClientLike {
    return this.redisService.getClient() as unknown as RedisClientLike;
  }
}
