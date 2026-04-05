## Phần IV — Thiết kế lớp (Class diagram) & CRC

> Phần này **trình bày theo bố cục mục 2.5** trong báo cáo đồ án phần mềm (2.5.1 → 2.5.5): mục tiêu → các lớp chính theo **nhóm chức năng** → quan hệ → **thẻ CRC từng lớp** (bảng 2 cột) → hình sơ đồ minh họa. Nội dung mang tính **đặc tả thiết kế** (trước triển khai), không đóng vai trò tài liệu tra cứu mã nguồn.

### 2.5.1 Mục tiêu của sơ đồ lớp

- **Phân tích và mô hình hóa** các thực thể nghiệp vụ chính của hệ thống Battleship Online (người chơi, phòng, trận, nước đi, diễn đàn, khán giả…).
- **Làm rõ quan hệ** giữa người dùng và các đối tượng trung tâm (phòng, trận, bài viết, phiếu bầu, tin chat…), tránh chồng chéo trách nhiệm.
- **Làm cơ sở** cho giai đoạn lập trình theo hướng **hướng đối tượng** (OOP), đồng bộ với 20 use case và các sơ đồ trạng thái / trình tự ở Phần I–III.
- **Hỗ trợ mở rộng và bảo trì** sau này (thêm chế độ chơi, luật Elo, module cộng đồng…) nhờ ranh giới lớp rõ ràng.

### 2.5.2 Các lớp chính của hệ thống

Hệ thống được thiết kế với **11 lớp nghiệp vụ** tiêu biểu, gom theo **nhóm chức năng** (mỗi lớp có vai trò tương ứng một phần use case).

#### Nhóm người chơi & tài khoản

| Lớp | Mô tả |
| --- | --- |
| **User** | Người dùng đã đăng ký: thông tin đăng nhập, hồ sơ (biệt danh, avatar, chữ ký), **điểm Elo**; tham gia phòng/trận, forum, bảng xếp hạng. |

#### Nhóm phòng và trận đấu trực tuyến

| Lớp | Mô tả |
| --- | --- |
| **GameRoom** | Phòng chơi: mã phòng, chế độ công khai/riêng tư, **chủ phòng** và **khách**, trạng thái phòng; tham chiếu tới trận đang diễn ra. |
| **GameMatch** | Một ván đấu: cấu hình bảng, đội tàu, lượt chơi, lịch sử bắn hai phía, người thắng, phiếu **tái đấu**; gắn chặt với một phòng. |
| **GameMove** | Một **nước bắn** trong trận: tọa độ, kết quả trúng/trượt, thứ tự; đảm bảo không trùng lặp nước đi (theo thiết kế client/server). |

#### Nhóm diễn đàn cộng đồng

| Lớp | Mô tả |
| --- | --- |
| **ForumPost** | Bài viết: tiêu đề, nội dung, trạng thái (đang hiển thị / đã lưu trữ), điểm bình chọn, số bình luận. |
| **ForumComment** | Bình luận thuộc một bài viết; nội dung đã qua xử lý an toàn (chống XSS theo yêu cầu). |
| **PostVote** | Phiếu **upvote/downvote** của một người dùng lên một **bài** (một người — một bản ghi trạng thái vote). |
| **CommentVote** | Phiếu **upvote/downvote** của một người dùng lên một **bình luận**. |

#### Nhóm khán giả & trò chuyện

| Lớp | Mô tả |
| --- | --- |
| **SpectatorSession** | Phiên **xem trận** của người đã đăng nhập: gắn với phòng/trận, chỉ nhận thông tin công khai (không lộ vị trí tàu). |
| **SpectatorChatMessage** | Một tin nhắn trên **kênh chat khán giả**; lưu tạm thời hạn (TTL) để hiển thị lịch sử ngắn. |

#### Nhóm chơi với Bot (ngoại tuyến)

| Lớp | Mô tả |
| --- | --- |
| **BotOpponent** | Đối thủ AI trên **client** (Easy/Hard); quản lý bàn cờ cục bộ và nước bắn bot; **không** cập nhật Elo server. |

*Ngoài các lớp trên, giai đoạn triển khai có thể bổ sung các **lớp điều phối** (controller, gateway, dịch vụ ứng dụng) — minh họa ở **Hình 2.5-3**.*

### 2.5.3 Quan hệ giữa các lớp

- **User — GameRoom:** một **User** làm **chủ phòng** hoặc **khách**; một người không nên đồng thời ở hai phòng đang hoạt động (theo quy tắc nghiệp vụ UC).
- **GameRoom — GameMatch:** một phòng có thể có **nhiều trận** theo thời gian (ví dụ sau **tái đấu**); phòng giữ tham chiếu tới **trận hiện tại**.
- **GameMatch — GameMove:** một trận gồm **nhiều** `GameMove` có thứ tự; mỗi nước thuộc một người chơi và một trận xác định.
- **User — ForumPost / ForumComment:** tác giả bài hoặc bình luận là `User`; chỉ tác giả (hoặc quyền admin nếu có) được sửa/xóa theo thiết kế UC.
- **ForumPost — ForumComment:** một bài có **nhiều** bình luận; bài **đã lưu trữ** không nhận comment mới.
- **PostVote / CommentVote:** mỗi cặp (người dùng, bài) hoặc (người dùng, bình luận) có **một** trạng thái vote; bầu lại cùng chiều có thể **hủy** vote theo UC.
- **SpectatorSession — GameRoom / GameMatch:** khán giả gắn với phòng đang có trận; nhận cập nhật realtime và **SpectatorChatMessage** trên cùng ngữ cảnh phòng.
- **BotOpponent — User:** chỉ tương tác phía **client** với người chơi; không tạo `GameMatch` server cho chế độ này.

### 2.5.4 Thẻ CRC (Class — Responsibility — Collaborators)

Mỗi bảng sau mô tả **một lớp** theo đúng định dạng thẻ CRC: **Lớp** — **Trách nhiệm** — **Cộng tác**.

*Bảng 2.5.4-1 — Thẻ CRC mô tả User*

| | |
| :--- | :--- |
| **Lớp** | User |
| **Trách nhiệm** | Đăng ký, đăng nhập, duy trì phiên (access/refresh); cập nhật hồ sơ và mật khẩu; lưu và hiển thị **Elo** sau trận PvP; là tác giả nội dung forum. |
| **Cộng tác** | GameRoom, GameMatch, ForumPost, ForumComment, PostVote, CommentVote |

*Bảng 2.5.4-2 — Thẻ CRC mô tả GameRoom*

| | |
| :--- | :--- |
| **Lớp** | GameRoom |
| **Trách nhiệm** | Tạo mã phòng, quản lý chủ/khách và trạng thái phòng; khởi tạo/kết thúc giai đoạn chờ, setup, trong trận; liên kết tới trận hiện tại; hỗ trợ tái đấu hoặc đóng phòng. |
| **Cộng tác** | User, GameMatch, SpectatorSession |

*Bảng 2.5.4-3 — Thẻ CRC mô tả GameMatch*

| | |
| :--- | :--- |
| **Lớp** | GameMatch |
| **Trách nhiệm** | Quản lý setup tàu, lượt bắn, kết quả ô; xác định thắng/thua, đầu hàng; ghi nhận phiếu rematch; kết thúc trận và kích hoạt cập nhật Elo (PvP). |
| **Cộng tác** | GameRoom, GameMove, User |

*Bảng 2.5.4-4 — Thẻ CRC mô tả GameMove*

| | |
| :--- | :--- |
| **Lớp** | GameMove |
| **Trách nhiệm** | Ghi nhận một nước bắn hợp lệ; cập nhật trạng thái bàn cờ logic; phục vụ lịch sử trận và reconnect. |
| **Cộng tác** | GameMatch, User |

*Bảng 2.5.4-5 — Thẻ CRC mô tả ForumPost*

| | |
| :--- | :--- |
| **Lớp** | ForumPost |
| **Trách nhiệm** | Tạo, sửa (tác giả), lưu trữ bài; hiển thị danh sách và tìm kiếm; tổng hợp điểm vote và số comment. |
| **Cộng tác** | User, ForumComment, PostVote |

*Bảng 2.5.4-6 — Thẻ CRC mô tả ForumComment*

| | |
| :--- | :--- |
| **Lớp** | ForumComment |
| **Trách nhiệm** | Thêm/sửa bình luận dưới bài đang hiển thị; gắn với tác giả và thời điểm. |
| **Cộng tác** | User, ForumPost, CommentVote |

*Bảng 2.5.4-7 — Thẻ CRC mô tả PostVote*

| | |
| :--- | :--- |
| **Lớp** | PostVote |
| **Trách nhiệm** | Ghi nhận up/down vote; hủy khi bầu trùng chiều; đổi chiều khi bầu ngược; cập nhật điểm tổng trên bài. |
| **Cộng tác** | User, ForumPost |

*Bảng 2.5.4-8 — Thẻ CRC mô tả CommentVote*

| | |
| :--- | :--- |
| **Lớp** | CommentVote |
| **Trách nhiệm** | Tương tự PostVote nhưng áp dụng cho **bình luận**. |
| **Cộng tác** | User, ForumComment |

*Bảng 2.5.4-9 — Thẻ CRC mô tả SpectatorSession*

| | |
| :--- | :--- |
| **Lớp** | SpectatorSession |
| **Trách nhiệm** | Cho phép user đã đăng nhập xem trận realtime; nhận snapshot ẩn tàu; rời kênh khi đóng trang hoặc hết trận. |
| **Cộng tác** | User, GameRoom, GameMatch, SpectatorChatMessage |

*Bảng 2.5.4-10 — Thẻ CRC mô tả SpectatorChatMessage*

| | |
| :--- | :--- |
| **Lớp** | SpectatorChatMessage |
| **Trách nhiệm** | Gửi/nhận tin trên kênh khán giả; giới hạn độ dài; lưu lịch sử ngắn có TTL. |
| **Cộng tác** | SpectatorSession, GameRoom |

*Bảng 2.5.4-11 — Thẻ CRC mô tả BotOpponent*

| | |
| :--- | :--- |
| **Lớp** | BotOpponent |
| **Trách nhiệm** | Sinh nước bắn theo mức Easy/Hard; duy trì trạng thái bàn bot; không ghi nhận Elo server. |
| **Cộng tác** | User (người chơi, phía client) |

### 2.5.5 Sơ đồ lớp (PlantUML) — minh họa kiến trúc

Các hình sau bổ sung **chi tiết kỹ thuật** (thực thể ánh xạ CSDL, cổng lưu người dùng, lớp điều phối REST/WebSocket) — có thể đặt trong báo cáo như **phụ lục hình** hoặc **mức triển khai**.

*Hình 2.5-1 — Sơ đồ thực thể dữ liệu và quan hệ (CSDL quan hệ)*

#### CD-01 — Thực thể dữ liệu (CSDL quan hệ)

```plantuml
<<<CD01>>>
```

*Hình 2.5-2 — Miền người dùng (auth) và cổng truy cập kho lưu*

#### CD-02 — Domain `User` & repository port

```plantuml
<<<CD02>>>
```

*Hình 2.5-3 — Lớp điều phối: API REST, WebSocket và dịch vụ ứng dụng*

#### CD-03 — Controller / Gateway / Service & DI

```plantuml
<<<CD03>>>
```

