# Biểu đồ trạng thái (State Diagram) — Battleship Online

**Chuẩn chính:** **20** state machine, **mỗi UC một file** — `uml/state_uc01.puml` … `uml/state_uc20.puml`, bám mô tả UC trong `.docs/diagram.md` / `use-case-diagrams.md`.

**Cài đặt (mục 8, không đánh số UC):** `uml/st09_settings.puml`.

**Render:**

```bash
cd .report
java -jar plantuml.jar -charset UTF-8 uml/state_uc*.puml uml/st09_settings.puml
```

---

## Mục lục (20 UC + Settings)

| File | UC / phạm vi |
|------|----------------|
| [state_uc01.puml](uml/state_uc01.puml) | UC01 — Đăng ký tài khoản |
| [state_uc02.puml](uml/state_uc02.puml) | UC02 — Đăng nhập |
| [state_uc03.puml](uml/state_uc03.puml) | UC03 — Làm mới token |
| [state_uc04.puml](uml/state_uc04.puml) | UC04 — Đăng xuất |
| [state_uc05.puml](uml/state_uc05.puml) | UC05 — Đổi mật khẩu |
| [state_uc06.puml](uml/state_uc06.puml) | UC06 — Cập nhật hồ sơ |
| [state_uc07.puml](uml/state_uc07.puml) | UC07 — Tạo phòng |
| [state_uc08.puml](uml/state_uc08.puml) | UC08 — Tham gia phòng |
| [state_uc09.puml](uml/state_uc09.puml) | UC09 — Xếp tàu & bắt đầu trận |
| [state_uc10.puml](uml/state_uc10.puml) | UC10 — Thực hiện nước đi (bắn) |
| [state_uc11.puml](uml/state_uc11.puml) | UC11 — Đầu hàng |
| [state_uc12.puml](uml/state_uc12.puml) | UC12 — Tái đấu (rematch) |
| [state_uc13.puml](uml/state_uc13.puml) | UC13 — Kết nối lại |
| [state_uc14.puml](uml/state_uc14.puml) | UC14 — Spectate |
| [state_uc15.puml](uml/state_uc15.puml) | UC15 — Chat khán giả |
| [state_uc16.puml](uml/state_uc16.puml) | UC16 — Bảng xếp hạng Elo |
| [state_uc17.puml](uml/state_uc17.puml) | UC17 — Lịch sử trận |
| [state_uc18.puml](uml/state_uc18.puml) | UC18 — Forum đăng bài / bình luận |
| [state_uc19.puml](uml/state_uc19.puml) | UC19 — Vote |
| [state_uc20.puml](uml/state_uc20.puml) | UC20 — Chơi với Bot (offline) |
| [st09_settings.puml](uml/st09_settings.puml) | Settings (mục 8) |

---

## Phụ lục: sơ đồ gom (tùy chọn)

Các file `st01_room.puml` … `st08_forum_vote.puml` là **bản tổng hợp** theo thực thể (phòng, trận, phiên, …), có thể dùng khi cần một diagram ít trạng thái hơn. Không thay cho **20** file `state_uc*.puml` khi báo cáo yêu cầu đủ UC.

Biểu đồ lớp backend: [class-diagrams.md](class-diagrams.md) · sequence: [sequence-diagrams.md](sequence-diagrams.md).
