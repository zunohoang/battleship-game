export const GameEvents = {
  RoomCreate: 'room:create',
  RoomList: 'room:list',
  RoomJoin: 'room:join',
  RoomLeave: 'room:leave',
  RoomState: 'room:state',
  RoomReady: 'room:ready',
  MatchMove: 'match:move',
  MatchForfeit: 'match:forfeit',
  MatchReconnect: 'match:reconnect',
  MatchRematchVote: 'match:rematchVote',
  ServerRoomUpdated: 'server:roomUpdated',
  ServerMatchUpdated: 'server:matchUpdated',
  ServerError: 'server:error',
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];
