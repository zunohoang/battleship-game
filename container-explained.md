# Tại sao cần từng container? — Giải thích từ gốc rễ

> Tài liệu này giải thích từng service trong local stack: nó làm gì, vì sao cần, và nếu bỏ đi thì sao.

---

## 1. PostgreSQL 16

### Nó làm gì?
Hệ quản trị cơ sở dữ liệu quan hệ (RDBMS). Lưu trữ toàn bộ dữ liệu có cấu trúc của ứng dụng: users, orders, transactions, config, v.v.

### Tại sao là PostgreSQL, không phải MySQL hay SQLite?
| Tiêu chí | PostgreSQL | MySQL | SQLite |
|---|---|---|---|
| JSONB native | ✅ Tốt nhất | Hạn chế | ❌ |
| Row-Level Security | ✅ | ❌ | ❌ |
| Partial index | ✅ | ❌ | ❌ |
| Full-text search | ✅ tích hợp | Hạn chế | ❌ |
| Multi-tenant RLS | ✅ | ❌ | ❌ |
| Extensions ecosystem | ✅ Rất lớn | Ít hơn | ❌ |

PostgreSQL là lựa chọn duy nhất nếu xây dựng hệ thống multi-tenant, cần RLS, hoặc cần JSONB để lưu dữ liệu bán cấu trúc (audit log, metadata, config động).

### Tại sao cần config `postgresql.conf` riêng?
Config mặc định của PostgreSQL trong Docker được tuning cho máy **256 MB RAM** — tức là không phù hợp với bất kỳ máy dev nào thực tế. Nếu không custom:
- `shared_buffers` mặc định = 128 MB → cache quá nhỏ, query hit disk liên tục
- `work_mem` mặc định = 4 MB → sort/hash join spill ra disk, query chậm
- `autovacuum` quá thụ động → bloat tích lũy dần, table phình to

Config best-practice tăng hiệu năng **3–10x** trên cùng phần cứng chỉ bằng cách đặt đúng tham số.

### Nếu bỏ đi thì sao?
Ứng dụng không có nơi lưu data — không chạy được. Đây là **core dependency** của toàn bộ stack.

---

## 2. PgBouncer

### Nó làm gì?
**Connection pooler** đứng trước PostgreSQL. Thay vì mỗi request từ app tạo một kết nối mới đến PG, tất cả kết nối đi qua PgBouncer — nơi quản lý một pool kết nối cố định và tái sử dụng chúng.

### Tại sao cần?
PostgreSQL xử lý mỗi kết nối bằng **một process riêng** (fork model). Mỗi process chiếm ~5–10 MB RAM. Với 200 client kết nối đồng thời:
```
200 connections × 8 MB = 1.6 GB RAM chỉ để giữ kết nối
```
Đó là lý do `max_connections = 100` trong PostgreSQL config — giữ thấp để PG không chết vì connection overhead.

PgBouncer giải quyết bằng cách:
```
1000 client connections → PgBouncer → 20 PG connections
```
App nghĩ nó đang có 1000 connections. PG chỉ thấy 20.

### Transaction mode vs Session mode
- **Session mode**: 1 client = 1 PG connection trong suốt session. Ít lợi ích.
- **Transaction mode** *(dùng trong stack này)*: PG connection chỉ bị giữ trong thời gian một transaction. Sau khi commit, connection trả về pool ngay. Phù hợp với stateless API.

### Nếu bỏ đi thì sao?
Với hệ thống nhỏ (<50 concurrent users) thì chưa thấy vấn đề. Nhưng khi scale lên, thiếu PgBouncer là nguyên nhân phổ biến nhất khiến PostgreSQL **chết vì quá tải connection** dù CPU/RAM còn thừa nhiều.

---

## 3. Dragonfly

### Nó làm gì?
In-memory data store — tương thích hoàn toàn với Redis protocol. Dùng để:
- **Cache**: lưu kết quả query tốn kém, tránh hit database
- **Session store**: JWT blacklist, user session
- **Rate limiting**: đếm request theo IP/user trong sliding window
- **Pub/Sub**: real-time event giữa các service
- **Distributed lock**: tránh race condition khi scale nhiều instance

### Tại sao Dragonfly mà không phải Redis?
| Tiêu chí | Redis | Dragonfly |
|---|---|---|
| Protocol compatible | — | ✅ 100% drop-in |
| Architecture | Single-threaded | Multi-threaded |
| Throughput | ~100K ops/s | ~4M ops/s |
| Memory efficiency | Baseline | ~25% ít hơn |
| License | BSL (hạn chế) | BSL nhưng dễ dùng hơn |

Với team nhỏ và máy dev, Dragonfly chạy nhanh hơn Redis, cấu hình đơn giản hơn, và không cần Redis Cluster khi cần scale.

### Vì sao không dùng PostgreSQL để cache?
PostgreSQL có thể làm cache nhưng mọi query vẫn phải qua disk I/O, parser, planner. In-memory store trả về data trong **microseconds**, so với PostgreSQL là **milliseconds**. Đối với rate limiting hay session check — gọi hàng nghìn lần/giây — sự khác biệt này là tường hay thủng.

### Nếu bỏ đi thì sao?
Mọi thứ vẫn chạy nhưng:
- Không có cache → mọi request đều hit database → PG quá tải khi có traffic
- Không có rate limiting → API bị abuse
- Session management phức tạp hơn nhiều

---

## 4. OpenObserve

### Nó làm gì?
**Unified observability platform** — một nơi duy nhất để xem:
- **Logs**: mọi log từ app, database, infrastructure
- **Metrics**: CPU, RAM, request rate, error rate, latency
- **Traces**: distributed tracing (OpenTelemetry)
- **Dashboards**: visualize tất cả trên cùng giao diện

### Tại sao không chỉ dùng `docker logs`?
`docker logs` chỉ xem được log của một container tại một thời điểm. Khi có vấn đề thực tế:
- Lỗi xảy ra ở đâu trong chuỗi: App → PgBouncer → PostgreSQL → RabbitMQ?
- Lỗi này đã xảy ra bao nhiêu lần trong 24 giờ qua?
- Latency tăng từ lúc nào? Tương quan với deployment nào?

Không có observability tập trung, những câu hỏi này mất **hàng giờ** để debug thay vì **vài phút**.

### Tại sao OpenObserve mà không phải ELK Stack hay Grafana?
| Tiêu chí | ELK (Elastic + Kibana) | Grafana Stack | OpenObserve |
|---|---|---|---|
| RAM tối thiểu | ~4 GB | ~2 GB | ~200 MB |
| Setup complexity | Cao | Trung bình | Thấp |
| Logs + Metrics + Traces | Cần nhiều tool | Cần nhiều tool | Tích hợp sẵn |
| Chi phí storage | Cao | Trung bình | Thấp (compressed) |

Cho local dev, ELK ăn hết RAM máy. OpenObserve cho cùng chức năng với tài nguyên nhỏ hơn 10–20 lần.

### Nếu bỏ đi thì sao?
Vẫn chạy được. Nhưng khi có bug production, sẽ debug mù — chỉ có `console.log` và `docker logs`. Trả giá bằng thời gian debug gấp 3–5 lần.

---

## 5. MinIO

### Nó làm gì?
**Object storage** tương thích với AWS S3 API. Lưu trữ:
- File upload từ user (ảnh, PDF, hợp đồng, chứng từ)
- Export file (Excel, báo cáo PDF)
- Backup database
- Static assets không cần CDN

### Tại sao không lưu file vào PostgreSQL?
PostgreSQL có thể lưu file qua `BYTEA` hoặc `Large Object`, nhưng:
- File nhị phân làm database phình to, VACUUM tốn kém
- Không có CDN, streaming, presigned URL
- Backup database kéo theo cả file → chậm, tốn dung lượng

### Tại sao không lưu file vào disk của app server?
Đây là **anti-pattern phổ biến nhất** của junior dev. Vấn đề:
- Scale lên 2 instance → instance nào có file?
- Container restart → volume không mount đúng → file mất
- Không có versioning, không có access control, không audit

MinIO giải quyết tất cả: S3-compatible API, presigned URL, bucket policy, versioning, và khi production sẵn sàng chuyển sang AWS S3 chỉ bằng cách đổi endpoint URL.

### Nếu bỏ đi thì sao?
Nếu app không có file upload thì không cần. Nếu có → phải dùng MinIO hoặc thứ tương đương, không có phương án "lưu vào disk" an toàn cho production.

---

## 6. ~~RabbitMQ~~ — Không cần, đã có Dragonfly Streams

### Vấn đề RabbitMQ giải quyết
Async message queue — tách tác vụ nặng ra khỏi request/response cycle:

```
User đặt hàng
  → API tạo order (50ms)
  → Đẩy event vào queue (2ms)
→ Response trả về sau 52ms ← user nhận ngay

[Background workers]
  → Worker A: gửi email xác nhận
  → Worker B: tạo invoice PDF
  → Worker C: trừ kho
```

### Tại sao RabbitMQ là một container thừa?

**Dragonfly đã tích hợp sẵn Redis Streams** — một cơ chế message queue đủ mạnh cho 95% use case business thông thường.

So sánh thẳng:

| Tiêu chí | RabbitMQ | Redis Streams (Dragonfly) |
|---|---|---|
| Container riêng | ✅ Thêm 1 service | ❌ Không cần — dùng Dragonfly sẵn có |
| At-least-once delivery | ✅ | ✅ Consumer Groups |
| Persistent messages | ✅ Durable queue | ✅ Lưu trong memory + AOF |
| Multiple consumers | ✅ | ✅ Consumer Groups |
| Message replay | ❌ Xóa sau khi ACK | ✅ Giữ lại theo `MAXLEN` |
| Dead Letter Queue | ✅ Native | ✅ Tự implement bằng stream riêng |
| Complex routing | ✅ Exchange/Binding | ❌ Không có — không cần với monolith |
| RAM overhead | ~150–300 MB | 0 MB thêm — đã có Dragonfly |
| Ops complexity | Cao (cluster, quorum) | Thấp — cùng client với cache |

### RabbitMQ thực sự cần khi nào?

RabbitMQ có lợi thế rõ ràng ở **2 trường hợp cụ thể**:

1. **Complex routing**: Fanout exchange, topic exchange, header-based routing — khi một event cần phân phối đến nhiều queue khác nhau theo rule phức tạp. Thường gặp ở microservices với nhiều domain riêng biệt.

2. **Multi-language, multi-team**: Khi có team khác (dùng Python, Java, Go) cần consume cùng queue. RabbitMQ có client library trưởng thành hơn ở một số ngôn ngữ.

**Với monolith hoặc modular monolith** — cả stack trong cùng một codebase — không có use case nào ở trên áp dụng. Routing logic nằm trong code, không cần broker làm.

### Redis Streams hoạt động thế nào?

```
XADD orders * event_type order_created order_id 12345

# Consumer group đảm bảo at-least-once
XGROUP CREATE orders email-worker $ MKSTREAM
XREADGROUP GROUP email-worker worker-1 COUNT 10 STREAMS orders >

# ACK sau khi xử lý xong
XACK orders email-worker <message-id>

# Message chưa ACK sau 30s → retry
XAUTOCLAIM orders email-worker worker-1 30000 0-0
```

Toàn bộ luồng này — publish, consume, ACK, retry — dùng **cùng một Dragonfly instance** đang chạy cho cache và session. Không thêm container, không thêm port, không thêm monitoring riêng.

### Kết luận

> Thêm RabbitMQ vào stack vì "sợ sau này cần" là **over-engineering sớm**. Bắt đầu với Redis Streams trên Dragonfly. Nếu 12 tháng sau thực sự cần complex routing hay multi-team pub/sub thì lúc đó mới migrate — và migration từ Streams sang RabbitMQ không khó vì interface layer ở code đã tách biệt.

**Nguyên tắc**: Một container ít hơn = ít thứ fail hơn, ít thứ monitor hơn, ít thứ debug hơn.

---

## 7. Mailpit

### Nó làm gì?
**Fake SMTP server cho local dev**. Bắt tất cả email mà app gửi ra, hiển thị trong web UI — không gửi đến địa chỉ thật.

### Tại sao cần?
Khi dev local, app vẫn cần gửi email (OTP, xác nhận đăng ký, reset password). Không thể:
- Dùng SMTP thật → spam inbox thật, tốn tiền quota, lộ credential production
- Tắt gửi email → không test được flow đầy đủ

Mailpit nhận email, giữ lại, cho xem qua browser. Không cần config phức tạp, không cần account ngoài.

### Tại sao Mailpit mà không phải Mailhog?
Mailhog đã **không được maintain từ 2022**. Mailpit là successor hiện đại hơn: có search, có attachment preview, có API, UI đẹp hơn, hỗ trợ TLS.

### Nếu bỏ đi thì sao?
Phải mock toàn bộ email service trong code, hoặc dùng tài khoản SMTP thật — cả hai đều tệ hơn khi dev.

---

## Toàn cảnh stack — Mỗi container một vai trò

```
                         ┌─────────────┐
                         │  Your App   │
                         └──────┬──────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
    ┌─────▼──────┐   ┌──────────▼──────────┐   ┌──────▼──────┐
    │ PgBouncer  │   │      Dragonfly       │   │   Mailpit   │
    │ (pooling)  │   │  cache | session     │   │   (email)   │
    └─────┬──────┘   │  rate limit | queue  │   └─────────────┘
          │          │  (Redis Streams)      │
    ┌─────▼──────┐   └──────────┬───────────┘
    │ PostgreSQL │              │
    │  (source   │       ┌──────▼──────┐
    │  of truth) │       │   Workers   │
    └────────────┘       │  (consume   │
                         │   streams)  │
                         └─────────────┘

    ┌─────────────┐       ┌─────────────┐
    │    MinIO    │       │ OpenObserve │
    │  (files)    │       │  (observe)  │
    └─────────────┘       └─────────────┘
```

| Container | Vai trò | Thiếu thì sao |
|---|---|---|
| PostgreSQL | Source of truth — dữ liệu cấu trúc | App không chạy được |
| PgBouncer | Bảo vệ PG khỏi connection flood | Chết khi scale |
| Dragonfly | Cache + session + rate limit + **async queue (Streams)** | Chậm, không có bảo vệ, mất async |
| OpenObserve | Nhìn thấy toàn bộ hệ thống | Debug mù |
| MinIO | Lưu file đúng cách | Anti-pattern disk/DB |
| Mailpit | Email dev an toàn | Spam thật hoặc mock code |
| ~~RabbitMQ~~ | ~~Thay bằng Dragonfly Streams~~ | Không cần |
