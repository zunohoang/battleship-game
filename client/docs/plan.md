# Client Features Summary

### Cập Nhật So Với Commit Trước

#### Tổng quan diff (client)
- 10 file đã sửa trong `client/src/**`
- 1 thư mục/file mới: `client/src/utils/authValidation.ts`

#### Thay đổi chính theo tính năng

1. Validation & error handling được chuẩn hóa theo error code
- Chuyển từ phân loại lỗi cũ sang `getApiErrorCode()` tại `services/httpError.ts`.
- Bổ sung utility validate dùng chung tại `utils/authValidation.ts`:
  - email, username, password, signature
  - trả về `errorCode` thống nhất để map i18n.
- `welcome.tsx` và `home.tsx` đều dùng chung validate utility trước khi gọi API.

2. Luồng auth trên UI được điều chỉnh
- Login/Register thành công từ `WelcomePage` điều hướng sang `HomePage`.
- Sau signup, `HomePage` tự mở `ProfileSetupModal` bằng `location.state` (`openProfileSetup`).
- Ẩn nút login/register trên Home khi đã có user trong global context.

3. Profile setup đã đi qua API thật
- Thêm `updateProfile()` trong `services/authService.ts` (multipart/form-data, `PATCH /auth/profile`).
- `ProfileSetupModal` submit async, nhận lỗi trả về từ `onSubmit` và hiển thị ngay trong modal.
- `home.tsx` cập nhật global user theo response server sau khi lưu profile.

4. UX modal auth/profile được cải thiện
- `LoginModal`/`RegisterModal` thêm `noValidate` + `onFieldsChange` để lỗi chỉ hiện khi submit và tự tắt khi người dùng gõ lại.
- `ForgotPasswordModal` được đồng bộ format/indent và cấu trúc hiển thị.
- `ProfileSetupModal`:
  - chỉ giữ nút “Lưu hồ sơ” ở giữa
  - dùng `noValidate`
  - hỗ trợ cập nhật avatar/username/signature/password theo luồng validate mới.

5. i18n mở rộng theo error code chuẩn
- Cập nhật `i18n/locales/en/common.json` và `i18n/locales/vi/common.json`.
- Thêm bộ key lỗi chuẩn hóa như:
  - `INVALID_EMAIL`, `USERNAME_*`, `PASSWORD_*`, `SIGNATURE_*`, `UNKNOWN_ERROR`, ...
- Loại bỏ phụ thuộc vào chuỗi lỗi hardcode trong modal cũ.

#### File thay đổi chính
- `client/src/pages/welcome.tsx`
- `client/src/pages/home.tsx`
- `client/src/components/modal/LoginModal.tsx`
- `client/src/components/modal/RegisterModal.tsx`
- `client/src/components/modal/ForgotPasswordModal.tsx`
- `client/src/components/modal/ProfileSetupModal.tsx`
- `client/src/services/httpError.ts`
- `client/src/services/authService.ts`
- `client/src/utils/authValidation.ts` (mới)
- `client/src/i18n/locales/en/common.json`
- `client/src/i18n/locales/vi/common.json`
