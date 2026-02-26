# Deploy backend + frontend (Render)

Tài liệu này dùng cho repo hiện tại, branch `angular-21-demo`.

## 1) Chuẩn bị

- Đảm bảo đã push toàn bộ code mới nhất lên GitHub branch `angular-21-demo`.
- Repo đã có sẵn file `render.yaml` để Render tạo 2 service:
  - `ips-grow-backend` (FastAPI)
  - `ips-grow-frontend` (Vite static site)

## 2) Tạo Blueprint trên Render

1. Vào Render Dashboard → **New +** → **Blueprint**.
2. Kết nối GitHub repo `ips-grow-vite-pwa`.
3. Chọn branch: `angular-21-demo`.
4. Render sẽ đọc `render.yaml` và tạo 2 service.
5. Bấm **Apply** để deploy.

## 3) Sau khi bấm Deploy

- Cấu hình hiện tại đã chuẩn hóa để chạy ngay sau lần deploy đầu:
  - Frontend mặc định gọi API qua `https://ips-grow-backend.onrender.com`.
  - Backend đã mở CORS cho localhost và domain `*.onrender.com`.
- Không cần sửa env để chạy cơ bản.

## 4) Kiểm tra sau deploy

- API health:
  - `https://ips-grow-backend.onrender.com/api/history/summary?source=techcombank`
- API data:
  - `https://ips-grow-backend.onrender.com/api/interest-rates?term=12&source=techcombank`
- Frontend:
  - Mở `https://ips-grow-frontend.onrender.com` và đổi source/term để kiểm tra chart.

## 5) Khi nào cần chỉnh env

- Chỉ cần chỉnh nếu tên service trên Render khác mặc định:
  - Frontend `VITE_API_BASE_URL` → URL backend thật của bạn.
  - Backend `ALLOWED_ORIGINS` (optional) → danh sách domain frontend, phân tách bằng dấu phẩy.

## 6) Lưu ý

- Free plan của Render có thể sleep service khi không dùng.
- Frontend worker đã hỗ trợ `VITE_API_BASE_URL`; nếu không set env thì mặc định gọi `/api` (chỉ phù hợp local dev với vite proxy).
