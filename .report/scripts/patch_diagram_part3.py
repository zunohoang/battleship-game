# -*- coding: utf-8 -*-
"""Insert Phần III (sequence diagrams) before ## Tóm tắt in .docs/diagram.md."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / ".docs" / "diagram.md"
UML = ROOT / ".report" / "uml"

UC_TITLES = {
    1: "Đăng ký tài khoản",
    2: "Đăng nhập",
    3: "Làm mới token (Token Refresh)",
    4: "Đăng xuất",
    5: "Đổi mật khẩu",
    6: "Cập nhật hồ sơ",
    7: "Tạo phòng",
    8: "Tham gia phòng",
    9: "Xếp tàu & bắt đầu trận",
    10: "Thực hiện nước đi (bắn)",
    11: "Đầu hàng (Forfeit)",
    12: "Tái đấu (Rematch)",
    13: "Kết nối lại (Reconnect)",
    14: "Xem trận đấu (Spectate)",
    15: "Chat kênh khán giả",
    16: "Xem bảng xếp hạng Elo",
    17: "Xem lịch sử trận đấu",
    18: "Đăng bài & bình luận diễn đàn",
    19: "Bình chọn (Vote)",
    20: "Chơi với Bot (Offline)",
}


def build_part3() -> str:
    lines: list[str] = []
    lines.append("## Phần III — Biểu đồ trình tự (Sequence) theo use case")
    lines.append("")
    lines.append(
        "> **Đủ 20 sequence diagram:** mỗi **UC01–UC20** một sơ đồ tương tác (actor ↔ client ↔ API / Gateway ↔ DB / Redis). "
        "Có **luồng chính** và **nhánh lỗi / ngoại lệ** chính theo mô tả UC. File nguồn: `.report/uml/seq_uc01.puml` … `seq_uc20.puml`."
    )
    lines.append("")
    lines.append(
        "> **Công cụ render:** [PlantUML sequence](https://plantuml.com/sequence-diagram). "
        "`java -jar .report/plantuml.jar -charset UTF-8 .report/uml/seq_uc*.puml .report/uml/seq_settings.puml`"
    )
    lines.append("")
    lines.append(
        "**Quy ước:** HTTP REST dùng **POST/GET/PATCH**; realtime game/spectate dùng **Socket.IO** (`emit` / `server:*`). "
        "Thành phần `Game Gateway` gom xử lý phòng/trận WebSocket. **Settings** (mục 8): thêm `seq_settings.puml` (chỉ client + localStorage)."
    )
    lines.append("")
    lines.append("### Bảng: UC → file sequence diagram")
    lines.append("")
    lines.append("| UC | Tên | File |")
    lines.append("| --- | --- | --- |")
    for n in range(1, 21):
        nn = f"{n:02d}"
        lines.append(f"| UC{nn} | {UC_TITLES[n]} | `.report/uml/seq_uc{nn}.puml` |")
    lines.append("| Settings (mục 8) | Cài đặt client | `.report/uml/seq_settings.puml` |")
    lines.append("")

    for n in range(1, 21):
        nn = f"{n:02d}"
        body = (UML / f"seq_uc{nn}.puml").read_text(encoding="utf-8").strip()
        lines.append(f"### Sequence — UC{nn} — {UC_TITLES[n]}")
        lines.append("")
        lines.append("```plantuml")
        lines.append(body)
        lines.append("```")
        lines.append("")

    lines.append("### Sequence bổ sung — Settings (không đánh số UC)")
    lines.append("")
    lines.append("```plantuml")
    lines.append((UML / "seq_settings.puml").read_text(encoding="utf-8").strip())
    lines.append("```")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    text = DOCS.read_text(encoding="utf-8")
    if "## Phần III — Biểu đồ trình tự (Sequence)" in text:
        raise SystemExit("diagram.md already contains Phần III; remove it manually before re-patching.")
    needle = (
        "\n---\n\n## Tóm tắt quan hệ «include» / «extend» toàn hệ thống"
    )
    if needle not in text:
        raise SystemExit("Anchor not found: " + repr(needle))
    idx = text.index(needle)
    insert = "\n---\n\n" + build_part3() + needle
    new_text = text[:idx] + insert
    DOCS.write_text(new_text, encoding="utf-8", newline="\n")
    print("OK:", DOCS)


if __name__ == "__main__":
    main()
