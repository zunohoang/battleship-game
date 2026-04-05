# -*- coding: utf-8 -*-
"""Replace Phần II in .docs/diagram.md with 20 per-UC state machines + optional Settings."""
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


def build_part2() -> str:
    lines = []
    lines.append("## Phần II — Biểu đồ trạng thái (State) theo use case")
    lines.append("")
    lines.append(
        "> **Đủ 20 state machine:** một sơ đồ riêng cho từng **UC01–UC20** "
        "(nhúng dưới đây và trong `.report/uml/state_uc01.puml` … `state_uc20.puml`)."
    )
    lines.append("")
    lines.append(
        "> **Công cụ render:** [PlantUML state](https://plantuml.com/state-diagram). "
        "Render hàng loạt: `java -jar .report/plantuml.jar -charset UTF-8 .report/uml/state_uc*.puml`."
    )
    lines.append("")
    lines.append(
        "Mỗi **UC** có **một** biểu đồ trạng thái riêng (luồng chính + nhánh lỗi/ngoại lệ theo mô tả trong Phần I). "
        "**Cài đặt (mục 8)** không nằm trong UC01–UC20; bổ sung cuối Phần II: `st09_settings.puml`."
    )
    lines.append("")
    lines.append("### Bảng: UC → file state machine")
    lines.append("")
    lines.append("| UC | Tên | File |")
    lines.append("| --- | --- | --- |")
    for n in range(1, 21):
        nn = f"{n:02d}"
        lines.append(
            f"| UC{nn} | {UC_TITLES[n]} | `.report/uml/state_uc{nn}.puml` |"
        )
    lines.append("| Settings (mục 8) | Cài đặt client | `.report/uml/st09_settings.puml` |")
    lines.append("")

    for n in range(1, 21):
        nn = f"{n:02d}"
        p = UML / f"state_uc{nn}.puml"
        body = p.read_text(encoding="utf-8").strip()
        lines.append(f"### State machine — UC{nn} — {UC_TITLES[n]}")
        lines.append("")
        lines.append("```plantuml")
        lines.append(body)
        lines.append("```")
        lines.append("")

    lines.append("### State machine bổ sung — Cài đặt (Settings), không đánh số UC")
    lines.append("")
    lines.append("```plantuml")
    lines.append((UML / "st09_settings.puml").read_text(encoding="utf-8").strip())
    lines.append("```")
    lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    text = DOCS.read_text(encoding="utf-8")
    start = text.index("## Phần II — Biểu đồ trạng thái")
    sep = "\n---\n\n## Tóm tắt quan hệ"
    end = text.index(sep)
    new_text = text[:start] + build_part2() + text[end + len("\n---\n\n") :]
    DOCS.write_text(new_text, encoding="utf-8", newline="\n")
    print("Patched", DOCS)


if __name__ == "__main__":
    main()
