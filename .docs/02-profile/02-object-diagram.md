# Object Diagram - Profile

## Pham vi
Anh xa doi tuong tai thoi diem nguoi dung vua cap nhat profile thanh cong.

## Mermaid
```mermaid
classDiagram
  class profileForm {
    username = "captainB"
    signature = "Never give up"
    avatarFile = "avatar.png"
    password = "********"
  }
  class currentUser {
    id = "u-123"
    username = "captainB"
    avatar = "/uploads/a1b2.png"
    signature = "Never give up"
  }
  class serverResult {
    accessToken = "eyJ..."
    updated = true
  }

  profileForm --> serverResult : submit
  serverResult --> currentUser : apply
```

## Nguon ma lien quan
- client/src/components/modal/ProfileSetupModal.tsx
- client/src/store/globalContext.tsx
- server/src/profile/profile.service.ts
