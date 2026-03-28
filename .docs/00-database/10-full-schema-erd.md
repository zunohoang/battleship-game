# ERD — Toàn bộ cơ sở dữ liệu (PostgreSQL)

## Phạm vi

Mô tả **tất cả bảng** mà backend TypeORM đang dùng: **auth / game online / forum**, gồm các chỉnh sửa gần đây (**`users.elo`**, **`game_matches.eloSettled`** cho xếp hạng ELO và leaderboard).

**Lưu ý kỹ thuật:** Trong mã nguồn **không khai báo `@ManyToOne` / FK constraint** trên Postgres; các cột `…Id` là **khóa ngoại logic** — toàn vẹn dữ liệu do tầng ứng dụng đảm bảo.

## Sơ đồ quan hệ (Mermaid)

```mermaid
erDiagram
  users ||--o{ game_rooms : "ownerId"
  users ||--o{ game_rooms : "guestId"
  users ||--o{ game_matches : "player1Id player2Id winnerId turnPlayerId"
  users ||--o{ game_moves : "playerId"
  users ||--o{ forum_posts : "authorId"
  users ||--o{ forum_comments : "authorId"
  users ||--o{ forum_post_votes : "userId"
  users ||--o{ forum_comment_votes : "userId"

  game_rooms ||--o{ game_matches : "roomId"
  game_rooms }o--o| game_matches : "currentMatchId"

  game_matches ||--o{ game_moves : "matchId"

  forum_posts ||--o{ forum_comments : "postId"
  forum_posts ||--o{ forum_post_votes : "postId"
  forum_comments ||--o{ forum_comment_votes : "commentId"

  users {
    uuid id PK
    varchar email UK
    varchar username UK
    varchar passwordHash
    text avatar
    varchar signature
    int elo "default 800, leaderboard"
    text refreshTokenHash
    bigint refreshTokenAbsoluteExpiry
    timestamptz createdAt
    timestamptz updatedAt
  }

  game_rooms {
    uuid id PK
    varchar code UK
    varchar status
    varchar visibility
    uuid ownerId "FK logic users"
    uuid guestId "FK logic users"
    uuid currentMatchId "FK logic game_matches"
    boolean ownerReady
    boolean guestReady
    timestamptz expiresAt
    timestamptz createdAt
    timestamptz updatedAt
  }

  game_matches {
    uuid id PK
    uuid roomId "FK logic game_rooms"
    varchar status
    jsonb boardConfig
    jsonb ships
    int turnTimerSeconds
    uuid player1Id "FK logic users"
    uuid player2Id "FK logic users"
    jsonb player1Placements
    jsonb player2Placements
    jsonb player1Shots
    jsonb player2Shots
    uuid turnPlayerId
    uuid winnerId
    timestamptz setupDeadlineAt
    timestamptz turnDeadlineAt
    int version
    jsonb rematchVotes
    boolean eloSettled "ELO đã cập nhật"
    timestamptz createdAt
    timestamptz updatedAt
  }

  game_moves {
    uuid id PK
    uuid matchId "FK logic game_matches"
    uuid playerId "FK logic users"
    int x
    int y
    boolean isHit
    int sequence
    varchar clientMoveId
    timestamptz createdAt
  }

  forum_posts {
    uuid id PK
    uuid authorId "FK logic users"
    varchar title
    text content
    int voteScore
    int commentCount
    varchar status
    timestamptz createdAt
    timestamptz updatedAt
  }

  forum_comments {
    uuid id PK
    uuid postId "FK logic forum_posts"
    uuid authorId "FK logic users"
    text content
    int voteScore
    timestamptz createdAt
    timestamptz updatedAt
  }

  forum_post_votes {
    uuid postId PK_FK
    uuid userId PK_FK
    smallint value
    timestamptz createdAt
  }

  forum_comment_votes {
    uuid commentId PK_FK
    uuid userId PK_FK
    smallint value
    timestamptz createdAt
  }
```

## Bảng và migration nguồn

| Bảng (Postgres)        | Mục đích ngắn gọn                          | Migration / entity |
|------------------------|--------------------------------------------|--------------------|
| `users`                | Tài khoản, profile, session refresh, **ELO** | `1773446400000-InitUsersTable`, **`1773446400007`** (thêm `elo`) |
| `game_rooms`           | Phòng chờ / setup / trận                 | `1773446400001-InitGameTables` |
| `game_matches`         | Trận, JSON trạng thái bàn, **eloSettled**  | `1773446400001`, …, **`1773446400007`** |
| `game_moves`           | Lịch sử nước đi (audit)                    | `1773446400001` |
| `forum_posts`          | Bài viết forum                             | `1773446400006-InitForumTables` |
| `forum_comments`       | Bình luận                                  | `1773446400006` |
| `forum_post_votes`     | Vote bài (composite PK postId + userId)    | `1773446400006` |
| `forum_comment_votes`  | Vote comment                               | `1773446400006` |

Các migration bổ sung timer/setup: `1773446400002` … `1773446400005` (cột deadline / timer trên `game_matches`), không tạo bảng mới.

## Cột liên quan ELO / leaderboard (cập nhật ERD)

- **`users.elo`** (`integer`, mặc định **800**): điểm xếp hạng; dùng cho API leaderboard và auth payload.
- **`game_matches.eloSettled`** (`boolean`, mặc định **false**): đánh dấu đã áp dụng công thức Elo cho trận kết thúc (tránh xử lý trùng).

**Rank tier** (Apprentice … Ocean Conqueror) **không lưu DB** — suy ra từ `elo` trên server/client.

## Nguồn mã (entity TypeORM)

- `server/src/auth/infrastructure/persistence/relational/entities/user.entity.ts`
- `server/src/game/infrastructure/persistence/relational/entities/room.entity.ts`
- `server/src/game/infrastructure/persistence/relational/entities/match.entity.ts`
- `server/src/game/infrastructure/persistence/relational/entities/move.entity.ts`
- `server/src/forum/infrastructure/persistence/relational/entities/forum-post.entity.ts`
- `server/src/forum/infrastructure/persistence/relational/entities/forum-comment.entity.ts`
- `server/src/forum/infrastructure/persistence/relational/entities/forum-post-vote.entity.ts`
- `server/src/forum/infrastructure/persistence/relational/entities/forum-comment-vote.entity.ts`

## Giả định và giới hạn

- Một `game_room` có thể có **nhiều** `game_matches` theo thời gian (rematch); `currentMatchId` trỏ tới trận hiện tại khi có.
- Bảng `migrations` do TypeORM quản lý, không vẽ trong ERD nghiệp vụ.
- File upload avatar lưu trên đĩa (`uploads/`), URL tham chiếu trong `users.avatar`.

## Liên kết ERD theo domain (cũ, chi tiết từng phần)

- Online match + moves: `.docs/07-online-match-lifecycle/10-erd.md`
- Các domain khác: `.docs/*/10-erd.md` (phạm vi hẹp hơn tài liệu này).
