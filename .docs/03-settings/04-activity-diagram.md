# Activity Diagram - Settings

## Pham vi
Workflow doi settings tu UI den localStorage.

## Mermaid
```mermaid
flowchart TD
  A[Mo Settings] --> B[Chinh language/theme/volume]
  B --> C{Gia tri hop le?}
  C -->|Khong| D[Hien canh bao]
  D --> B
  C -->|Co| E[Cap nhat context]
  E --> F[Luu app.settings]
  F --> G{Luu thanh cong?}
  G -->|Khong| H[Thong bao loi]
  G -->|Co| I[Dong modal hoac tiep tuc]
```

## Nguon ma lien quan
- client/src/components/modal/SettingsModal.tsx
- client/src/store/settingsContext.tsx
