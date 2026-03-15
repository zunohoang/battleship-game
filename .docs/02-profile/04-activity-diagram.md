# Activity Diagram - Profile

## Pham vi
Workflow chinh khi nguoi dung chinh sua ho so.

## Mermaid
```mermaid
flowchart TD
  A[Mo Profile Modal] --> B[Nhap thong tin moi]
  B --> C{Du lieu hop le?}
  C -->|Khong| D[Hien loi validate]
  D --> B
  C -->|Co| E[Gui PATCH users/me]
  E --> F{Co avatar file?}
  F -->|Co| G[Upload va luu URL]
  F -->|Khong| H[Bo qua upload]
  G --> I[Cap nhat user]
  H --> I
  I --> J{Co doi password?}
  J -->|Co| K[Hash password + reset refresh]
  J -->|Khong| L[Giuyen session]
  K --> M[Tra ve access token moi]
  L --> M
  M --> N[Cap nhat UI]
```

## Nguon ma lien quan
- client/src/components/modal/ProfileSetupModal.tsx
- server/src/profile/profile.controller.ts
- server/src/profile/profile.service.ts
