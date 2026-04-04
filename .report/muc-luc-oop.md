Tôi đã đọc yêu cầu và khám phá toàn bộ dự án. Đây là dự án game **Battleship (Trận chiến tàu chiến)** online - multiplayer với các tính năng: phòng chơi, đấu thực, Elo rating, diễn đàn, bảng xếp hạng, chế độ khán giả và chat. Dưới đây là **mục lục đầy đủ** cho báo cáo, ánh xạ trực tiếp từ mã nguồn thực tế sang từng yêu cầu trong `yeu-cau.txt`:

---

## Mục lục tài liệu báo cáo — Hệ thống Game Battleship Online

---

### 1. Introduction

- 1.1. Giới thiệu bài toán
- 1.2. Mục tiêu hệ thống
- 1.3. Công nghệ sử dụng (React + Vite, NestJS, PostgreSQL, Redis, Socket.IO)

---

### 2. Problem Description

- 2.1. Mô tả bài toán thực tế
- 2.2. Các actor trong hệ thống: **Guest**, **Người dùng đã đăng ký (Registered User)**, **Khán giả (Spectator)**

---

### 3. System Scope

- 3.1. Phạm vi hệ thống
- 3.2. Các chức năng nằm trong / ngoài phạm vi

---

### 4. Functional Requirements

- 4.1. Xác thực và quản lý tài khoản (Đăng ký, Đăng nhập, Đổi mật khẩu, Cập nhật hồ sơ, Upload avatar)
- 4.2. Quản lý phòng chơi (Tạo phòng, Tham gia phòng, Rời phòng, Danh sách phòng)
- 4.3. Chơi trận đấu (Xếp tàu, Bắn, Phát hiện chìm/trúng/trượt, Forfeiting, Rematch)
- 4.4. Chế độ khán giả (Tham gia/Rời xem, Chat khán giả riêng)
- 4.5. Leaderboard và hệ thống Elo (Xem xếp hạng, Cập nhật điểm sau trận)
- 4.6. Diễn đàn (Đăng bài, Bình luận, Vote bài/bình luận, Sửa/xóa)
- 4.7. Lịch sử trận đấu

---

### 5. Non-Functional Requirements

- 5.1. Hiệu năng (Real-time bằng WebSocket)
- 5.2. Bảo mật (JWT, HTTP-only cookie, bcrypt, CORS)
- 5.3. Khả năng mở rộng (Redis cho chat, phân module NestJS)
- 5.4. Tính khả dụng (Reconnect, hết hạn phòng, deadline lượt đi)
- 5.5. Hỗ trợ đa ngôn ngữ (i18n: i18next)

---

### 6. Use Case Model

**Biểu đồ Use Case tổng thể** (≥ 4 UC, ánh xạ các actor: Guest, User, Spectator)

| #    | Use Case                         | Actor chính      |
| ---- | -------------------------------- | ---------------- |
| UC01 | Đăng ký tài khoản                | Guest            |
| UC02 | Đăng nhập                        | Guest / User     |
| UC03 | Tạo / Tham gia phòng chơi        | User             |
| UC04 | Xếp tàu & Bắt đầu trận           | User             |
| UC05 | Thực hiện nước đi (Bắn)          | User             |
| UC06 | Rematch / Forfeiting             | User             |
| UC07 | Xem trận đấu (Spectate)          | Spectator        |
| UC08 | Chat trong phòng & Chat khán giả | User / Spectator |
| UC09 | Xem và cập nhật hồ sơ cá nhân    | User             |
| UC10 | Xem bảng xếp hạng Elo            | Guest / User     |
| UC11 | Đăng bài & Bình luận diễn đàn    | User             |
| UC12 | Vote bài viết / bình luận        | User             |
| UC13 | Xem lịch sử trận đấu             | User             |

- 6.1. Biểu đồ Use Case — Nhóm Xác thực (UC01, UC02)
- 6.2. Biểu đồ Use Case — Nhóm Game (UC03, UC04, UC05, UC06, UC07, UC08)
- 6.3. Biểu đồ Use Case — Nhóm Cộng đồng & Thông tin (UC09, UC10, UC11, UC12, UC13)

---

### 7. Use Case Specification (≥ 3 UC quan trọng nhất)

- **7.1. Đặc tả UC04 — Xếp tàu & Bắt đầu trận** _(phức tạp nhất: flow cấu hình board, sự kiện WebSocket `room:configureSetup`, `room:ready`, `room:start`)_
  - Luồng chính, luồng phụ (bot setup), ngoại lệ (timeout, hủy)
- **7.2. Đặc tả UC05 — Thực hiện nước đi (Bắn)** _(core gameplay: `match:move`, xử lý trúng/chìm/thắng, deadline)_
  - Luồng chính, luồng phụ (bắn trùng), ngoại lệ (không đúng lượt, mất kết nối, hết giờ)
- **7.3. Đặc tả UC11 — Đăng bài & Bình luận diễn đàn** _(tương tác REST + JWT guard, vote)_
  - Luồng chính, luồng phụ (sửa/xóa), ngoại lệ (không đủ quyền, bài đã archive)

---

### 8. Domain Model

**Biểu đồ lớp khái niệm (Conceptual Class Diagram)** — ≥ 5 domain class:

| Domain Class     | Ánh xạ Entity thực tế                                                |
| ---------------- | -------------------------------------------------------------------- |
| **User**         | `UserEntity` (id, email, username, elo, avatar)                      |
| **Room**         | `RoomEntity` (code, status, visibility, expiresAt)                   |
| **Match**        | `MatchEntity` (status, boardConfig, placements, shots, turn, winner) |
| **Move**         | `MoveEntity` (x, y, isHit, sequence)                                 |
| **ForumPost**    | `ForumPostEntity` (title, content, voteScore)                        |
| **ForumComment** | `ForumCommentEntity`                                                 |
| **EloRecord**    | (tính từ `Match.eloSettled`, delta Elo)                              |

- 8.1. Biểu đồ Domain Model tổng thể (quan hệ giữa 7 lớp trên)
- 8.2. Giải thích các quan hệ: User–Room (1 owner, 1 guest), Room–Match (1-n), Match–Move (1-n), User–ForumPost (1-n), ForumPost–ForumComment (1-n), User–Vote

---

### 9. CRC Cards

Thẻ CRC cho các lớp chính:

| Lớp                       | Trách nhiệm                              | Cộng tác với                 |
| ------------------------- | ---------------------------------------- | ---------------------------- |
| **User**                  | Xác thực, lưu Elo, hồ sơ cá nhân         | Room, Match, ForumPost       |
| **Room**                  | Quản lý trạng thái phòng, ghép cặp       | User, Match                  |
| **Match**                 | Điều phối luật chơi, xác định thắng/thua | Room, Move, User (Elo)       |
| **Move**                  | Lưu lịch sử nước đi                      | Match, User                  |
| **ForumPost**             | Quản lý nội dung bài viết                | User, ForumComment           |
| **ForumComment**          | Quản lý bình luận                        | User, ForumPost              |
| **GameGateway** (Control) | Nhận/phát sự kiện WebSocket              | GameService, ChatService     |
| **GameService** (Control) | Điều phối logic trận đấu, Elo            | Match, Room, EloMatchService |
| **ChatService** (Control) | Lưu/đọc lịch sử chat (Redis)             | RedisService                 |

---

### 10. BCE Architecture

**Phân tích kiến trúc Boundary–Control–Entity cho các chức năng chính:**

- 10.1. **Nhóm Game (WebSocket)**

| Tầng     | Lớp                                                                                 |
| -------- | ----------------------------------------------------------------------------------- |
| Boundary | `GameGateway` (Socket.IO handler), `GameRoomsPage`, `GamePlayPage`, `GameSetupPage` |
| Control  | `GameService`, `EloMatchService`, `ChatService`                                     |
| Entity   | `RoomEntity`, `MatchEntity`, `MoveEntity`, `UserEntity`                             |

- 10.2. **Nhóm Xác thực (REST)**

| Tầng     | Lớp                                             |
| -------- | ----------------------------------------------- |
| Boundary | `AuthController`, `LoginModal`, `RegisterModal` |
| Control  | `AuthService`, `JwtStrategy`, `JwtAuthGuard`    |
| Entity   | `UserEntity`, `RefreshTokenRepository`          |

- 10.3. **Nhóm Diễn đàn (REST)**

| Tầng     | Lớp                                                            |
| -------- | -------------------------------------------------------------- |
| Boundary | `ForumController`, `ForumFeedPage`, `ForumPostDetail`          |
| Control  | `ForumService`                                                 |
| Entity   | `ForumPostEntity`, `ForumCommentEntity`, `ForumPostVoteEntity` |

---

### 11. Sequence Diagrams (≥ 3 UC, tương ứng với UC đã đặc tả)

- **11.1. Sequence Diagram — UC04: Xếp tàu & Bắt đầu trận**
  - Actors/Objects: `GameSetupPage` → `GameGateway` → `GameService` → `RoomEntity` → `MatchEntity`
  - Sự kiện: `room:configureSetup` → validate → `room:ready` → cả 2 ready → `room:start` → tạo `Match` → emit `server:roomUpdated` / `server:matchUpdated`

- **11.2. Sequence Diagram — UC05: Thực hiện nước đi (Bắn)**
  - Objects: `GamePlayPage` → `GameGateway` → `GameService` → `MatchEntity` → `MoveEntity`
  - Flow: `match:move` → kiểm tra lượt → lưu `Move` → kiểm tra chìm/thắng → cập nhật `Match` → nếu thắng: `EloMatchService.settle()` → `UserEntity` (Elo) → emit `server:matchUpdated`

- **11.3. Sequence Diagram — UC11: Đăng bài diễn đàn**
  - Objects: `ForumFeedPage` → `ForumController` → `ForumService` → `ForumPostEntity`
  - Flow: POST `/api/forum/posts` → `JwtAuthGuard` → validate DTO → insert → return post → client render

- _(Tùy chọn thêm)_ **11.4. Sequence Diagram — UC02: Đăng nhập**
  - Objects: `LoginModal` → `AuthController` → `AuthService` → `UserRepository` → JWT sign → set cookie

---

### 12. Design Class Diagram

**Biểu đồ lớp chi tiết** (đầy đủ thuộc tính, phương thức, quan hệ):

- 12.1. **Nhóm Auth & User**
  - `UserEntity`, `AuthService`, `AuthController`, `JwtStrategy`, `ProfileService`
  - Quan hệ: Dependency, Association
- 12.2. **Nhóm Game**
  - `RoomEntity`, `MatchEntity`, `MoveEntity`, `GameService`, `GameGateway`, `EloMatchService`, `ChatService`
  - Quan hệ: Composition (Room ◆→ Match), Aggregation (Match ◇→ Move), Association (GameService → EloMatchService)
- 12.3. **Nhóm Forum**
  - `ForumPostEntity`, `ForumCommentEntity`, `ForumPostVoteEntity`, `ForumCommentVoteEntity`, `ForumService`, `ForumController`
  - Quan hệ: Composition (Post ◆→ Comment), Association (User → Vote)
- 12.4. **Nhóm Infrastructure**
  - `RedisService`, `DatabaseConfig`, interfaces `IGameService`, `IChatService`
  - Quan hệ: Interface implementation (<<implements>>)

---

### 13. State Machine Diagram

- **13.1. State Machine — Match (Trận đấu)** _(đối tượng có vòng đời phức tạp nhất)_

```
[Created] → setup_pending → [WaitingSetup]
[WaitingSetup] → both_ready → [InProgress]
[InProgress] → move_hit_sunk_all → [Finished (Winner)]
[InProgress] → forfeit → [Finished (Forfeit)]
[InProgress] → timeout → [Finished (Timeout)]
[Finished] → rematch_voted_both → [Created] (new Match)
[Finished] → rematch_declined → [Terminated]
```

Trạng thái: `setup_pending` | `in_progress` | `finished` | (terminated)  
Sự kiện kích hoạt: `room:ready`, `match:move`, `match:forfeit`, deadline timer, `match:rematchVote`

- **13.2. State Machine — Room (Phòng chơi)** _(tùy chọn)_

```
[Created] → guest_joins → [Full/Waiting]
[Waiting] → both_ready+start → [Playing]
[Playing] → match_finished → [PostGame]
[PostGame] → rematch → [Playing] / → leave → [Terminated]
[Created/Waiting] → expires → [Expired]
```

---

### 14. Implementation

- 14.1. Cấu trúc thư mục dự án (`client/`, `server/`)
- 14.2. Các mẫu thiết kế áp dụng (Repository pattern, Gateway pattern, Strategy pattern cho Bot)
- 14.3. Nguyên lý SOLID áp dụng:
  - **SRP**: Mỗi module NestJS một trách nhiệm (`GameService`, `ChatService`, `EloMatchService` tách biệt)
  - **OCP**: Thêm loại bot mới không sửa core (`easyBot`, `hardBot` cùng interface)
  - **DIP**: Inject qua constructor, không phụ thuộc implementation cụ thể
- 14.4. Minh họa một số đoạn code quan trọng (Game Gateway, EloMatchService, ForumService)

---

### 15. Conclusion

- 15.1. Kết quả đạt được
- 15.2. Hạn chế
- 15.3. Hướng phát triển

---

**Tổng kết số lượng sơ đồ cần vẽ:**

| Loại sơ đồ             | Số lượng | Ghi chú                            |
| ---------------------- | -------- | ---------------------------------- |
| Use Case Diagram       | 3        | Tổng thể + 2 nhóm chi tiết         |
| Use Case Specification | 3        | UC04, UC05, UC11 (bắt buộc)        |
| Domain Model           | 1        | 7 domain class                     |
| CRC Cards              | 9        | 7 entity + 2 control               |
| BCE Architecture       | 3        | Game, Auth, Forum                  |
| Sequence Diagram       | 3–4      | UC04, UC05, UC11 (+ UC02 tùy chọn) |
| Detailed Class Diagram | 4        | Auth, Game, Forum, Infrastructure  |
| State Machine Diagram  | 1–2      | Match (bắt buộc) + Room (tùy chọn) |
