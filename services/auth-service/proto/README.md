# gRPC Contracts

Shared protobuf contracts for microservices.

## Structure
- auth/v1/auth.proto
- account/v1/account.proto
- game/v1/game.proto
- forum/v1/forum.proto

## Rules
- Keep backward compatibility in v1.
- Do not reuse field numbers.
- Mark removed fields as reserved.
- Add new fields as optional-compatible additions only.

## Suggested generation flow
- Keep proto as source of truth.
- Generate TypeScript stubs in each service at build time.
- Validate compatibility in CI before deployment.
