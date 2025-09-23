# 🌐 Hướng dẫn chơi Multiplayer trên 2 máy tính

## 📋 Bước 1: Cài đặt trên máy chủ (Host)

1. **Cài đặt dependencies:**
```bash
npm install
```

2. **Chạy server:**
```bash
npm start
```

3. **Lấy IP address của máy chủ:**
   - **Windows:** Mở Command Prompt, gõ `ipconfig`
   - **Mac/Linux:** Mở Terminal, gõ `ifconfig`
   - Tìm địa chỉ IP (thường là 192.168.x.x hoặc 10.x.x.x)

## 📋 Bước 2: Chia sẻ thông tin

**Máy chủ chia sẻ cho bạn:**
- IP Address: `192.168.1.100` (ví dụ)
- Port: `8080`
- URL: `http://192.168.1.100:8080`

## 📋 Bước 3: Kết nối từ máy khác

**Máy thứ 2:**
1. Mở trình duyệt
2. Truy cập: `http://IP_ADDRESS:8080`
   - Ví dụ: `http://192.168.1.100:8080`
3. Chơi game!

## 🎮 Cách chơi:

1. **Máy chủ:** Click "Start Game"
2. **Máy thứ 2:** Click "Join Game"
3. **Cả hai:** Chơi cùng nhau!

## 🔧 Troubleshooting:

### Lỗi không kết nối được:
1. **Kiểm tra Firewall:**
   - Tắt Windows Firewall tạm thời
   - Hoặc thêm exception cho port 8080

2. **Kiểm tra mạng:**
   - Cả 2 máy phải cùng mạng WiFi/LAN
   - Ping thử: `ping IP_ADDRESS`

3. **Kiểm tra port:**
   - Đảm bảo port 8080 không bị chặn
   - Có thể đổi port trong `server.js`

### Lỗi "Connection refused":
- Kiểm tra IP address có đúng không
- Kiểm tra server có đang chạy không
- Kiểm tra firewall

## 🌍 Chơi qua Internet:

Để chơi qua Internet (không cùng mạng):

1. **Sử dụng ngrok (khuyến nghị):**
```bash
# Cài đặt ngrok
npm install -g ngrok

# Chạy ngrok
ngrok http 8080
```

2. **Chia sẻ URL ngrok:**
   - Ngrok sẽ tạo URL như: `https://abc123.ngrok.io`
   - Chia sẻ URL này cho bạn

3. **Kết nối:**
   - Cả 2 máy truy cập URL ngrok
   - Chơi như bình thường!

## 📱 Chơi trên Mobile:

- Mở trình duyệt mobile
- Truy cập: `http://IP_ADDRESS:8080`
- Sử dụng touch controls (đã responsive)

---

**Chúc bạn chơi game vui vẻ! 🎮🚗💥**
