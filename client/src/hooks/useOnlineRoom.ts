import { useCallback, useEffect, useMemo, useState } from 'react';
import { gameSocketService } from '@/services/gameSocketService';
import type {
  CreateRoomPayload,
  JoinRoomPayload,
  MatchMovePayload,
  MatchSnapshot,
  RoomActionPayload,
  RoomReadyPayload,
  RoomSnapshot,
} from '@/types/online';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

interface UseOnlineRoomState {
  connectionState: ConnectionState;
  room: RoomSnapshot | null;
  match: MatchSnapshot | null;
  rooms: RoomSnapshot[];
  lastError: string | null;
}

export function useOnlineRoom(initialRoomId?: string, enabled = true) {
  const [state, setState] = useState<UseOnlineRoomState>({
    connectionState: 'idle',
    room: null,
    match: null,
    rooms: [],
    lastError: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState((current) => ({
        ...current,
        connectionState: 'idle',
      }));
      return;
    }

    setState((current) => ({ ...current, connectionState: 'connecting' }));
    const socket = gameSocketService.connect(initialRoomId);

    const onConnect = () => {
      setState((current) => ({ ...current, connectionState: 'connected', lastError: null }));
    };

    const onDisconnect = () => {
      setState((current) => ({ ...current, connectionState: 'idle' }));
    };

    const offRoom = gameSocketService.onRoomUpdated((payload) => {
      setState((current) => ({
        ...current,
        room: payload.room,
        match: payload.match,
      }));
    });

    const offMatch = gameSocketService.onMatchUpdated((payload) => {
      setState((current) => ({
        ...current,
        room: payload.room ?? current.room,
        match: payload.match,
      }));
    });

    const offError = gameSocketService.onServerError((payload) => {
      setState((current) => ({
        ...current,
        connectionState: 'error',
        lastError: payload.message || payload.error,
      }));
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      offRoom();
      offMatch();
      offError();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      gameSocketService.disconnect();
    };
  }, [enabled, initialRoomId]);

  const listRooms = useCallback(() => {
    gameSocketService.listRooms((response) => {
      setState((current) => ({ ...current, rooms: response.rooms }));
    });
  }, []);

  const createRoom = useCallback((payload: CreateRoomPayload) => {
    gameSocketService.createRoom(payload, (response) => {
      setState((current) => ({
        ...current,
        room: response.room,
        match: response.match,
        lastError: null,
      }));
    });
  }, []);

  const joinRoom = useCallback((payload: JoinRoomPayload) => {
    gameSocketService.joinRoom(payload, (response) => {
      setState((current) => ({
        ...current,
        room: response.room,
        match: response.match,
        lastError: null,
      }));
    });
  }, []);

  const startRoom = useCallback((payload: RoomActionPayload) => {
    gameSocketService.startRoom(payload, (response) => {
      setState((current) => ({
        ...current,
        room: response.room,
        match: response.match,
        lastError: null,
      }));
    });
  }, []);

  const markReady = useCallback((payload: RoomReadyPayload) => {
    gameSocketService.markReady(payload, (response) => {
      setState((current) => ({
        ...current,
        room: response.room ?? current.room,
        match: response.match,
        lastError: null,
      }));
    });
  }, []);

  const reconnect = useCallback((payload: { roomId?: string; matchId?: string }) => {
    gameSocketService.reconnect(payload, (response) => {
      setState((current) => ({
        ...current,
        room: response.room,
        match: response.match,
        lastError: null,
      }));
    });
  }, []);

  const submitMove = useCallback((payload: MatchMovePayload) => {
    gameSocketService.move(payload, (response) => {
      setState((current) => ({
        ...current,
        match: response.match,
        lastError: null,
      }));
    });
  }, []);

  const leaveRoom = useCallback(() => {
    gameSocketService.leaveRoom((response) => {
      setState((current) => ({
        ...current,
        room: response.room,
      }));
    });
  }, []);

  return useMemo(
    () => ({
      ...state,
      listRooms,
      createRoom,
      joinRoom,
      startRoom,
      markReady,
      reconnect,
      submitMove,
      leaveRoom,
    }),
    [
      createRoom,
      joinRoom,
      leaveRoom,
      listRooms,
      markReady,
      reconnect,
      submitMove,
      startRoom,
      state,
    ],
  );
}
