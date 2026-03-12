# Server Plan

## Tổng Quan Chức Năng Hiện Có

### 1) Xác thực người dùng
- [x] Đăng ký tài khoản qua API `POST /auth/register`
	- Validate email format, username format (chỉ alphanumeric), password length (8-72 ký tự)
	- Kiểm tra trùng email (return 409), trùng username
	- Trả về access token + thông tin user + set refresh token cookie (HttpOnly)
- [x] Đăng nhập qua API `POST /auth/login`
	- Validate email format, password không được rỗng
	- Hỗ trợ email case-insensitive
	- Trả về access token + thông tin user + set refresh token cookie
	- Reject invalid credentials (401)
- [x] Refresh token qua API `POST /auth/refresh`
	- Yêu cầu refresh token từ cookie (HttpOnly)
	- Token rotation: cấp token mới, invalidate token cũ
	- Detect reuse attempt (401 nếu dùng token cũ lần 2)
	- Fail nếu không có cookie (401)
- [x] Logout qua API `POST /auth/logout`
	- Revoke refresh token trong database
	- Clear refresh cookie
- [x] Cập nhật hồ sơ qua API `PATCH /users/me` (yêu cầu JWT Bearer token), hỗ trợ:
	- Đổi username (validate alphanumeric, kiểm tra trùng)
	- Cập nhật signature (validate regex, max 200 ký tự)
	- Đổi password (min 8, max 72 ký tự → invalidate refresh tokens cũ)
	- Upload avatar (multipart form-data, max 3MB → trả về URL /uploads/)
	- Trả về access token mới + thông tin user updated
- Tham chiếu: `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/profile/profile.controller.ts`, `src/profile/profile.service.ts`

### 2) Hạ tầng auth theo hướng hexagonal
- [x] Domain user đã tách riêng trong module `auth`.
- [x] Đã có port/adapters cho:
	- user repository
	- token service
	- password hasher
- [x] Adapter hiện tại: in-memory repository + JWT + bcrypt.
- Tham chiếu:
	- `src/auth/domain/entities/user.ts`
	- `src/auth/infrastructure/persistence/user.repository.ts`
	- `src/auth/infrastructure/persistence/adapters/in-memory-user.repository.ts`
	- `src/auth/infrastructure/persistence/adapters/jwt-token.service.ts`
	- `src/auth/infrastructure/persistence/adapters/bcrypt-password-hasher.ts`

### 3) Cấu hình backend dùng chung
- [x] Bật CORS theo biến môi trường `CLIENT_URL`.
- [x] Global `ValidationPipe` cho validate DTO.
- [x] Global exception filter chuẩn hóa response lỗi.
- [x] Static serving thư mục `uploads` tại prefix `/uploads`.
- Tham chiếu:
	- `src/main.ts`
	- `src/common/infrastructure/filters/http-exception.filter.ts`
	- `src/app.module.ts`

### 4) Realtime game (mức cơ bản)
- [x] WebSocket gateway đã có xử lý kết nối/ngắt kết nối.
- [x] Có event `message` để nhận và broadcast dữ liệu cho tất cả client.
- Tham chiếu: `src/game/game.gateway.ts`

### 5) Kiểm thử e2e
- [x] Đã có 24 test cases bao gồm:
	- Endpoints cơ bản: `GET /` (hello world)
	- Auth register: success, duplicate email, invalid DTO, validate email/password/username format
	- Auth login: success, invalid credentials, missing fields, email case-insensitivity
	- Auth refresh: success, token rotation, reuse detection, fail without cookie, invalid token
	- Auth logout: clear cookie, invalidate old token
	- Profile update: username change, signature change, password change, avatar upload, new token after update
	- Authorization: reject unauthorized requests (401)
	- Validation errors: all DTO validations
- Tham chiếu: `test/app.e2e-spec.ts`

## Việc Tiếp Theo (Đề Xuất)

### Ưu tiên cao
- [ ] Chuyển `auth` từ in-memory repository sang persistence thật (relational/document adapter, e.g., PostgreSQL/MongoDB).
- [ ] Implement refresh token storage & revocation (database thay vì in-memory).
- [ ] Thiết kế nghiệp vụ Battleship realtime:
	- Room management (create, join, leave, list active rooms)
	- Matchmaking & turn system
	- Game state (board state, hit/miss tracking, win condition)
	- WebSocket events: game-start, turn-taken, hit/miss, game-over
- [ ] Bổ sung validation avatar file type (image/* only), optimize file upload.

### Ưu tiên trung bình
- [ ] Bổ sung unit test cho domain entity `User` và auth use-cases.
- [ ] Thêm logging theo context cho auth/game flows.
- [ ] Chuẩn hóa response contract cho websocket events.