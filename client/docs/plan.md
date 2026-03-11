# Plan: Auth Modal Flow + ProfileSetupModal

> **TL;DR** — Thêm mock `authService`, wire up handler trong cả 2 trang:
> login thành công → đóng modal, register thành công → mở `ProfileSetupModal` với nickname từ server.
> Tạo `ProfileSetupModal` gồm avatar tròn + lightbox preview + file picker + nickname pre-filled + signature + password trắng.

---

## Phase 1 — Service layer

> Không phụ thuộc UI, làm trước.

- **CREATE** `src/services/authService.ts` — 2 mock async functions:
  - `login(email, password)` → resolve `{ userId, token }`
  - `register(username, email, password)` → resolve `{ nickname: 'abcdxyz', userId, token }`
- **CREATE** `src/assets/images/default-avatar.svg` — SVG người đơn giản, nền tròn xám
- **UPDATE** `src/assets/index.ts` — export `defaultAvatar`

---

## Phase 2 — ProfileSetupModal

> Depends on Phase 1.

- **CREATE** `src/components/modal/ProfileSetupModal.tsx`
- **CREATE** `src/store/globalContext.tsx` — tạo GlobalContext với createContext, GlobalProvider, và hook useGlobalContext, shape ban đầu: { user: { nickname, avatarSrc, signature } | null, isLoggedIn: boolean }

  | Phần | Chi tiết |
  |------|----------|
  | Props | `isOpen`, `onClose`, `onSubmit`, `nickname: string` |
  | State | `avatarSrc` (default = `defaultAvatar`), `showPreview` (lightbox) |
  | Avatar tròn | Top center · click → lightbox overlay (nền tối, click ngoài để đóng) |
  | Đổi avatar | Button dưới avatar → trigger `<input type="file" accept="image/*" ref={…}>` ẩn · FileReader → `setAvatarSrc` |
  | Nickname | `<input maxLength={20} defaultValue={nickname}>` + counter `0/20` |
  | Signature | `<textarea maxLength={200}>` + counter `0/200` |
  | Password | `<input type="password" autoComplete="new-password" placeholder=…>` — để trống, không pre-fill |
  | Tái sử dụng | `Modal`, `Button`, input className pattern từ `LoginModal.tsx` |
  | i18n | `profileSetupTitle`, `nickname`, `signature`, `signatureHint`, `changeAvatar` |
  | Submit | `onSubmit({ avatar, nickname, signature, password })` → `onClose()`
  | Save | nút save ở dưới cùng modal, disabled khi localData với serverData match
  | Mock | `onSubmit` log ra payload, không gọi API thật
  | Note | `avatar` là `File` object, `signature` là string trắng |

- **UPDATE** `src/components/modal/index.ts` — thêm export `ProfileSetupModal`
- **UPDATE** `src/components/index.ts` — thêm export `ProfileSetupModal`
- **UPDATE** `src/main.tsx` — bọc <App> trong <GlobalProvider>

---

## Phase 3 — Wire up pages

> Depends on Phase 1 + 2. `welcome.tsx` và `home.tsx` làm song song.

Cả 2 trang cùng pattern:

1. `AuthModalMode` union thêm `"profileSetup"`
2. Pages (welcome.tsx, home.tsx) dùng const { setUser } = useGlobalContext() thay vì local serverNickname state — khi register thành công thì set user vào context luôn trước khi mở ProfileSetupModal.   
3. Split handler:
   - `handleSubmitLogin` → `authService.login()` → `closeModal()`
   - `handleSubmitRegister` → `authService.register()` → `setServerNickname(res.nickname)` → `openModal("profileSetup")`
   - `handleSubmitProfileSetup` → `closeModal()`
4. Thêm `<ProfileSetupModal isOpen={…} onClose={closeModal} onSubmit={handleSubmitProfileSetup} nickname={serverNickname} />`

---

## Phase 4 — i18n

> Parallel với Phase 3.

Thêm vào `welcome.modals` trong cả 2 file:

| Key | EN | VI |
|-----|----|----|
| `profileSetupTitle` | Set up your profile | Thiết lập hồ sơ |
| `nickname` | Nickname | Biệt danh |
| `signature` | Signature | Chữ ký |
| `signatureHint` | Max 256 characters | Tối đa 256 ký tự |
| `changeAvatar` | Change avatar | Đổi ảnh đại diện |
| `submitProfile` | Save profile | Lưu hồ sơ |
| `placeholder.password` | Set a password | Đặt mật khẩu |
| `placeholder.signature` | Write something about yourself… | Viết gì đó về bản thân… |

---

## Relevant files

| File | Thao tác |
|------|----------|
| `src/services/authService.ts` | CREATE — mock auth |
| `src/assets/images/default-avatar.svg` | CREATE |
| `src/assets/index.ts` | UPDATE — export `defaultAvatar` |
| `src/components/modal/ProfileSetupModal.tsx` | CREATE — core feature |
| `src/components/modal/index.ts` | UPDATE — export |
| `src/components/index.ts` | UPDATE — export |
| `src/pages/welcome.tsx` | UPDATE — wire up |
| `src/pages/home.tsx` | UPDATE — wire up |
| `src/i18n/locales/en/common.json` | UPDATE |
| `src/i18n/locales/vi/common.json` | UPDATE |

---

## Verification

1. Nhấn **Register** → submit → `ProfileSetupModal` xuất hiện với nickname `abcdxyz` pre-filled
2. Click avatar tròn → lightbox overlay nổi lên giữa màn hình → click ngoài để đóng
3. Nhấn **Change avatar** → file picker mở → chọn ảnh → avatar cập nhật
4. Input Password: trống, không auto-fill, placeholder hiện đúng
5. Signature: gõ đến 256 ký tự thì khóa, counter hiển thị đúng
6. Submit `ProfileSetupModal` → modal đóng, ở lại trang
7. Nhấn **Login** → submit → modal đóng ngay (mock success)
8. Toàn bộ flow hoạt động đúng ở cả `/welcome` và `/home`

---

## Decisions

- **Profile save**: mock — `closeModal()`, không gọi API thật
- **Lightbox**: hiển thị được cả default avatar (SVG có `src` thật)
- **Password field**: field "đặt mật khẩu" (`new-password`), không phải confirm
- **Loading / error state**: không làm — mock luôn thành công