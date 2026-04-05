# -*- coding: utf-8 -*-
"""Insert Phần IV (class diagrams + CRC) before ## Tóm tắt in .docs/diagram.md.

Nội dung markdown (2.5.1–2.5.5, CRC từng lớp, chú thích hình) lấy từ `part4_for_patch.md`;
các khối PlantUML được nhúng từ `.report/uml/cd_*.puml`.

Khi đổi cấu trúc Phần IV trong diagram.md: cập nhật `part4_for_patch.md` cho khớp, giữ ba khối
`<<<CD01>>>`, `<<<CD02>>>`, `<<<CD03>>>` trong fence ```plantuml (script sẽ thay bằng nội dung `.puml`).
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / ".docs" / "diagram.md"
UML = ROOT / ".report" / "uml"
PART4_TEMPLATE = Path(__file__).resolve().parent / "part4_for_patch.md"

MARKER = "\n\n---\n\n## Tóm tắt quan hệ «include» / «extend» toàn hệ thống"


def load_puml(name: str) -> str:
    return (UML / name).read_text(encoding="utf-8").strip()


def build_part4() -> str:
    tpl = PART4_TEMPLATE.read_text(encoding="utf-8")
    subs = {
        "<<<CD01>>>": load_puml("cd_persistence_entities.puml"),
        "<<<CD02>>>": load_puml("cd_domain_auth.puml"),
        "<<<CD03>>>": load_puml("cd_application_layer.puml"),
    }
    for key, val in subs.items():
        tpl = tpl.replace(key, val)
    return tpl.rstrip() + "\n"


def main() -> None:
    text = DOCS.read_text(encoding="utf-8")
    if "## Phần IV — Thiết kế lớp (Class diagram) & CRC" in text:
        raise SystemExit("diagram.md already contains Phần IV; remove it manually before re-patching.")
    if MARKER not in text:
        raise SystemExit("Marker not found for Tóm tắt section")
    idx = text.index(MARKER)
    new_text = text[:idx] + "\n\n---\n\n" + build_part4() + MARKER + text[idx + len(MARKER) :]
    DOCS.write_text(new_text, encoding="utf-8", newline="\n")
    print("OK:", DOCS)


if __name__ == "__main__":
    main()
