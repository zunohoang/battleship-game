# Online Match - Socket Topic va Luong

## Pham vi
Tai lieu mo ta luong choi online theo Socket.IO namespace game.
No tap trung vao:
- Luong 2 nguoi choi (host, guest)
- Cac server event broadcast theo room channel
- Luong spectator va chat

## So do luong online (sequence)
```mermaid
sequenceDiagram
  autonumber
  participant A as Player A Client
  participant B as Player B Client
  participant G as GameGateway (/game)
  participant S as GameService
  participant R as Room Channel
  participant SR as Spectator Channel

  Note over A,G: connect(auth: token, roomId?) path=/api/socket.io
  A->>G: room:create
  G->>S: createRoom(userId,payload)
  S-->>G: room snapshot
  G->>R: join room:{roomId}
  G-->>R: server:roomUpdated

  B->>G: room:join (roomId/roomCode)
  G->>S: joinRoom(userId,...)
  S-->>G: room+match
  G->>R: join room:{roomId}
  G-->>R: server:roomUpdated

  A->>G: room:start
  G->>S: startRoom(roomId,userId)
  S-->>G: room+match
  G-->>R: server:roomUpdated

  A->>G: room:ready
  B->>G: room:ready
  G->>S: markReady(...)
  S-->>G: room+match
  G-->>R: server:matchUpdated

  loop Moi turn
    A->>G: match:move
    G->>S: submitMove(userId,payload)
    S-->>G: match
    G-->>R: server:matchUpdated (full match)
    G-->>SR: server:matchUpdated (spectator snapshot)
    Note over A,B: Luot tiep theo doi vai A/B theo turn
  end

  par In-room chat
    A->>G: chat:history / chat:sendMessage
    G-->>R: server:chatHistory / server:chatMessage
  and Spectator chat
    B->>G: match:spectateJoin
    G->>SR: join room:{roomId}:spectators
    G-->>B: server:spectatorChatHistory
    B->>G: spectator:sendMessage
    G-->>SR: server:spectatorChatMessage
  end

  alt reconnect
    A->>G: match:reconnect
    G->>S: reconnect(userId,roomId,matchId)
    G->>R: join room:{roomId}
    G-->>A: current room+match state
  else forfeit
    A->>G: match:forfeit
    G->>S: forfeit(roomId,userId)
    G-->>R: server:matchUpdated
    G-->>SR: server:matchUpdated (spectator snapshot)
  end

  A->>G: match:rematchVote
  B->>G: match:rematchVote
  G->>S: rematchVote(roomId,userId,accept)
  S-->>G: room+match (new or closed)
  G-->>R: server:matchUpdated
  G-->>SR: server:matchUpdated (spectator snapshot)
```

## So do socket topics
```mermaid
flowchart TB
  subgraph C2S[Client -> Server topics]
    C1[room:create]
    C2[room:configureSetup]
    C3[room:list]
    C4[room:join]
    C5[room:start]
    C6[room:ready]
    C7[match:move]
    C8[match:reconnect]
    C9[match:forfeit]
    C10[match:rematchVote]
    C11[room:leave]
    C12[room:state]
    C13[chat:history]
    C14[chat:sendMessage]
    C15[match:spectateJoin]
    C16[match:spectateLeave]
    C17[spectator:chatHistory]
    C18[spectator:sendMessage]
  end

  subgraph Rooms[Broadcast channels]
    R1[room:{roomId}]
    R2[room:{roomId}:spectators]
  end

  subgraph S2C[Server -> Client topics]
    S1[server:roomUpdated]
    S2[server:matchUpdated]
    S3[server:chatHistory]
    S4[server:chatMessage]
    S5[server:spectatorChatHistory]
    S6[server:spectatorChatMessage]
    S7[server:error]
  end

  C1 --> R1
  C2 --> R1
  C4 --> R1
  C5 --> R1
  C6 --> R1
  C7 --> R1
  C7 --> R2
  C8 --> R1
  C9 --> R1
  C9 --> R2
  C10 --> R1
  C10 --> R2
  C11 --> R1
  C13 --> S3
  C14 --> S4
  C15 --> R2
  C17 --> S5
  C18 --> S6

  R1 --> S1
  R1 --> S2
  R1 --> S4
  R2 --> S2
  R2 --> S6
```

## Nguon ma lien quan
- client/src/services/gameSocketService.ts
- server/src/game/constants/game-events.const.ts
- server/src/game/game.gateway.ts
