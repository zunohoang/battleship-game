import { useCallback, useEffect, useMemo, useState } from 'react';
import { gameSocketService } from '@/services/gameSocketService';
import type { ChatMessage } from '@/types/chat';
import type { MatchSnapshot, RoomSnapshot } from '@/types/game';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

interface SpectatorState {
  socketConnected: boolean;
  room: RoomSnapshot | null;
  match: MatchSnapshot | null;
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

export function useSpectatorRoom(roomId: string, enabled = true) {
  const [state, setState] = useState<SpectatorState>({
    socketConnected: false,
    room: null,
    match: null,
    chatMessages: [],
    lastError: null,
  });

  const refreshSpectatorState = useCallback(() => {
    gameSocketService.spectateJoin({ roomId }, (response) => {
      setState((current) => ({
        ...current,
        room: response.room,
        match: response.match,
        lastError: null,
      }));
    });
  }, [roomId]);

  const joinSpectator = useCallback(() => {
    refreshSpectatorState();
    gameSocketService.requestSpectatorChatHistory({ roomId });
  }, [refreshSpectatorState, roomId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = gameSocketService.connect();

    const onConnect = () => {
      joinSpectator();
      setState((current) => ({
        ...current,
        socketConnected: true,
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

    const offSpectatorHistory = gameSocketService.onSpectatorChatHistory((payload) => {
      setState((current) => ({
        ...current,
        chatMessages:
          payload.roomId === roomId
            ? mergeChatMessages([], payload.messages)
            : current.chatMessages,
      }));
    });

    const offSpectatorMessage = gameSocketService.onSpectatorChatMessage((payload) => {
      setState((current) => ({
        ...current,
        chatMessages:
          payload.roomId === roomId
            ? mergeChatMessages(current.chatMessages, [payload.message])
            : current.chatMessages,
      }));
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      gameSocketService.spectateLeave({ roomId });
      offRoom();
      offMatch();
      offError();
      offSpectatorHistory();
      offSpectatorMessage();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      gameSocketService.disconnect();
    };
  }, [enabled, joinSpectator, roomId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    refreshSpectatorState();
    const intervalId = window.setInterval(refreshSpectatorState, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, refreshSpectatorState]);

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

  const sendSpectatorMessage = useCallback(
    (content: string) => {
      gameSocketService.sendSpectatorMessage({ roomId, content });
    },
    [roomId],
  );

  return {
    connectionState,
    room: state.room,
    match: state.match,
    chatMessages: state.chatMessages,
    lastError: state.lastError,
    refresh: refreshSpectatorState,
    sendSpectatorMessage,
  };
}
