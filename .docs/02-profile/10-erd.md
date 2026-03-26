# ERD - Profile

## Pham vi
Su dung bang users de phuc vu profile.

## Mermaid
```mermaid
erDiagram
  USERS {
    uuid id PK
    string email UK
    string username UK
    string passwordHash
    string avatar
    string signature
    string refreshTokenHash
    bigint refreshTokenAbsoluteExpiry
    datetime createdAt
    datetime updatedAt
  }
```

## Nguon ma lien quan
- server/src/auth/infrastructure/persistence/relational/entities/user.entity.ts
- server/src/profile/dto/update-profile.dto.ts
