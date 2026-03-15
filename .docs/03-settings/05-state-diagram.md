# State Diagram - Settings

## Pham vi
May trang thai cua settings modal.

## Mermaid
```mermaid
stateDiagram-v2
  [*] --> Closed
  Closed --> Opened: open settings
  Opened --> Editing: thay doi gia tri
  Editing --> Saving: save
  Saving --> Saved: success
  Saving --> Error: fail
  Error --> Editing: retry
  Saved --> Opened
  Opened --> Closed: close
```

## Nguon ma lien quan
- client/src/components/modal/SettingsModal.tsx
- client/src/store/settingsContext.tsx
