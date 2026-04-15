# Game Service

Standalone NestJS service for rooms, matches, moves, websocket gameplay, chat and leaderboard endpoints.

## Responsibilities
- Game room lifecycle
- Match orchestration and move processing
- Socket.io gameplay namespace
- gRPC call to AuthService for token validation

## Run

```bash
npm install
npm run start:dev
```

## Environment
Copy .env.example to .env and update values.
