# Architecture Diagram - Profile

## Pham vi
Kien truc theo layer cua tinh nang profile.

## Mermaid
```mermaid
flowchart TB
  subgraph Presentation
    HP[Home Page]
    PM[Profile Modal]
  end
  subgraph ClientApp
    SVC[authService]
    CTX[GlobalContext]
  end
  subgraph Backend
    CTRL[ProfileController]
    SRV[ProfileService]
    VAL[DTO Validation]
  end
  subgraph Data
    USERS[(users)]
    FILES[/uploads/]
  end

  HP --> PM
  PM --> SVC
  SVC --> CTRL
  CTRL --> VAL
  CTRL --> SRV
  SRV --> USERS
  SRV --> FILES
  SVC --> CTX
```

## Nguon ma lien quan
- client/src/pages/home.tsx
- client/src/components/modal/ProfileSetupModal.tsx
- client/src/services/authService.ts
- server/src/profile/profile.controller.ts
- server/src/profile/profile.service.ts
