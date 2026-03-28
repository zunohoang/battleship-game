# HTTP API — Battleship server

Tài liệu mô tả các endpoint REST do NestJS expose. **Không có global prefix**: đường dẫn dưới đây là path đầy đủ (ví dụ `GET /leaderboard`).

**Mã nguồn tham chiếu:** `server/src/**/*controller.ts`, `server/src/main.ts` (CORS, validation, static `/uploads`).

---

## Cơ sở & CORS

- **Port:** biến môi trường `PORT` (ứng dụng đọc qua `ConfigService`).
- **CORS:** chỉ origin nằm trong `CLIENT_URL` (danh sách phân tách bằng dấu phẩy); `credentials: true` (cookie refresh).
- **Validation:** `ValidationPipe` với `whitelist`, `forbidNonWhitelisted`. Body/query không được gửi thừa field so với DTO.
- **File tĩnh:** ảnh avatar sau upload được phục vụ tại `GET /uploads/{filename}`.

---

## Xác thực

| Cơ chế | Mô tả |
|--------|--------|
| **Access token** | JWT gửi qua header `Authorization: Bearer <accessToken>` cho các route có `@UseGuards(JwtAuthGuard)`. |
| **Refresh token** | HttpOnly cookie (tên cookie do cấu hình quyết định). Dùng cho `POST /auth/refresh`. |
| **Đăng xuất** | `POST /auth/logout` xóa cookie và thu hồi refresh token phía server (nếu có). |

---

## Định dạng lỗi (HTTP)

`HttpExceptionFilter` trả JSON thống nhất:

```json
{
  "statusCode": 400,
  "error": "ERROR_CODE",
  "message": "Human readable or validation message",
  "path": "/requested/path",
  "timestamp": "2026-03-28T12:00:00.000Z"
}
```

- **400 Bad Request:** thường có `error` là mã validation (ví dụ `USERNAME_TOO_LONG`, `FORUM_SORT_INVALID`).
- **401 Unauthorized:** JWT thiếu/sai, refresh thiếu cookie, v.v.
- Các mã `error` cụ thể xem `server/src/main.ts` (`validationMessages`) và nơi ném `HttpException` trong service.

---

## Kiểu dùng chung

### `AuthResponse`

Dùng cho `register`, `login`, `refresh`, `PATCH /users/me`, `PATCH /users/me/password`:

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `accessToken` | string | JWT mới |
| `user` | object | `id`, `username`, `email`, `avatar`, `signature`, `elo` |

### `ProfileSummaryDto` — `GET /users/:id/profile`

| Field | Kiểu |
|-------|------|
| `id`, `username` | string |
| `avatar`, `signature` | string \| null |
| `elo` | number |

---

## Bảng endpoint

### Root

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/` | Không | Health / hello string (`AppController`). |

---

### Auth — `AuthController` (`/auth`)

| Method | Path | Auth | Body | Status / Response |
|--------|------|------|------|-------------------|
| POST | `/auth/register` | Không | JSON `RegisterDto`: `username` (≤20, letters/numbers/spaces), `email`, `password` (8–72) | 201 → `AuthResponse`; set cookie refresh |
| POST | `/auth/login` | Không | JSON `LoginDto`: `email`, `password` (8–72) | 200 → `AuthResponse`; set cookie refresh |
| POST | `/auth/refresh` | Cookie refresh | (empty) | 200 → `AuthResponse`; set cookie refresh. 401 `INVALID_REFRESH_TOKEN` nếu thiếu/không hợp lệ |
| POST | `/auth/logout` | Không (cookie optional) | — | 204 No Content; xóa cookie |

---

### Người dùng / hồ sơ — `ProfileController` (`/users`)

| Method | Path | Auth | Body / Query | Mô tả |
|--------|------|------|--------------|--------|
| GET | `/users/:id/profile` | JWT | — | Public summary theo `id` (`ProfileSummaryDto`). |
| PATCH | `/users/me/password` | JWT | JSON `ChangePasswordDto`: `currentPassword`, `newPassword` (8–72) | Đổi mật khẩu, xoay refresh; trả `AuthResponse`. Lỗi thường gặp: `INVALID_CURRENT_PASSWORD`, `NEW_PASSWORD_SAME_AS_OLD`. |
| PATCH | `/users/me` | JWT | `multipart/form-data`: `username`, `signature` (optional từng field); file field `avatar` optional, tối đa **3 MB** | Cập nhật hồ sơ; trả `AuthResponse` với `avatar` URL đầy đủ nếu upload mới. |

**Lưu ý:** Route `me/password` được khai báo tách biệt với `me` để không đụng param.

---

### Bảng xếp hạng — `LeaderboardController` (`/leaderboard`)

| Method | Path | Auth | Query | Response |
|--------|------|------|-------|----------|
| GET | `/leaderboard` | Không | `limit` optional, integer 1–100 (mặc định 50) | Mảng `LeaderboardEntryDto`: `rank`, `userId`, `username`, `avatar`, `elo`, `rankTierId` |

---

### Lịch sử trận PvP — `GameHistoryController` (`/game`)

| Method | Path | Auth | Query | Response |
|--------|------|------|-------|----------|
| GET | `/game/matches/history` | JWT | `limit` optional, integer 1–50 (mặc định 20) | Mảng `OnlineMatchHistoryItem` (trận `finished` của user): |

**Phần tử `OnlineMatchHistoryItem`:**

| Field | Kiểu | Mô tả |
|-------|------|--------|
| `matchId`, `roomId`, `opponentId` | string | UUID |
| `finishedAt` | string | ISO 8601 |
| `outcome` | `"win"` \| `"loss"` | So với user hiện tại |
| `opponentUsername` | string \| null | |
| `yourStats`, `opponentStats` | object | `shotsFired`, `hits`, `misses`, `accuracy` (0–100, làm tròn) |

---

### Diễn đàn — `ForumController` (`/forum`)

**Query — `GET /forum/posts` (`ForumPostsQueryDto`):**

| Query | Mặc định | Giới hạn |
|-------|----------|----------|
| `page` | 1 | integer ≥ 1 |
| `limit` | 10 | 1–30 |
| `sort` | `newest` | `newest` \| `top` \| `comments` |
| `q` | — | tối đa 200 ký tự (search) |

**Nội dung bài / bình luận (validation):**

- Tiêu đề bài: bắt buộc, tối đa **150** ký tự.
- Nội dung bài: bắt buộc, tối đa **5000** ký tự.
- Nội dung comment: bắt buộc, tối đa **1200** ký tự.

| Method | Path | Auth | Body | Response / status |
|--------|------|------|------|-------------------|
| GET | `/forum/posts` | Không | Query như trên | Danh sách bài (theo service) |
| GET | `/forum/posts/:postId` | Không | — | Chi tiết một bài |
| GET | `/forum/posts/:postId/comments` | Không | — | Danh sách comment |
| POST | `/forum/posts` | JWT | `CreatePostDto` `title`, `content` | Bài tạo |
| PATCH | `/forum/posts/:postId` | JWT | `UpdatePostDto` (partial) | Bài cập nhật |
| DELETE | `/forum/posts/:postId` | JWT | — | 204 — archive (soft) |
| POST | `/forum/posts/:postId/comments` | JWT | `CreateCommentDto` `content` | Comment mới |
| PATCH | `/forum/comments/:commentId` | JWT | `UpdateCommentDto` | Comment cập nhật |
| DELETE | `/forum/comments/:commentId` | JWT | — | 204 |
| POST | `/forum/posts/:postId/vote` | JWT | `VoteDto` `value`: **-1** hoặc **1** | Kết quả vote bài |
| POST | `/forum/comments/:commentId/vote` | JWT | `VoteDto` `value`: **-1** hoặc **1** | Kết quả vote comment |

---

## Realtime (bổ sung, không phải REST)

Gameplay online dùng **Socket.IO**, namespace **`/game`** (`GameGateway` trong `server/src/game/game.gateway.ts`). Client gửi/nhận sự kiện theo `GameEvents` và DTO trong `server/src/game/dto/game-events.dto.ts`. Chi tiết message nên được tài liệu hoá riêng (sequence / contract sự kiện) nếu cần.

---

## File mã nguồn liên quan

| Khu vực | File |
|---------|------|
| Auth REST | `server/src/auth/auth.controller.ts` |
| Profile / user | `server/src/profile/profile.controller.ts` |
| Leaderboard | `server/src/leaderboard/leaderboard.controller.ts` |
| Match history | `server/src/game/game-history.controller.ts` |
| Forum | `server/src/forum/forum.controller.ts` |
| Bootstrap & lỗi | `server/src/main.ts`, `server/src/common/infrastructure/filters/http-exception.filter.ts` |
| WS game | `server/src/game/game.gateway.ts` |
