# State Diagram - Profile

## Pham vi
Trang thai profile modal va xu ly submit.

## Mermaid
```mermaid
stateDiagram-v2
  [*] --> Closed
  Closed --> Editing: open modal
  Editing --> Validating: submit
  Validating --> Editing: invalid
  Validating --> Submitting: valid
  Submitting --> Success: API 200
  Submitting --> Failure: API 4xx/5xx
  Failure --> Editing: user retry
  Success --> Closed: close modal
```

## Nguon ma lien quan
- client/src/components/modal/ProfileSetupModal.tsx
- server/src/profile/profile.service.ts
