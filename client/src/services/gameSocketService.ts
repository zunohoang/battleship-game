import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './authToken';
import type {
  ConfigureRoomSetupPayload,
  CreateRoomPayload,
  JoinRoomPayload,
  MatchMovePayload,
  MatchSnapshot,
  RoomListSummary,
  RoomActionPayload,
  RoomReadyPayload,
  RoomSnapshot,
} from '@/types/game';

type ServerRoomUpdatedPayload = {
  room: RoomSnapshot;
  match: MatchSnapshot | null;
};

type ServerMatchUpdatedPayload = {
  room?: RoomSnapshot;
  match: MatchSnapshot;
};

type SocketErrorPayload = {
  error: string;
  message: string;
};

interface SocketAck<T> {
  (response: T): void;
}

const GAME_NAMESPACE = '/game';

function getSocketBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!envUrl || envUrl.trim().length === 0) {
    return window.location.origin;
  }
  return envUrl;
}

class GameSocketService {
  private socket: Socket | null = null;

  connect(roomId?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = getAccessToken();
    this.socket = io(`${getSocketBaseUrl()}${GAME_NAMESPACE}`, {
      transports: ['websocket'],
      withCredentials: true,
      auth: {
        token,
        roomId,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 700,
      reconnectionDelayMax: 4000,
    });

    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onRoomUpdated(handler: (payload: ServerRoomUpdatedPayload) => void): () => void {
    if (!this.socket) return () => undefined;
    this.socket.on('server:roomUpdated', handler);
    return () => {
      this.socket?.off('server:roomUpdated', handler);
    };
  }

  onMatchUpdated(handler: (payload: ServerMatchUpdatedPayload) => void): () => void {
    if (!this.socket) return () => undefined;
    this.socket.on('server:matchUpdated', handler);
    return () => {
      this.socket?.off('server:matchUpdated', handler);
    };
  }

  onServerError(handler: (payload: SocketErrorPayload) => void): () => void {
    if (!this.socket) return () => undefined;
    this.socket.on('server:error', handler);
    return () => {
      this.socket?.off('server:error', handler);
    };
  }

  createRoom(
    payload: CreateRoomPayload,
    ack?: SocketAck<ServerRoomUpdatedPayload>,
  ): void {
    this.socket?.emit('room:create', payload, ack);
  }

  configureRoomSetup(
    payload: ConfigureRoomSetupPayload,
    ack?: SocketAck<ServerRoomUpdatedPayload>,
  ): void {
    this.socket?.emit('room:configureSetup', payload, ack);
  }

  listRooms(ack?: SocketAck<{ rooms: RoomListSummary[] }>): void {
    this.socket?.emit('room:list', ack);
  }

  joinRoom(payload: JoinRoomPayload, ack?: SocketAck<ServerRoomUpdatedPayload>): void {
    this.socket?.emit('room:join', payload, ack);
  }

  startRoom(payload: RoomActionPayload, ack?: SocketAck<ServerRoomUpdatedPayload>): void {
    this.socket?.emit('room:start', payload, ack);
  }

  markReady(payload: RoomReadyPayload, ack?: SocketAck<ServerMatchUpdatedPayload>): void {
    this.socket?.emit('room:ready', payload, ack);
  }

  move(payload: MatchMovePayload, ack?: SocketAck<{ match: MatchSnapshot }>): void {
    this.socket?.emit('match:move', payload, ack);
  }

  reconnect(
    payload: { roomId?: string; matchId?: string },
    ack?: SocketAck<ServerRoomUpdatedPayload>,
  ): void {
    this.socket?.emit('match:reconnect', payload, ack);
  }

  leaveRoom(ack?: SocketAck<{ room: RoomSnapshot }>): void {
    this.socket?.emit('room:leave', ack);
  }

  forfeit(ack?: SocketAck<{ match: MatchSnapshot }>): void {
    this.socket?.emit('match:forfeit', ack);
  }

  rematchVote(accept: boolean, ack?: SocketAck<ServerMatchUpdatedPayload>): void {
    this.socket?.emit('match:rematchVote', { accept }, ack);
  }
}

export const gameSocketService = new GameSocketService();

