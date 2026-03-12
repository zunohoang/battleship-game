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
- `GlobalProvider` đăng ký callback qua `setForceLogoutCallback(logout)`.
- Hành vi `logout`: xóa access token localStorage + reset `user` về `null`.

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

### 6) File Frontend Đã Thay Đổi
- `client/.env.example`
- `client/src/services/axios.ts`
- `client/src/services/interceptors.ts`
- `client/src/services/authService.ts`
- `client/src/store/globalContext.tsx`
- `client/src/pages/welcome.tsx`
- `client/src/pages/home.tsx`
- `client/src/components/modal/ProfileSetupModal.tsx`
