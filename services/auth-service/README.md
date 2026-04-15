# Auth Service

Standalone NestJS service for authentication and token lifecycle.

## Responsibilities
- Login/register/refresh/logout
- JWT issuance and validation
- gRPC AuthService endpoint for internal service-to-service auth checks

## Run

```bash
npm install
npm run start:dev
```

## Environment
Copy .env.example to .env and update values.
