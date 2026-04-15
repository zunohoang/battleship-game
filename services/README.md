# Microservices Layout

This folder contains fully separated NestJS services:
- auth-service
- account-service
- game-service
- forum-service

## Run with Docker

From repository root:

```bash
docker compose -f docker-compose.microservices.yml up -d --build
```

Gateway endpoint:
- http://localhost:8088

Internal service ports (host mapped):
- Auth HTTP: 3001
- Auth gRPC: 50051
- Account HTTP: 3002
- Game HTTP/WebSocket: 3003
- Forum HTTP: 3004

## Local run one service

```bash
cd services/auth-service
npm install
npm run start:dev
```

Repeat for each service folder.
