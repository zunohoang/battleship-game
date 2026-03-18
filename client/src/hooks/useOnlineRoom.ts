import { useCallback, useEffect, useMemo, useState } from 'react';
import { gameSocketService } from '@/services/gameSocketService';
import type {
  ConfigureRoomSetupPayload,
  CreateRoomPayload,
  JoinRoomPayload,
  MatchMovePayload,
  MatchSnapshot,
  RoomActionPayload,
  RoomReadyPayload,
  RoomListSummary,
  RoomSnapshot,
} from '@/types/game';
import type { ChatMessage } from '@/types/chat';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

interface UseOnlineRoomState {
  socketConnected: boolean;
  room: RoomSnapshot | null;
  match: MatchSnapshot | null;
  rooms: RoomListSummary[];
  chatMessages: ChatMessage[];
  lastError: string | null;
}

function mergeChatMessages(
  currentMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
): ChatMessage[] {
  const messageMap = new Map(currentMessages.map((message) => [message.id, message]));

  for (const message of incomingMessages) {
    messageMap.set(message.id, message);
  }

  return [...messageMap.values()].sort((left, right) => left.sequence - right.sequence);
}

export function useOnlineRoom(initialRoomId?: string, enabled = true) {
  const [state, setState] = useState<UseOnlineRoomState>({
    socketConnected: false,
    room: null,
    match: null,
    rooms: [],
    chatMessages: [],
    lastError: null,
  });

  useEffect(() => {
    if (!enabled) {
      const resetConnectionTimeoutId = window.setTimeout(() => {
        setState((current) => ({
          ...current,
          socketConnected: false,
        }));
      }, 0);

      return () => {
        window.clearTimeout(resetConnectionTimeoutId);
      };
    }

    const socket = gameSocketService.connect(initialRoomId);
    const syncConnectionTimeoutId = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        socketConnected: socket.connected,
        lastError: null,
      }));

      if (socket.connected && initialRoomId) {
        gameSocketService.requestChatHistory({ roomId: initialRoomId });
      }
    }, 0);

    const onConnect = () => {
      if (initialRoomId) {
        gameSocketService.requestChatHistory({ roomId: initialRoomId });
      }

      setState((current) => ({
        ...current,
        socketConnected: true,
        lastError: null,
      }));
    };

    const onDisconnect = () => {
      setState((current) => ({
        ...current,
        socketConnected: false,
      }));
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
        lastError: payload.message || payload.error,
      }));
    });

    const offChatHistory = gameSocketService.onChatHistory((payload) => {
      setState((current) => ({
        ...current,
        chatMessages:
          payload.roomId === initialRoomId || !initialRoomId
            ? mergeChatMessages([], payload.messages)
            : current.chatMessages,
      }));
    });

    const offChatMessage = gameSocketService.onChatMessage((payload) => {
      setState((current) => ({
        ...current,
        chatMessages:
          payload.roomId === initialRoomId || !initialRoomId
            ? mergeChatMessages(current.chatMessages, [payload.message])
            : current.chatMessages,
      }));
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      window.clearTimeout(syncConnectionTimeoutId);
      offRoom();
      offMatch();
      offError();
      offChatHistory();
      offChatMessage();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      gameSocketService.disconnect();
    };
  }, [enabled, initialRoomId]);

  const connectionState: ConnectionState = useMemo(() => {
    if (!enabled) {
      return 'idle';
    }

    if (state.lastError) {
      return 'error';
    }

    if (state.socketConnected) {
      return 'connected';
    }

    return 'connecting';
  }, [enabled, state.lastError, state.socketConnected]);

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

  const configureRoomSetup = useCallback((payload: ConfigureRoomSetupPayload) => {
    gameSocketService.configureRoomSetup(payload, (response) => {
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
        match: null,
        chatMessages: [],
      }));
    });
  }, []);

  const requestChatHistory = useCallback((roomId?: string) => {
    gameSocketService.requestChatHistory(roomId ? { roomId } : undefined);
  }, []);

  const sendChatMessage = useCallback(
    (content: string, roomId?: string) => {
      gameSocketService.sendMessage(roomId ? { roomId, content } : { content });
    },
    [],
  );

  return useMemo(
    () => ({
      connectionState,
      room: state.room,
      match: state.match,
      rooms: state.rooms,
      chatMessages: state.chatMessages,
      lastError: state.lastError,
      listRooms,
      createRoom,
      configureRoomSetup,
      joinRoom,
      startRoom,
      markReady,
      reconnect,
      submitMove,
      leaveRoom,
      requestChatHistory,
      sendChatMessage,
    }),
    [
      connectionState,
      createRoom,
      configureRoomSetup,
      leaveRoom,
      joinRoom,
      listRooms,
      markReady,
      reconnect,
      requestChatHistory,
      sendChatMessage,
      startRoom,
      state.chatMessages,
      state.lastError,
      state.match,
      state.room,
      state.rooms,
      submitMove,
    ],
  );
}

