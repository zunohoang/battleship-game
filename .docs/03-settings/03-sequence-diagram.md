# Sequence Diagram - Cap nhat Settings

## Pham vi
Luong nguoi dung thay doi settings va luu local.

## Mermaid
```mermaid
sequenceDiagram
  actor U as Nguoi dung
  participant M as SettingsModal
  participant C as SettingsContext
  participant S as settingsStorage

  U->>M: Chon language/theme/volume
  M->>C: updateSettings(delta)
  C->>C: merge voi state hien tai
  C->>S: save(app.settings)
  S-->>C: success
  C-->>M: state moi
  M-->>U: Hien thi thay doi tuc thi
```

## Nguon ma lien quan
- client/src/components/modal/SettingsModal.tsx
- client/src/store/settingsContext.tsx
- client/src/services/settingsStorage.ts
