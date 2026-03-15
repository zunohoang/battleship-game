# State Diagram - Platform

## Pham vi
Trang thai cap he thong cua phien nguoi dung.

## Mermaid
```mermaid
stateDiagram-v2
  [*] --> unauthenticated
  unauthenticated --> authenticated: login/register
  unauthenticated --> anonymous: play anonymous
  authenticated --> lobby: go home
  anonymous --> lobby
  lobby --> setup
  setup --> playing
  playing --> result
  result --> lobby
  lobby --> [*]: exit
```

## Nguon ma lien quan
- client/src/routes/index.tsx
- client/src/store/globalContext.tsx
- client/src/store/gameSetupContext.tsx
