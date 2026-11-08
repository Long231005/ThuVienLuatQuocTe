# Thư viện Luật Quốc tế

Ứng dụng web tra cứu **điều ước quốc tế, tập quán quốc tế, nguyên tắc pháp lý chung** và **án lệ quốc tế (tóm tắt theo khung IRAC)** dành cho nhóm sinh viên luật cùng học tập.

- Giao diện 100% tiếng Việt, có chế độ Sáng / Tối, đọc tốt trên cả máy tính và điện thoại.
- Đăng nhập nhanh bằng **Tên đăng nhập + Mật khẩu** (không cần dùng email cá nhân).
- Phân quyền tự động: ai cũng đọc được toàn bộ kho chung; mỗi thành viên chỉ sửa/xóa được bài của chính mình; Quản trị viên (`admin`) quản lý được toàn bộ bài và hỗ trợ đặt lại mật khẩu.
- Hỗ trợ **Nhập nhiều bài cùng lúc bằng AI** (ChatGPT / Claude / Gemini) và **Xuất dữ liệu (.json)** để sao lưu.

---

## Hướng dẫn cài đặt và đưa lên mạng (Dành cho người không rành kỹ thuật)

Bạn chỉ cần làm tuần tự **7 bước** dưới đây (mất khoảng 15 phút):

### Bước 1: Tạo cơ sở dữ liệu miễn phí trên Supabase

1. Truy cập [https://supabase.com](https://supabase.com) và bấm **Start your project** → chọn **Continue with GitHub** để đăng nhập bằng tài khoản GitHub của bạn.
2. Bấm nút màu xanh **New project** (Tạo dự án mới).
3. Điền các thông tin:
   - **Name** (Tên dự án): gõ `thu-vien-luat-quoc-te`
   - **Database Password** (Mật khẩu cơ sở dữ liệu): bấm tạo mật khẩu mạnh và **lưu lại vào sổ tay** phòng khi cần.
   - **Region** (Vùng máy chủ): chọn **Southeast Asia (Singapore)** để tốc độ mở web tại Việt Nam nhanh nhất.
4. Bấm **Create new project** và chờ khoảng 2 phút để hệ thống khởi tạo xong.

---

### Bước 2: Tạo các bảng dữ liệu (Chạy file SQL)

1. Ở thanh menu bên trái của Supabase, bấm vào biểu tượng **SQL Editor** (Trình soạn thảo SQL).
2. Bấm nút **+ New query** (Tạo truy vấn mới).
3. Mở file `supabase/schema.sql` trong thư mục dự án này trên máy tính của bạn, **sao chép toàn bộ nội dung** và dán vào khung soạn thảo trên Supabase.
4. Bấm nút **Run** (hoặc nhấn `Ctrl + Enter`). Khi góc dưới hiện chữ **Success. No rows returned** là bạn đã tạo bảng và phân quyền thành công.

---

### Bước 3: Tắt đăng ký trực tiếp từ bên ngoài trên Supabase

Vì ứng dụng xử lý đăng ký qua máy chủ (dùng tên đăng nhập thay cho email), bạn nên tắt tính năng tự đăng ký trực tiếp qua cổng mặc định của Supabase (Admin API của ứng dụng vẫn tạo tài khoản bình thường):

1. Ở menu bên trái của Supabase, bấm vào **Authentication** (biểu tượng cái khóa) → chọn mục **Providers** hoặc **User Signups** (trong phần *Configuration* / *Sign In / Providers* tùy phiên bản giao diện).
2. Tìm dòng **Allow new users to sign up** (Cho phép người dùng mới tự đăng ký).
3. Nếu bạn muốn chỉ cho phép đăng ký qua Admin API của ứng dụng: hãy lưu ý ở một số phiên bản Supabase mới, tắt nút *Allow new users to sign up* có thể chặn cả hàm đăng nhập hoặc tạo user nếu cấu hình khác nhau.
   - **Khuyến nghị đơn giản & an toàn nhất**: Trong mục **Authentication → Providers → Email**, hãy **TẮT** mục **Confirm email** (Xác nhận email). Còn việc bật/tắt cho phép người mới đăng ký vào web, bạn điều khiển trực tiếp bằng biến `SIGNUP_ENABLED=true` hoặc `SIGNUP_ENABLED=false` ở Bước 5 và Bước 6.

---

### Bước 4: Lấy địa chỉ kết nối (URL) và 2 khóa bảo mật (Keys)

1. Ở menu bên trái của Supabase, bấm vào biểu tượng bánh răng **Project Settings** (Cài đặt dự án) ở dưới cùng → chọn mục **API** (hoặc bấm nút **Connect** ở thanh trên cùng → tab **App Frameworks / API Keys**).
2. Bạn sẽ cần sao chép **3 giá trị** sau:
   - **Project URL**: có dạng `https://xxxxxxxxxxxx.supabase.co` → điền vào `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** (hoặc **Publishable key**): chuỗi chữ dài công khai → điền vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** (bấm nút *Reveal* để hiện): chuỗi khóa bí mật → điền vào `SUPABASE_SERVICE_ROLE_KEY` (**Tuyệt đối không chia sẻ khóa này cho người lạ**).

---

### Bước 5: Chạy thử ở máy tính cá nhân và tạo tài khoản Admin đầu tiên

1. Trong thư mục `C:\thu-vien-luat-quoc-te`, tạo bản sao của file `.env.example` và đổi tên thành `.env.local`.
2. Mở file `.env.local` bằng Notepad hoặc VS Code và điền các giá trị:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
AUTH_EMAIL_DOMAIN=thuvienluat.invalid
SIGNUP_ENABLED=true
CRON_SECRET=mot_chuoi_ngau_nhien_dai_it_nhat_24_ky_tu
ADMIN_USERNAME=admin_luat
ADMIN_PASSWORD=mat_khau_cua_ban_tu_6_ky_tu
```

3. Mở cửa sổ dòng lệnh (Terminal / PowerShell) tại thư mục dự án và chạy lần lượt:

```bash
npm install
npm run seed:admin
npm run dev
```

- Lệnh `npm run seed:admin` sẽ tạo tài khoản quản trị viên đầu tiên theo `ADMIN_USERNAME` và `ADMIN_PASSWORD` bạn vừa điền. (Nếu sau này bạn quên mật khẩu admin, chỉ cần sửa `ADMIN_PASSWORD` trong `.env.local` rồi chạy `npm run seed:admin -- --reset-password`).
- Mở trình duyệt vào địa chỉ `http://localhost:3000` để kiểm tra.

---

### Bước 6: Đưa mã nguồn lên GitHub và triển khai lên Vercel (Miễn phí)

1. Đẩy toàn bộ mã nguồn thư mục này lên một kho chứa (Repository) trên GitHub của bạn (file `.gitignore` đã tự động chặn file `.env.local` để không lộ mật khẩu).
2. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập.
3. Bấm **Add New...** → chọn **Project** → bấm **Import** ở dòng kho chứa GitHub `thu-vien-luat-quoc-te` của bạn.
4. Tại mục **Environment Variables** (Biến môi trường), nhập lần lượt **5 biến** sau (không cần nhập `ADMIN_USERNAME` và `ADMIN_PASSWORD`):
   - `NEXT_PUBLIC_SUPABASE_URL`: *(dán Project URL của bạn)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: *(dán khóa anon/publishable)*
   - `SUPABASE_SERVICE_ROLE_KEY`: *(dán khóa service_role/secret)*
   - `AUTH_EMAIL_DOMAIN`: `thuvienluat.invalid`
   - `SIGNUP_ENABLED`: `true` *(khi cả nhóm 10 bạn đã tạo tài khoản xong, bạn có thể đổi thành `false` rồi bấm Redeploy để khóa đăng ký người lạ)*
   - `CRON_SECRET`: *(gõ một chuỗi ngẫu nhiên dài, ví dụ `thuvienluat_secret_2026_abc123xyz`)*
5. Bấm nút **Deploy** và chờ khoảng 1–2 phút. Vercel sẽ cấp cho bạn đường link trang web chính thức (ví dụ `https://thu-vien-luat-quoc-te.vercel.app`).

---

### Bước 7: Kiểm tra sau khi Deploy

1. Mở đường link Vercel vừa cấp, đăng nhập bằng tài khoản Admin hoặc thử bấm tab **Đăng ký tài khoản** để tạo tài khoản thành viên.
2. Vào menu **Nhập / Xuất dữ liệu** ở cột bên trái:
   - Bấm **Tải file mẫu** (hoặc chọn file `public/du-lieu-ban-dau.json` / `public/mau-import.json`).
   - Bấm **Hoặc chọn file .json** → chọn file mẫu vừa tải → bấm **Kiểm tra** → bấm **Nhập 12 bài**.
3. Quay lại trang **Tổng quan**, **Điều ước & Tập quán** và **Thư viện Án lệ** để trải nghiệm tìm kiếm và xem chi tiết bài.

---

## Lưu ý gói miễn phí & Vận hành

1. **Chống Supabase tự tạm dừng sau 7 ngày không hoạt động**:
   - Gói miễn phí của Supabase sẽ tạm dừng nếu 7 ngày liên tiếp không có ai mở web.
   - Dự án đã tích hợp sẵn đường dẫn `/api/keepalive` và cấu hình lịch tự động gọi mỗi ngày một lần lúc 03:00 sáng trong file `vercel.json`.
   - Ngoài ra, dự án cũng có sẵn file `.github/workflows/keepalive.yml`. Nếu bạn muốn dùng thêm GitHub Actions để gọi mỗi ngày, chỉ cần vào kho GitHub → **Settings → Secrets and variables → Actions** → thêm 2 secret: `APP_URL` (địa chỉ web Vercel của bạn) và `CRON_SECRET` (giống giá trị trên Vercel).
2. **Sao lưu dữ liệu định kỳ**:
   - Gói miễn phí của Supabase không có tính năng tự động sao lưu hàng ngày.
   - Mỗi tuần (hoặc sau mỗi đợt cả nhóm nhập nhiều bài mới), hãy vào trang **Nhập / Xuất dữ liệu** → bấm nút **Xuất tất cả bài** để tải file `.json` về máy tính hoặc Google Drive của nhóm.
3. **Khi thành viên quên mật khẩu**:
   - Vì hệ thống không dùng email thật, không có tính năng gửi link quên mật khẩu qua email.
   - Khi một bạn trong nhóm quên mật khẩu, người có tài khoản **Admin** chỉ cần vào mục **Quản trị** ở thanh bên trái → bấm nút **Đặt lại mật khẩu** ở dòng tên bạn đó → nhập mật khẩu mới rồi nhắn cho bạn đó.

---

## Giả định đã dùng

1. **Email nội bộ cho Supabase Auth**: Dùng định dạng `<tên_đăng_nhập>@thuvienluat.invalid` theo biến môi trường `AUTH_EMAIL_DOMAIN` (mặc định `thuvienluat.invalid`). Khi tạo người dùng bằng `auth.admin.createUser({ email_confirm: true })`, Supabase chấp nhận ngay mà không gửi thư ra ngoài. Nếu cấu hình máy chủ Supabase riêng của bạn chặn đuôi `.invalid`, bạn chỉ cần đổi `AUTH_EMAIL_DOMAIN=thuvienluat.example.com` trong biến môi trường.
2. **Kiểm tra bài đã từng sửa (`Cập nhật dd/mm/yyyy`)**: Khi mới tạo bài, `created_at` và `updated_at` bằng nhau; hệ thống chỉ hiện nhãn `"Cập nhật dd/mm/yyyy"` khi `updated_at` lớn hơn `created_at` trên 2 giây (tức là bài thực sự đã được chỉnh sửa sau khi đăng).
3. **Dòng nguồn tham khảo để trống trên form**: Trong hộp thoại Thêm/Sửa, nếu người dùng bấm "Thêm dòng nguồn" nhưng để trống hoàn toàn cả ô Tiêu đề lẫn URL, hệ thống tự động bỏ qua dòng trống đó thay vì chặn lưu; nếu đã gõ một trong hai ô thì bắt buộc kiểm tra đầy đủ Tiêu đề và URL `http(s)://`.
4. **Hàm bảo vệ route (`src/proxy.ts`)**: Sử dụng chuẩn `proxy.ts` mới nhất của Next.js 16 kết hợp `supabase.auth.getUser()` của `@supabase/ssr` để kiểm tra phiên đăng nhập thực tế ở phía máy chủ trên mọi đường dẫn trừ `/login` và `/api/keepalive`.
