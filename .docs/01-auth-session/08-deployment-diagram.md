# Deployment Diagram - Auth va Session

## Pham vi
Topologi runtime cho auth bao gom browser, API va database.

## Mermaid
```mermaid
flowchart TB
  U[Nguoi dung tren trinh duyet]
  B[Client Vite React]
  N[NestJS API]
  PG[(PostgreSQL)]
  FS[/Cookie Refresh Token HttpOnly/]

  U --> B
  B -->|HTTPS REST| N
  B --> FS
  N -->|TypeORM| PG
```

## Nguon ma lien quan
- docker-compose.yml
- docker-compose.prod.yml
- server/src/main.ts
- server/src/database/data-source.ts
