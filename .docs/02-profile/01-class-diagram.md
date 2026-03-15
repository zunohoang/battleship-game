# Class Diagram - Profile

## Pham vi
Mo ta lop va quan he chinh cho cap nhat ho so, avatar va doi mat khau.

## Mermaid
```mermaid
classDiagram
  class ProfileController {
    +updateProfile(dto,file,user)
  }
  class ProfileService {
    +updateProfile(userId,dto,file)
  }
  class UpdateProfileDto {
    +username?: string
    +signature?: string
    +password?: string
  }
  class User {
    +id: uuid
    +username: string
    +avatar: string?
    +signature: string?
    +passwordHash: string
  }
  class AuthServiceClient {
    +updateProfile(payload)
  }
  class ProfileSetupModal {
    +open()
    +submitForm()
  }

  ProfileSetupModal --> AuthServiceClient
  AuthServiceClient --> ProfileController
  ProfileController --> ProfileService
  ProfileService --> User
  ProfileController --> UpdateProfileDto
```

## Nguon ma lien quan
- client/src/components/modal/ProfileSetupModal.tsx
- client/src/services/authService.ts
- server/src/profile/profile.controller.ts
- server/src/profile/profile.service.ts
- server/src/profile/dto/update-profile.dto.ts
- server/src/auth/infrastructure/persistence/relational/entities/user.entity.ts
