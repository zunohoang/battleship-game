# Biểu đồ lớp (Class diagram) — tài liệu thiết kế

Các sơ đồ mô tả **kiến trúc logic dự kiến** (phân tích — thiết kế), không phải tài liệu đọc song song từng file mã nguồn.

**Bản trình bày đầy đủ (mục tiêu, CRC, sơ đồ nhúng):** [.docs/diagram.md](../.docs/diagram.md) — **Phần IV**.

## File PlantUML (để vẽ / chỉnh sửa riêng)

| File | Nội dung |
| --- | --- |
| [cd_persistence_entities.puml](uml/cd_persistence_entities.puml) | Thực thể CSDL & quan hệ |
| [cd_domain_auth.puml](uml/cd_domain_auth.puml) | Miền User & cổng kho |
| [cd_application_layer.puml](uml/cd_application_layer.puml) | REST, WebSocket, dịch vụ |

## Render (tùy chọn)

```bash
cd .report
java -jar plantuml.jar -charset UTF-8 uml/cd_persistence_entities.puml uml/cd_domain_auth.puml uml/cd_application_layer.puml
```

Sau khi sửa `.puml`, có thể đồng bộ lại khối PlantUML trong `diagram.md` bằng `scripts/patch_diagram_part4.py` (đọc `scripts/part4_for_patch.md` + ba file `.puml`; xóa Phần IV cũ trong `diagram.md` trước khi chạy lại). Khi sửa lời văn 2.5.x / CRC, cập nhật `part4_for_patch.md` cho khớp.

## Liên quan

- [state-diagrams.md](state-diagrams.md)
- [sequence-diagrams.md](sequence-diagrams.md)
