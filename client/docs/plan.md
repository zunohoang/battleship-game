## Frontend - Tóm Tắt Thay Đổi So Với Commit Trước

### 1) Auth Client Chuyển Sang Mô Hình Refresh Token (HTTP-only Cookie)
- `axios` bắt buộc đọc API base URL từ env (`VITE_API_BASE_URL`) và bỏ fallback localhost.
- Thêm `withCredentials: true` để browser gửi/nhận refresh cookie.
- Response interceptor được nâng cấp để tự động xử lý `401`:
- Gọi `POST /auth/refresh` để lấy access token mới.
- Retry lại request bị fail sau khi refresh thành công.
- Dùng cơ chế queue khi có nhiều request cùng `401`, đảm bảo chỉ có 1 lần refresh đang chạy.
- Nếu refresh thất bại: xóa token local, xóa default auth header, reject tất cả request đang chờ.

### 2) Cơ Chế Force Logout Từ Tầng Network Lên Tầng UI
- Thêm `forceLogoutCallback` trong interceptor để thông báo cho UI khi refresh thất bại.
- Callback hiện nhận thêm `reasonCode` (ví dụ: `INVALID_REFRESH_TOKEN`) để UI quyết định cách xử lý.
- Nếu là lỗi phiên hết hạn (`INVALID_REFRESH_TOKEN`): giữ nguyên UI state hiện tại, bật modal thông báo ở giữa màn hình.
- Khi người dùng bấm OK/đóng modal: force redirect về welcome (`/`).
- Với các lý do khác: vẫn logout ngay (xóa access token localStorage + reset `user` về `null`).

### 3) Cập Nhật Service API Frontend
- Thêm `logout()` trong `authService` để gọi `POST /auth/logout` và luôn clear access token local.
- `updateProfile()` đổi endpoint từ `/auth/profile` sang `/users/me` để đồng bộ backend.
- `RegisterResponse` cập nhật type `user` thêm `avatar` và `signature` để khớp contract backend.

### 4) Chuẩn Hóa Dữ Liệu Avatar Trên Client
- Đổi global user shape từ `avatarSrc` sang `avatar` (`string | null`) để phân biệt rõ:
- `avatar` là dữ liệu thực tế từ backend.
- default avatar chỉ dùng để render, không ghi đè vào state data.
- `ProfileSetupPayload` bỏ trường `avatarSrc` vì không cần gửi lên backend.
- `ProfileSetupModal` đổi prop `avatarSrc` -> `avatar` và render fallback bằng default image nếu giá trị rỗng/null.

### 5) Cập Nhật Trang Welcome/Home Theo Model Mới
- `setUser(...)` trên `welcome` và `home` lưu `avatar: response.user.avatar` thay vì lưu link đã normalize.
- `ProfileSetupModal` trên `home` nhận `avatar={user?.avatar}`.

### 6) Hoàn Thiện Luồng Session Hết Hạn Trên Client
- Bỏ auto-timeout redirect trong modal session hết hạn; chuyển sang xác nhận thủ công bằng nút OK.
- Chặn lỗi `INVALID_REFRESH_TOKEN` ở tầng global để không đẩy xuống các `catch` local của form/page.
- `home.tsx` và `welcome.tsx` bỏ render thông báo lỗi local cho các mã lỗi đã được đánh dấu xử lý global.
- Bổ sung helper `isGloballyHandledApiError(...)` trong `httpError.ts` để gom logic nhận diện lỗi xử lý tập trung.

### 7) Cập Nhật UX Trong Profile Modal
- Thêm nút `Logout` nằm cạnh nút `Save` trong `ProfileSetupModal`.
- Nút Logout gọi `POST /auth/logout`, sau đó luôn clear state local và đóng modal.

### 8) Hardening Auth Request/Response Interceptor
- Không tự gắn `Authorization` cho các endpoint auth public (`/auth/login`, `/auth/register`, `/auth/refresh`).
- Tránh vòng lặp refresh/retry cho các endpoint auth public.
- Mục tiêu: giảm rủi ro dùng nhầm token stale sau khi server restart hoặc session bị revoke hàng loạt.

### 9) File Frontend Đã Thay Đổi
- `client/.env.example`
- `client/src/services/axios.ts`
- `client/src/services/interceptors.ts`
- `client/src/services/authService.ts`
- `client/src/services/httpError.ts`
- `client/src/store/globalContext.tsx`
- `client/src/pages/welcome.tsx`
- `client/src/pages/home.tsx`
- `client/src/components/modal/ProfileSetupModal.tsx`
- `client/src/i18n/locales/en/common.json`
- `client/src/i18n/locales/vi/common.json`