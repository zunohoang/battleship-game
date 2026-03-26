# Activity Diagram - Setup va Placement

## Pham vi
Workflow tu chon cau hinh den xac nhan san sang.

## Mermaid
```mermaid
flowchart TD
  A[Mo Game Setup] --> B[Chon board preset hoac custom]
  B --> C[Chon doi tau]
  C --> D[Dat tung tau len ban]
  D --> E{Hop le?}
  E -->|Khong| F[Canh bao trung/ra ngoai bien]
  F --> D
  E -->|Co| G[Cap nhat placements]
  G --> H{Dat du so tau?}
  H -->|Chua| D
  H -->|Roi| I[Bam San sang]
  I --> J[Chuyen sang choi hoac waiting]
```

## Nguon ma lien quan
- client/src/pages/game-setup.tsx
- client/src/utils/placementUtils.ts
