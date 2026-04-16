# Huong dan cai dat va chay du an Battleship

Tai lieu nay huong dan chay du an theo 2 cach:
- Chay local (khuyen dung khi dev)
- Chay bang Docker Compose

## 1. Tong quan

Du an gom 2 ung dung chinh:
- `client/`: React + Vite (mac dinh chay o `http://localhost:5173`)
- `server/`: NestJS API + Socket (mac dinh chay o `http://localhost:3000`)

Backend can:
- PostgreSQL
- Redis

## 2. Yeu cau moi truong

Can cai san:
- Node.js 20+ (khuyen dung Node.js 22 LTS)
- npm 10+
- Docker Desktop (neu muon chay DB/Redis bang container)
- Git

Kiem tra nhanh:

```bash
node -v
npm -v
docker -v
docker compose version
```

## 3. Cai dat theo cach local (khuyen nghi)

### Buoc 1: Clone repo va di chuyen vao thu muc du an

```bash
git clone https://github.com/zunohoang/battleship-game.git
cd battleship-game
```

Neu ban da co source san, chi can mo thu muc goc du an.

### Buoc 2: Tao file env

#### 2.1 Backend env

Sao chep file mau:

Windows PowerShell:
```powershell
Copy-Item .\server\.env.example .\server\.env
```

macOS/Linux:
```bash
cp server/.env.example server/.env
```

Gia tri quan trong trong `server/.env`:
- `PORT=3000`
- `CLIENT_URL=http://localhost:5173`
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=battleship`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`
- `REDIS_HOST=127.0.0.1`
- `REDIS_PORT=6379`
- `REDIS_PASSWORD=myredispassword`

#### 2.2 Frontend env

Sao chep file mau:

Windows PowerShell:
```powershell
Copy-Item .\client\.env.example .\client\.env
```

macOS/Linux:
```bash
cp client/.env.example client/.env
```

Dam bao `client/.env` co:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Buoc 3: Khoi dong PostgreSQL va Redis

Ban co 2 lua chon:

- Lua chon A (de nhat): dung Docker Compose o root
- Lua chon B: dung dich vu cai truc tiep trong may

Neu dung Docker Compose (Lua chon A), can co file env o root:

Windows PowerShell:
```powershell
Copy-Item .\.env.production.example .\.env
```

macOS/Linux:
```bash
cp .env.production.example .env
```

Sau do chay:

```bash
docker compose up -d postgres redis
```

### Buoc 4: Cai dependencies

Cai cho client:

```bash
cd client
npm install
```

Cai cho server:

```bash
cd ../server
npm install
```

### Buoc 5: Chay migration cho database

Trong thu muc `server/`:

```bash
npm run migration:run
```

### Buoc 6: Chay backend

Trong thu muc `server/`:

```bash
npm run start:dev
```

### Buoc 7: Chay frontend

Mo terminal moi, vao thu muc `client/`:

```bash
npm run dev
```

## 4. Chay toan bo bang Docker Compose

Cach nay phu hop de test nhanh theo stack gan production.

### Buoc 1: Tao file `.env` o thu muc goc

Windows PowerShell:
```powershell
Copy-Item .\.env.production.example .\.env
```

macOS/Linux:
```bash
cp .env.production.example .env
```

### Buoc 2: Chinh bien moi truong quan trong trong `.env`

Toi thieu can review cac bien:
- `CLIENT_URL` (URL frontend duoc phep CORS)
- `PORT` (port backend expose ra ngoai)
- `CLIENT_PORT` (port frontend expose ra ngoai)
- `DB_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `VITE_API_BASE_URL` (duong dan API de build client image)

Khi chay local bang compose, co the dat:

```env
PORT=3000
CLIENT_PORT=8080
CLIENT_URL=http://localhost:8080
VITE_API_BASE_URL=http://localhost:3000/api
COOKIE_SECURE=false
```

### Buoc 3: Build va start

```bash
docker compose up -d --build
```

### Buoc 4: Truy cap

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000/api`

### Buoc 5: Dung stack

```bash
docker compose down
```

Neu muon xoa ca volumes DB/Redis:

```bash
docker compose down -v
```

## 5. Script hay dung

### Client (`client/`)

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Server (`server/`)

```bash
npm run start:dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run migration:run
npm run migration:revert
```

## 6. Kiem tra nhanh sau khi chay

- Frontend mo duoc trang chu
- Backend tra ve phan hoi tai endpoint bat ky co `/api`
- Dang ky/dang nhap hoat dong
- Khong bi loi CORS/cookie khi goi API tu frontend

## 7. Loi thuong gap

### Loi CORS

Nguyen nhan thuong gap: `CLIENT_URL` trong `server/.env` khong khop URL frontend.

Cach fix:
- Neu frontend local Vite, dat `CLIENT_URL=http://localhost:5173`
- Neu frontend qua compose, dat `CLIENT_URL=http://localhost:8080`

### Loi ket noi database

Kiem tra:
- Postgres da chay chua (`docker ps`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` dung chua
- Da chay `npm run migration:run` chua

### Loi Redis auth

Kiem tra `REDIS_PASSWORD` trong env cua server trung voi password Redis container.

## 8. Ghi chu quan trong

- Backend dat global prefix `/api`, vi vay frontend can goi API qua `.../api`.
- Cookie refresh token phu thuoc `withCredentials` va CORS credentials, khong bo cac cau hinh nay khi debug auth.
- Truoc khi deploy production, bat buoc doi toan bo secrets mac dinh (`JWT_SECRET`, `JWT_REFRESH_SECRET`, mat khau DB/Redis).
