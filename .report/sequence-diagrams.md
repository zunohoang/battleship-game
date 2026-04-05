# Biểu đồ trình tự (Sequence Diagram) — Battleship Online

**Chuẩn:** **20** sequence diagram — `uml/seq_uc01.puml` … `uml/seq_uc20.puml`, tương ứng **UC01–UC20** trong `.docs/diagram.md`.

**Bổ sung (mục 8 Settings, không đánh số UC):** `uml/seq_settings.puml`.

**Render:**

```bash
cd .report
java -jar plantuml.jar -charset UTF-8 uml/seq_uc*.puml uml/seq_settings.puml
```

**Quy ước trong sơ đồ:**

- **REST:** `Auth API`, `Users API`, `Forum API`, `Leaderboard API`, `Game History API` — gọi qua HTTP với method và path gợi ý.
- **Realtime:** `Game Gateway` — Socket.IO (`emit` / event `server:*`), phòng/trận/spectator/chat.
- **Lưu trữ:** `PostgreSQL` cho entity chính; **Redis** cho chat spectator (UC15).
- **UC20 (Bot):** chỉ **Client** + **BotEngine** (offline), không server game.

**Nhúng trong tài liệu:** toàn bộ nội dung được nhúng lại trong `.docs/diagram.md` (mục **Phần III**). Sau khi sửa file `.puml`, chạy lại:

`py .report/scripts/patch_diagram_part3.py`

(script sẽ **thêm trùng** Phần III nếu chạy khi đã có — nên chỉnh tay hoặc xóa Phần III cũ trước khi chạy lại; có thể cải tiến script sau).

---

## Mục lục file

| File | UC / mục |
|------|-----------|
| seq_uc01.puml | UC01 Đăng ký |
| seq_uc02.puml | UC02 Đăng nhập |
| seq_uc03.puml | UC03 Refresh token |
| seq_uc04.puml | UC04 Đăng xuất |
| seq_uc05.puml | UC05 Đổi MK |
| seq_uc06.puml | UC06 Hồ sơ |
| seq_uc07.puml | UC07 Tạo phòng (WS) |
| seq_uc08.puml | UC08 Join phòng |
| seq_uc09.puml | UC09 Xếp tàu + start |
| seq_uc10.puml | UC10 Bắn + Elo |
| seq_uc11.puml | UC11 Forfeit |
| seq_uc12.puml | UC12 Rematch |
| seq_uc13.puml | UC13 Reconnect |
| seq_uc14.puml | UC14 Spectate |
| seq_uc15.puml | UC15 Chat spectator |
| seq_uc16.puml | UC16 Leaderboard |
| seq_uc17.puml | UC17 Lịch sử |
| seq_uc18.puml | UC18 Forum |
| seq_uc19.puml | UC19 Vote |
| seq_uc20.puml | UC20 Bot offline |
| seq_settings.puml | Settings client |

Xem thêm: [state-diagrams.md](state-diagrams.md), [class-diagrams.md](class-diagrams.md).
