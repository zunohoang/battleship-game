# State Diagram - Room

## Pham vi
Trang thai room.status trong online lifecycle.

## Mermaid
```mermaid
stateDiagram-v2
  [*] --> waiting
  waiting --> setup: owner start
  setup --> in_game: ownerReady && guestReady
  setup --> in_game: setup timeout auto-place
  in_game --> finished: match end
  waiting --> closed: owner leave
  finished --> setup: rematch accepted
  closed --> [*]
```

## Nguon ma lien quan
- server/src/game/game.service.ts
- server/src/game/infrastructure/persistence/relational/entities/room.entity.ts
