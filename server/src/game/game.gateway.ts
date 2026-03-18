import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BadRequestException, HttpException, Inject } from '@nestjs/common';
import {
  TOKEN_REPOSITORY,
  type ITokenRepository,
} from '../auth/infrastructure/security/token.repository';
import { ChatService } from '../chat/chat.service';
import {
  ChatHistoryDto,
  SendChatMessageDto,
} from '../chat/dto/chat-events.dto';
import { GameService } from './game.service';
import {
  ConfigureRoomSetupDto,
  CreateRoomDto,
  JoinRoomDto,
  MoveDto,
  ReconnectDto,
  RematchVoteDto,
  RoomActionDto,
  RoomReadyDto,
} from './dto/game-events.dto';
import { GameEvents } from './constants/game-events.const';
import type { MatchSnapshot, RoomSnapshot } from './types/game.types';

type RoomUpdatePayload = {
  room: RoomSnapshot;
  match: MatchSnapshot | null;
};

@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  constructor(
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenRepository: ITokenRepository,
    private readonly chatService: ChatService,
    private readonly gameService: GameService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.tokenRepository.validate(token);
      if (!payload) {
        throw new BadRequestException('Invalid access token');
      }
      (client.data as { userId?: string }).userId = payload.sub;
    } catch {
      client.emit(GameEvents.ServerError, {
        error: 'UNAUTHORIZED',
        message: 'Socket authentication failed',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage(GameEvents.RoomCreate)
  async handleCreateRoom(
    @MessageBody() payload: CreateRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserId(client);
    const room = await this.gameService.createRoom(userId, payload);
    return this.emitRoomUpdate(client, {
      room,
      match: null,
    });
  }

  @SubscribeMessage(GameEvents.RoomConfigureSetup)
  async handleConfigureRoomSetup(
    @MessageBody() payload: ConfigureRoomSetupDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserId(client);
      return this.emitRoomUpdate(
        client,
        await this.gameService.configureRoomSetup(userId, payload),
      );
    } catch (error) {
      this.emitClientError(client, error);
      throw error;
    }
  }

  @SubscribeMessage(GameEvents.RoomList)
  async handleListRooms(@ConnectedSocket() client: Socket) {
    const userId = this.getUserId(client);
    const rooms = await this.gameService.listOpenRooms(userId);
    return { rooms };
  }

  @SubscribeMessage(GameEvents.RoomJoin)
  async handleJoinRoom(
    @MessageBody() payload: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserId(client);
      return this.emitRoomUpdate(
        client,
        await this.gameService.joinRoom(userId, {
          roomId: payload.roomId,
          roomCode: payload.roomCode,
        }),
      );
    } catch (error) {
      this.emitClientError(client, error);
      throw error;
    }
  }

  @SubscribeMessage(GameEvents.RoomStart)
  async handleStartRoom(
    @MessageBody() payload: RoomActionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserId(client);
    const result = await this.gameService.startRoom(payload.roomId, userId);
    this.server
      .to(`room:${payload.roomId}`)
      .emit(GameEvents.ServerRoomUpdated, result);
    return result;
  }

  @SubscribeMessage(GameEvents.RoomReady)
  async handleReady(
    @MessageBody() payload: RoomReadyDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserId(client);
    const result = await this.gameService.markReady(
      payload.roomId,
      userId,
      payload,
    );
    this.server
      .to(`room:${payload.roomId}`)
      .emit(GameEvents.ServerMatchUpdated, result);
    return result;
  }

  @SubscribeMessage(GameEvents.MatchMove)
  async handleMove(
    @MessageBody() payload: MoveDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserId(client);
    const match = await this.gameService.submitMove(userId, payload);
    this.server
      .to(`room:${match.roomId}`)
      .emit(GameEvents.ServerMatchUpdated, { match });
    return { match };
  }

  @SubscribeMessage(GameEvents.RoomState)
  async handleRoomState(@ConnectedSocket() client: Socket) {
    const roomId = this.readRoomIdFromSocket(client);
    const state = await this.gameService.getRoomState(roomId);
    return state;
  }

  @SubscribeMessage(GameEvents.RoomLeave)
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const roomId = this.readRoomIdFromSocket(client);
    const userId = this.getUserId(client);
    const room = await this.gameService.leaveRoom(roomId, userId);
    await client.leave(`room:${roomId}`);
    this.server
      .to(`room:${roomId}`)
      .emit(GameEvents.ServerRoomUpdated, { room, match: null });
    return { room };
  }

  @SubscribeMessage(GameEvents.MatchReconnect)
  async handleReconnect(
    @MessageBody() payload: ReconnectDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserId(client);
    const state = await this.gameService.reconnect(userId, {
      roomId: payload.roomId,
      matchId: payload.matchId,
    });
    await client.join(`room:${state.room.roomId}`);
    return state;
  }

  @SubscribeMessage(GameEvents.MatchForfeit)
  async handleForfeit(@ConnectedSocket() client: Socket) {
    const userId = this.getUserId(client);
    const roomId = this.readRoomIdFromSocket(client);
    const match = await this.gameService.forfeit(roomId, userId);
    this.server
      .to(`room:${roomId}`)
      .emit(GameEvents.ServerMatchUpdated, { match });
    return { match };
  }

  @SubscribeMessage(GameEvents.MatchRematchVote)
  async handleRematchVote(
    @MessageBody() payload: RematchVoteDto,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = this.readRoomIdFromSocket(client);
    const userId = this.getUserId(client);
    const result = await this.gameService.rematchVote(
      roomId,
      userId,
      payload.accept,
    );
    this.server
      .to(`room:${roomId}`)
      .emit(GameEvents.ServerMatchUpdated, result);
    return result;
  }

  @SubscribeMessage(GameEvents.ChatHistory)
  async handleChatHistory(
    @MessageBody() payload: ChatHistoryDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserId(client);
      const roomId = payload.roomId ?? this.readRoomIdFromSocket(client);
      const messages = await this.chatService.getRecentMessages(userId, roomId);
      const response = { roomId, messages };
      client.emit(GameEvents.ServerChatHistory, response);
      return response;
    } catch (error) {
      this.emitClientError(client, error);
      throw error;
    }
  }

  @SubscribeMessage(GameEvents.ChatSendMessage)
  async handleChatSendMessage(
    @MessageBody() payload: SendChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserId(client);
      const roomId = payload.roomId ?? this.readRoomIdFromSocket(client);
      const message = await this.chatService.sendMessage(
        userId,
        roomId,
        payload?.content,
      );
      this.server.to(`room:${roomId}`).emit(GameEvents.ServerChatMessage, {
        roomId,
        message,
      });
      return { roomId, message };
    } catch (error) {
      this.emitClientError(client, error);
      throw error;
    }
  }

  private extractToken(client: Socket): string {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken;
    }

    const headerAuth = client.handshake.headers.authorization;
    if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
      return headerAuth.slice(7);
    }

    throw new WsException('Missing access token');
  }

  private getUserId(client: Socket): string {
    const data = client.data as { userId?: unknown };
    const userId = data.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      throw new WsException('Unauthorized socket');
    }
    return userId;
  }

  private readRoomIdFromSocket(client: Socket): string {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const roomIdFromHandshake = auth?.roomId;
    if (
      typeof roomIdFromHandshake === 'string' &&
      roomIdFromHandshake.trim().length > 0
    ) {
      return roomIdFromHandshake;
    }

    throw new WsException('Missing roomId in socket auth payload');
  }

  private emitClientError(client: Socket, error: unknown): void {
    if (!(error instanceof HttpException)) {
      return;
    }

    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : typeof response === 'object' &&
            response !== null &&
            'message' in response
          ? Array.isArray(response.message)
            ? response.message.join(', ')
            : String(response.message)
          : error.message;
    const errorCode =
      typeof response === 'object' &&
      response !== null &&
      'error' in response &&
      typeof response.error === 'string'
        ? response.error
        : error.name;

    client.emit(GameEvents.ServerError, {
      error: errorCode,
      message:
        errorCode === 'ROOM_SETUP_MISSING'
          ? 'Host has not finished phase 1 setup yet.'
          : message,
    });
  }

  private async emitRoomUpdate(
    client: Socket,
    payload: RoomUpdatePayload,
  ): Promise<RoomUpdatePayload> {
    await client.join(`room:${payload.room.roomId}`);
    this.server
      .to(`room:${payload.room.roomId}`)
      .emit(GameEvents.ServerRoomUpdated, payload);
    return payload;
  }
}
