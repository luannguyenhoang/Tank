# 🚀 Deploy Tank Battle lên Railway

## 📋 Bước 1: Chuẩn bị

1. **Tạo tài khoản Railway:**
   - Truy cập: https://railway.app
   - Đăng ký bằng GitHub

2. **Cài đặt Railway CLI:**
```bash
npm install -g @railway/cli
```

## 📋 Bước 2: Deploy

1. **Login Railway:**
```bash
railway login
```

2. **Tạo project mới:**
```bash
railway init
```

3. **Deploy:**
```bash
railway up
```

## 📋 Bước 3: Cấu hình

1. **Mở Railway Dashboard:**
   - Truy cập: https://railway.app/dashboard
   - Chọn project vừa tạo

2. **Cấu hình Environment Variables:**
   - PORT: 8080 (tự động)
   - NODE_ENV: production

3. **Lấy URL:**
   - Railway sẽ tạo URL như: `https://tank-battle-production.up.railway.app`
   - Copy URL này

## 📋 Bước 4: Chia sẻ và chơi

1. **Chia sẻ URL:**
   - Gửi URL cho bạn bè
   - Ví dụ: `https://tank-battle-production.up.railway.app`

2. **Chơi game:**
   - Cả 2 người truy cập cùng URL
   - Một người click "Start Game"
   - Người kia click "Join Game"
   - Chơi cùng nhau!

## 🔧 Troubleshooting

### Lỗi thường gặp:

1. **Build failed:**
   - Kiểm tra `package.json` có đúng không
   - Kiểm tra Node.js version

2. **App không start:**
   - Kiểm tra logs trong Railway dashboard
   - Kiểm tra PORT environment variable

3. **WebSocket không hoạt động:**
   - Railway hỗ trợ WebSocket
   - Kiểm tra URL có https:// không

## 📱 Chơi trên Mobile

- Mở trình duyệt mobile
- Truy cập URL Railway
- Sử dụng touch controls

## 🌟 Lợi ích Railway

- ✅ **Miễn phí** cho personal use
- ✅ **HTTPS** tự động
- ✅ **WebSocket** support
- ✅ **Auto-deploy** từ GitHub
- ✅ **Custom domain** (nếu muốn)

## 🔄 Auto-deploy từ GitHub

1. **Connect GitHub:**
   - Trong Railway dashboard
   - Connect GitHub repository

2. **Auto-deploy:**
   - Mỗi khi push code
   - Railway tự động deploy

## 📊 Monitoring

- Xem logs real-time
- Monitor performance
- Health checks

---

**Chúc bạn deploy thành công! 🎮🚗💥**
