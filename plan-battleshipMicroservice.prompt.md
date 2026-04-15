## Plan: Tách Monolith sang 4 Microservices (gRPC-first)

Mục tiêu là chuyển hệ thống hiện tại sang 4 service độc lập AuthService, AccountService, GameService, ForumService theo hướng an toàn khi rollout: giữ nguyên contract phía client, dùng Nginx Gateway cho client-facing HTTP/WebSocket, DB tách riêng theo từng service, và ưu tiên gRPC cho service-to-service.

**Các bước triển khai**
1. Phase 0 - Baseline và khóa API contract  
1. Chốt toàn bộ API contract hiện client đang gọi, để trong suốt migration frontend không bị vỡ.  
1. Bổ sung quan sát vận hành tối thiểu: health endpoint, correlation/request id, log tập trung.

1. Phase 1 - Tách ranh giới domain ngay trong monolith  
1. Làm rõ ownership theo 4 miền Auth, Account, Game, Forum.  
1. Gỡ coupling trực tiếp giữa module (đặc biệt phụ thuộc entity user từ module khác).  
1. Tạo domain events cho các điểm nóng như MatchFinished, UserProfileUpdated, UserDeleted.

1. Phase 1.5 - Chuẩn hóa contract gRPC  
1. Tạo thư mục contract dùng chung, ví dụ: proto/auth, proto/account, proto/game, proto/forum.  
1. Định nghĩa proto cho các luồng sync quan trọng: ValidateToken, GetUserById, GetUserProfile, GetRoomState, CreateForumPost.  
1. Quy ước versioning proto (v1, backward-compatible, không phá vỡ field cũ).  
1. Sinh stub/client tự động cho từng service và tích hợp vào pipeline build.

1. Phase 2 - Dựng 4 service + API Gateway  
1. Tạo 4 app NestJS chạy độc lập và đóng gói image riêng.  
1. Cấu hình Nginx Gateway route theo nhóm:  
1. /api/auth/* -> AuthService  
1. /api/account/* + profile -> AccountService  
1. /api/game/* + /api/socket.io -> GameService  
1. /api/forum/* -> ForumService  
1. Giữ client chỉ gọi 1 base URL qua gateway để giảm thay đổi frontend.
1. Bật gRPC server nội bộ cho từng service (port riêng, HTTP/2), chỉ expose trong network nội bộ.

1. Phase 3 - Tách database theo service (theo quyết định của bạn)  
1. Auth DB: users + auth artifacts.  
1. Account DB: profile/preferences (tham chiếu userId).  
1. Game DB: rooms/matches/moves.  
1. Forum DB: posts/comments/votes.  
1. Triển khai snapshot + incremental sync idempotent cho cutover.  
1. Loại bỏ join xuyên service, thay bằng API/read model.

1. Phase 4 - Giao tiếp Hybrid (gRPC + Event Bus)  
1. Dùng gRPC cho toàn bộ luồng sync nội bộ bắt buộc realtime/critical (ví dụ token validation, lấy profile, kiểm tra quyền user).  
1. Async event bus cho tách phụ thuộc nghiệp vụ và eventual consistency.  
1. Khuyến nghị RabbitMQ ở giai đoạn đầu để giảm độ phức tạp vận hành.  
1. Áp dụng outbox pattern để đảm bảo phát event tin cậy.
1. Chính sách timeout/retry/circuit-breaker cho gRPC client để tránh lỗi dây chuyền.

1. Phase 5 - Cutover an toàn  
1. Chuẩn hóa authN/authZ ở gateway và kiểm tra JWT ở từng service (defense-in-depth).  
1. Đồng bộ CORS/cookie/websocket handshake, bỏ wildcard origin cho websocket.  
1. Canary theo route group: Auth -> Forum -> Account -> Game realtime (cuối cùng).  
1. Chuẩn bị rollback theo từng route switch + checkpoint dữ liệu.
1. Canary gRPC call path nội bộ theo từng use-case trước khi chuyển hoàn toàn traffic sync.

1. Phase 6 - Hardening sau cutover  
1. Load test websocket fanout và write throughput của game.  
1. Kiểm tra consistency window giữa service.  
1. Chốt SLO/alerts/runbook vận hành.

**File trọng yếu cần bám khi implement**
- server/src/app.module.ts
- server/src/main.ts
- server/src/auth/auth.module.ts
- server/src/profile/profile.module.ts
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
- server/src/forum/forum.module.ts
- server/src/forum/forum.service.ts
- client/src/services/axios.ts
- client/src/services/interceptors.ts
- client/src/services/gameSocketService.ts
- docker-compose.yml
- docker-compose.prod.yml
- .env.production.example

**Verification bắt buộc**
1. Contract test: toàn bộ call từ client chạy qua gateway không đổi behavior.  
2. Proto compatibility test: đảm bảo client/server gRPC tương thích ngược khi deploy lệch version.  
2. Integration test từng service: auth refresh, account profile, forum CRUD, game lifecycle.  
3. Realtime test: multi-instance GameService + Redis adapter vẫn broadcast đúng room.  
4. Data validation: row count/checksum trước-sau migration theo từng DB.  
5. Resilience test: kill 1 service, kiểm tra gateway timeout/retry/failure isolation.  
6. Security test: JWT, refresh cookie, CORS, websocket handshake.  
7. gRPC resilience test: timeout, retry, circuit-breaker, idempotency cho RPC quan trọng.

## Notes for refinement
- Gateway: Nginx API Gateway cho initial rollout.
- Database strategy: mỗi service 1 DB ngay từ phase migration.
- Communication: Hybrid (sync gRPC + async event bus).
- gRPC-first scope: service-to-service call mặc định là gRPC, HTTP chỉ dành cho external client qua gateway.
- Scope hiện tại chưa bao gồm full Kubernetes manifests và full CI/CD rewrite.