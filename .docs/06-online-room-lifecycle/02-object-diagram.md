# Object Diagram - Online Room Lifecycle

## Pham vi
Anh xa doi tuong phong online khi da co du 2 nguoi truoc luc vao in_game.

## Mermaid
```mermaid
classDiagram
  class room {
    id = "room-1"
    code = "ABC123"
    status = "setup"
    visibility = "public"
    ownerReady = true
    guestReady = false
  }
  class owner {
    id = "u-owner"
    username = "captainA"
  }
  class guest {
    id = "u-guest"
    username = "captainB"
  }
  class match {
    id = "m-1"
    status = "setup"
    setupDeadlineAt = "2026-03-15T12:00:00Z"
  }

  owner --> room
  guest --> room
  room --> match
```

## Nguon ma lien quan
- server/src/game/types/game.types.ts
- client/src/types/online.ts
