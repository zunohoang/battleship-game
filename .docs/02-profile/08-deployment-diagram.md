# Deployment Diagram - Profile

## Pham vi
Topologi runtime cho profile update va upload avatar.

## Mermaid
```mermaid
flowchart TB
  B[Browser]
  FE[Client React]
  BE[NestJS API]
  VOL[/uploads volume/]
  DB[(PostgreSQL)]

  B --> FE
  FE -->|PATCH /users/me| BE
  BE --> VOL
  BE --> DB
```

## Nguon ma lien quan
- docker-compose.yml
- server/src/profile/profile.controller.ts
- server/uploads
