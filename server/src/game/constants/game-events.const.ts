export const GameEvents = {
  RoomCreate: 'room:create',
  RoomConfigureSetup: 'room:configureSetup',
  RoomList: 'room:list',
  RoomJoin: 'room:join',
  RoomLeave: 'room:leave',
  RoomState: 'room:state',
  RoomStart: 'room:start',
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
