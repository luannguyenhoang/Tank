# 🚗 Tank Battle 1v1 - Real Time Multiplayer Game

Một game bắn tank 1 vs 1 real time sử dụng HTML5 Canvas và WebSocket cho multiplayer.

## ✨ Tính năng

- 🎮 **Gameplay thú vị**: Điều khiển tank, bắn đạn, tránh địch
- 🌐 **Multiplayer Real-time**: Chơi với bạn bè qua WebSocket
- 🎯 **Hệ thống bắn**: Bắn đạn với giới hạn đạn, reload
- 💥 **Collision Detection**: Phát hiện va chạm chính xác
- 🎨 **Giao diện đẹp**: UI hiện đại với hiệu ứng
- 📱 **Responsive**: Hỗ trợ mobile và desktop

## 🎮 Cách chơi

### Điều khiển
- **WASD** hoặc **Arrow Keys**: Di chuyển tank
- **Mouse**: Ngắm bắn
- **Space** hoặc **Click**: Bắn đạn
- **R**: Nạp đạn

### Mục tiêu
- Tiêu diệt đối thủ bằng cách bắn trúng
- Mỗi phát bắn trúng gây 20 damage
- Tank có 100 HP
- Mỗi tank có 30 viên đạn, có thể reload

## 🚀 Cài đặt và chạy

### Yêu cầu
- Node.js 14.0.0 trở lên
- NPM hoặc Yarn

### Cài đặt
```bash
# Clone hoặc download project
cd TestHostGame

# Cài đặt dependencies
npm install

# Chạy server
npm start
```

### Chạy development mode
```bash
npm run dev
```

### Truy cập game
Mở trình duyệt và truy cập: `http://localhost:8080`

## 🎯 Cách chơi Multiplayer

1. **Tạo game**: Mở tab đầu tiên, click "Start Game"
2. **Tham gia game**: Mở tab thứ hai, click "Join Game"
3. **Chơi**: Cả hai người chơi cùng lúc!

## 🛠️ Công nghệ sử dụng

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js
- **Real-time**: WebSocket (ws library)
- **Graphics**: HTML5 Canvas
- **Styling**: CSS Grid, Flexbox, Animations

## 📁 Cấu trúc project

```
TestHostGame/
├── index.html          # Trang chính
├── style.css           # Styling
├── game.js            # Game client logic
├── server.js          # WebSocket server
├── package.json       # Dependencies
└── README.md          # Hướng dẫn
```

## 🎨 Tính năng nổi bật

### Game Engine
- Game loop với requestAnimationFrame
- Smooth 60fps gameplay
- Collision detection chính xác
- Physics simulation đơn giản

### Multiplayer
- WebSocket real-time communication
- Game state synchronization
- Player management
- Bullet tracking

### UI/UX
- Responsive design
- Modern gradient backgrounds
- Smooth animations
- Health bars và ammo counter
- Game status indicators

## 🔧 Customization

Bạn có thể tùy chỉnh game bằng cách:

- Thay đổi màu sắc tank trong `game.js`
- Điều chỉnh tốc độ, damage trong class `Tank` và `Bullet`
- Thêm âm thanh, hiệu ứng
- Thêm power-ups, obstacles
- Tạo nhiều map khác nhau

## 🐛 Troubleshooting

### Lỗi thường gặp
1. **Port đã được sử dụng**: Thay đổi port trong `server.js`
2. **WebSocket connection failed**: Kiểm tra firewall
3. **Game không load**: Kiểm tra console browser

### Debug
Mở Developer Tools (F12) để xem console logs và debug.

## 📝 License

MIT License - Tự do sử dụng và chỉnh sửa.

## 🤝 Contributing

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

---

**Chúc bạn chơi game vui vẻ! 🎮🚗💥**
