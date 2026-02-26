# Deploy miễn phí cho `api` (Node.js/Express)

Repo hiện là monorepo, backend Node nằm ở thư mục `api`.

## 1) Render (khuyến nghị cho dễ dùng)

### Cách A: dùng `api/render.yaml`
1. Push code lên GitHub branch `angular-21-demo`.
2. Vào Render Dashboard → **New +** → **Blueprint**.
3. Chọn repo và chọn file Blueprint tại `api/render.yaml`.
4. Apply để tạo service `ips-grow-node-api`.

### Cách B: tạo Web Service thủ công
1. New + → **Web Service**.
2. Chọn repo + branch `angular-21-demo`.
3. Điền:
   - Root Directory: `api`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm run start`
   - Health Check Path: `/health`

## 2) Railway (free tier theo thời điểm)

1. Vào Railway → **New Project** → **Deploy from GitHub Repo**.
2. Chọn repo + branch `angular-21-demo`.
3. Trong service settings:
   - Root Directory: `api`
4. Railway sẽ đọc `api/railway.json` + `api/Procfile`.

Nếu cần set thủ công:
- Build: `npm ci && npm run build`
- Start: `npm run start`

## 3) URL và frontend

Sau khi deploy, bạn sẽ có URL API dạng:
- Render: `https://<service-name>.onrender.com`
- Railway: `https://<service-name>.up.railway.app`

Set cho frontend biến môi trường:
- `VITE_API_BASE_URL=<YOUR_NODE_API_URL>`

## 4) Test nhanh sau deploy

- `GET /health`
- `GET /api/history/summary?source=techcombank`
- `GET /api/interest-rates?term=12&source=techcombank`
