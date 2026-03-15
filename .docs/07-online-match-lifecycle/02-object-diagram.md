# Object Diagram - Online Match Lifecycle

## Pham vi
Anh xa doi tuong tai thoi diem giua tran dau online.

## Mermaid
```mermaid
classDiagram
  class match {
    id = "m-101"
    status = "in_progress"
    turnPlayerId = "u-guest"
    winnerId = null
    version = 24
  }
  class p1Shots {
    count = 12
    last = "(5,3) miss"
  }
  class p2Shots {
    count = 11
    last = "(7,2) hit"
  }
  class rematchVotes {
    owner = null
    guest = null
  }

  match --> p1Shots
  match --> p2Shots
  match --> rematchVotes
```

## Nguon ma lien quan
- server/src/game/types/game.types.ts
- client/src/types/online.ts
