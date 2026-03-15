# Component Diagram - Profile

## Pham vi
Thanh phan tham gia luong cap nhat profile.

## Mermaid
```mermaid
flowchart LR
  subgraph Client
    H[Home Page]
    PM[Profile Modal]
    AS[authService]
    GC[GlobalContext]
  end

  subgraph Server
    PC[ProfileController]
    PS[ProfileService]
    U[(users)]
    UP[/uploads/]
  end

  H --> PM
  PM --> AS
  AS --> PC
  PC --> PS
  PS --> U
  PS --> UP
  AS --> GC
```

## Nguon ma lien quan
- client/src/pages/home.tsx
- client/src/components/modal/ProfileSetupModal.tsx
- client/src/services/authService.ts
- server/src/profile/profile.controller.ts
- server/src/profile/profile.service.ts
