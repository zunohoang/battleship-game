# State Diagram - Match

## Pham vi
Trang thai match.status va state chuyen tiep.

## Mermaid
```mermaid
stateDiagram-v2
  [*] --> setup
  setup --> in_progress: both ready/timeout
  in_progress --> finished: winner found
  in_progress --> finished: forfeit
  finished --> rematch_voting: vote opened
  rematch_voting --> setup: both accept
  rematch_voting --> closed: reject/leave
  closed --> [*]
```

## Nguon ma lien quan
- server/src/game/game.service.ts
- server/src/game/infrastructure/persistence/relational/entities/match.entity.ts
