class TankBattleGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.gameState = "waiting"; // chờ đợi, đang chơi, kết thúc game
    this.playerId = null;
    this.players = {};
    this.bullets = [];
    this.muzzleFlashes = []; // Hiệu ứng lửa bắn
    this.smokeParticles = []; // Hiệu ứng khói
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.lastTime = 0;
    this.gameId = null;
    this.roomCode = null;
    this.isHost = false;
    this.ws = null;
    this.currentView = "modes"; // chế độ, tạo phòng, tham gia phòng, phòng chờ
    this.scores = { player1: 0, player2: 0 };
    this.gameCount = 0;
    this.turretRotated = false; // Theo dõi việc quay tháp pháo

    this.setupEventListeners();
    this.setupUI();
    this.gameLoop();
  }

  setupEventListeners() {
    // Sự kiện bàn phím
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space") {
        e.preventDefault();
        this.shoot();
      }
      if (e.code === "KeyR") {
        e.preventDefault();
        this.reload();
      }
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Sự kiện chuột
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener("click", (e) => {
      if (this.gameState === "playing") {
        this.shoot();
      }
    });
  }

  setupUI() {
    // Nút chế độ game
    document.getElementById("create-room-btn").addEventListener("click", () => {
      this.showRoomCreation();
    });

    document.getElementById("join-room-btn").addEventListener("click", () => {
      this.showRoomJoining();
    });

    document
      .getElementById("single-player-btn")
      .addEventListener("click", () => {
        this.startSinglePlayer();
      });

    // Tạo phòng
    document.getElementById("start-room-btn").addEventListener("click", () => {
      this.startRoomGame();
    });

    document.getElementById("copy-code-btn").addEventListener("click", () => {
      this.copyRoomCode();
    });

    // Tham gia phòng
    document
      .getElementById("connect-room-btn")
      .addEventListener("click", () => {
        this.joinRoom();
      });

    // Nút quay lại
    document
      .getElementById("back-to-modes-btn")
      .addEventListener("click", () => {
        this.showGameModes();
      });

    document
      .getElementById("back-to-modes-btn-2")
      .addEventListener("click", () => {
        this.showGameModes();
      });

    // Phòng chờ
    document.getElementById("leave-room-btn").addEventListener("click", () => {
      this.leaveRoom();
    });

    document
      .getElementById("start-room-btn-waiting")
      .addEventListener("click", () => {
        this.startRoomGame();
      });

    document
      .getElementById("copy-code-waiting-btn")
      .addEventListener("click", () => {
        this.copyRoomCodeWaiting();
      });

    // Nhập mã phòng
    document
      .getElementById("room-code-input")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.joinRoom();
        }
      });
  }

  // Quản lý giao diện người dùng
  showGameModes() {
    this.currentView = "modes";
    this.hideAllViews();
    document.getElementById("game-modes").style.display = "block";
    document.getElementById("overlay-title").textContent = "Tank Battle 1v1";
    document.getElementById("overlay-message").textContent =
      "Choose your game mode!";
  }

  showRoomCreation() {
    this.currentView = "room-creation";
    this.hideAllViews();
    document.getElementById("room-creation").style.display = "block";
    this.createRoom();
  }

  showRoomJoining() {
    this.currentView = "room-joining";
    this.hideAllViews();
    document.getElementById("room-joining").style.display = "block";
    document.getElementById("room-code-input").focus();
  }

  showWaitingRoom() {
    this.currentView = "waiting-room";
    this.hideAllViews();
    document.getElementById("waiting-room").style.display = "block";

    // Update room code in waiting room
    if (this.roomCode) {
      document.getElementById("room-code-waiting").textContent = this.roomCode;
    }
  }

  hideAllViews() {
    document.getElementById("game-modes").style.display = "none";
    document.getElementById("room-creation").style.display = "none";
    document.getElementById("room-joining").style.display = "none";
    document.getElementById("waiting-room").style.display = "none";
  }

  // Quản lý phòng
  createRoom() {
    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    document.getElementById("room-code-display").textContent = this.roomCode;
    this.connectWebSocket();
  }

  joinRoom() {
    const roomCode = document
      .getElementById("room-code-input")
      .value.toUpperCase();
    if (!roomCode || roomCode.length !== 6) {
      alert("Please enter a valid 6-character room code!");
      return;
    }

    this.roomCode = roomCode;
    this.isHost = false;
    this.connectWebSocket();
  }

  connectWebSocket() {
    // Để triển khai trên Railway, sử dụng giao thức wss
    const protocol = "wss:";
    const wsUrl = `${protocol}//${window.location.host}`;

    console.log("Connecting to WebSocket:", wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("Connected to server");
      if (this.isHost) {
        this.ws.send(
          JSON.stringify({
            type: "createRoom",
            roomCode: this.roomCode,
          })
        );
      } else {
        this.ws.send(
          JSON.stringify({
            type: "joinRoom",
            roomCode: this.roomCode,
          })
        );
      }
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };

    this.ws.onclose = () => {
      console.log("Disconnected from server");
      this.showGameModes();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      alert("Connection failed. Please try again.");
      this.showGameModes();
    };
  }

  handleWebSocketMessage(data) {
    console.log("Received WebSocket message:", data);

    switch (data.type) {
      case "roomCreated":
        this.showWaitingRoom();
        this.updateWaitingRoom([
          { id: "player1", name: "You", status: "ready" },
        ]);
        break;

      case "roomJoined":
        this.showWaitingRoom();
        this.updateWaitingRoom(data.players);
        break;

      case "playerJoined":
        this.updateWaitingRoom(data.players);
        break;

      case "gameStarted":
        console.log("Game started message received:", data);
        this.startMultiplayerGame(data.players);
        break;

      case "gameUpdate":
        this.handleGameUpdate(data);
        break;

      case "bulletShot":
        this.handleBulletShot(data);
        break;

      case "playerHit":
        this.handlePlayerHit(data);
        break;

      case "playerDisconnected":
        this.handlePlayerDisconnected(data);
        break;

      case "gameEnded":
        this.handleGameEnd(data);
        break;

      case "error":
        alert(data.message);
        this.showGameModes();
        break;

      default:
        console.log("Unknown message type:", data.type);
    }
  }

  startSinglePlayer() {
    this.gameState = "playing";
    this.playerId = "player1";
    this.players = {
      player1: new Tank(100, 300, "player1", "#3498db"),
      player2: new Tank(900, 300, "player2", "#e74c3c"),
    };
    this.hideOverlay();
    this.updateUI();
  }

  startRoomGame() {
    if (this.ws) {
      this.ws.send(
        JSON.stringify({
          type: "startGame",
        })
      );
    }
  }

  startMultiplayerGame(players) {
    console.log("Starting multiplayer game with players:", players);
    this.gameState = "playing";
    this.players = {};

    // Find which player is me based on WebSocket connection
    let myPlayerId = null;
    if (this.isHost) {
      myPlayerId = "player1";
    } else {
      myPlayerId = "player2";
    }

    players.forEach((player, index) => {
      const isPlayer1 = index === 0;
      this.players[player.id] = new Tank(
        isPlayer1 ? 100 : 900,
        300,
        player.id,
        player.color
      );
      this.players[player.id].health = player.health;
      this.players[player.id].ammo = player.ammo;
    });

    // Set my player ID
    this.playerId = myPlayerId;

    console.log("My player ID:", this.playerId);
    console.log("All players:", this.players);
    console.log("Is host:", this.isHost);

    this.hideOverlay();
    this.updateUI();
  }

  generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  copyRoomCode() {
    navigator.clipboard.writeText(this.roomCode).then(() => {
      const btn = document.getElementById("copy-code-btn");
      const originalText = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  }

  copyRoomCodeWaiting() {
    navigator.clipboard.writeText(this.roomCode).then(() => {
      const btn = document.getElementById("copy-code-waiting-btn");
      const originalText = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  }

  updateWaitingRoom(players) {
    const player1Element = document.getElementById("player1-waiting");
    const player2Element = document.getElementById("player2-waiting");
    const startBtn = document.getElementById("start-room-btn-waiting");

    player1Element.querySelector(".player-status").textContent = "Ready";
    player1Element.querySelector(".player-status").className =
      "player-status ready";

    if (players.length > 1) {
      player2Element.querySelector(".player-status").textContent = "Ready";
      player2Element.querySelector(".player-status").className =
        "player-status ready";

      // Show start button for host when 2 players are ready
      if (this.isHost) {
        startBtn.style.display = "inline-block";
      }
    } else {
      player2Element.querySelector(".player-status").textContent = "Waiting...";
      player2Element.querySelector(".player-status").className =
        "player-status waiting";
      startBtn.style.display = "none";
    }
  }

  leaveRoom() {
    if (this.ws) {
      this.ws.close();
    }
    this.showGameModes();
  }

  hideOverlay() {
    document.getElementById("game-overlay").classList.add("hidden");
  }

  showOverlay(title, message, showJoin = false) {
    document.getElementById("overlay-title").textContent = title;
    document.getElementById("overlay-message").textContent = message;
    document.getElementById("join-btn").style.display = showJoin
      ? "inline-block"
      : "none";
    document.getElementById("game-overlay").classList.remove("hidden");
  }

  updateUI() {
    if (this.players.player1) {
      document.getElementById(
        "player1-health"
      ).textContent = `Health: ${this.players.player1.health}`;
      document.getElementById(
        "player1-ammo"
      ).textContent = `Ammo: ${this.players.player1.ammo}`;
    }
    if (this.players.player2) {
      document.getElementById(
        "player2-health"
      ).textContent = `Health: ${this.players.player2.health}`;
      document.getElementById(
        "player2-ammo"
      ).textContent = `Ammo: ${this.players.player2.ammo}`;
    }

    // Update scores
    document.getElementById(
      "player1-score"
    ).textContent = `Score: ${this.scores.player1}`;
    document.getElementById(
      "player2-score"
    ).textContent = `Score: ${this.scores.player2}`;

    let status = "Waiting for players...";
    if (this.gameState === "playing") {
      status = `Game ${this.gameCount} in progress!`;
    } else if (this.gameState === "gameOver") {
      status = "Game Over!";
    } else if (this.gameState === "restarting") {
      status = "Restarting in 3 seconds...";
    }
    document.getElementById("game-status").textContent = status;
  }

  handleInput() {
    if (
      this.gameState !== "playing" ||
      !this.playerId ||
      !this.players[this.playerId]
    ) {
      console.log(
        "Input blocked - gameState:",
        this.gameState,
        "playerId:",
        this.playerId,
        "players:",
        this.players
      );
      return;
    }

    const player = this.players[this.playerId];
    const speed = 3;
    let moved = false;

    // Di chuyển
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) {
      player.y -= speed;
      moved = true;
    }
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) {
      player.y += speed;
      moved = true;
    }
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) {
      player.x -= speed;
      moved = true;
    }
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) {
      player.x += speed;
      moved = true;
    }

    // Giữ xe tăng trong giới hạn
    player.x = Math.max(25, Math.min(this.canvas.width - 25, player.x));
    player.y = Math.max(25, Math.min(this.canvas.height - 25, player.y));

    // Cập nhật góc xe tăng dựa trên vị trí chuột
    const dx = this.mouse.x - player.x;
    const dy = this.mouse.y - player.y;
    const newAngle = Math.atan2(dy, dx);
    
    // Kiểm tra xem tháp pháo có quay không
    const angleDiff = Math.abs(player.angle - newAngle);
    if (angleDiff > 0.01) { // Chỉ cập nhật nếu góc thay đổi đáng kể
      this.turretRotated = true;
      player.angle = newAngle;
    }

    // Tạo hiệu ứng khói khi di chuyển
    if (moved) {
      this.createSmokeParticles(player);
    }

    // Gửi cập nhật lên server nếu di chuyển hoặc quay tháp pháo (chỉ trong chế độ nhiều người chơi)
    if ((moved || this.turretRotated) && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "gameUpdate",
          x: player.x,
          y: player.y,
          angle: player.angle,
        })
      );
      this.turretRotated = false; // Reset sau khi gửi
    }
  }

  shoot() {
    if (
      this.gameState !== "playing" ||
      !this.playerId ||
      !this.players[this.playerId]
    )
      return;

    const player = this.players[this.playerId];
    if (player.ammo <= 0) return;

    player.ammo--;

    // Tính vị trí miệng súng (đầu nòng súng)
    const turretWidth = player.radius * 1.5;
    const barrelLength = player.radius * 1.5; // Sử dụng chiều dài nòng súng thực tế
    const muzzleX =
      player.x + Math.cos(player.angle) * (turretWidth / 2 + barrelLength + 2);
    const muzzleY =
      player.y + Math.sin(player.angle) * (turretWidth / 2 + barrelLength + 2);

    // Tạo hiệu ứng lửa bắn
    this.createMuzzleFlash(muzzleX, muzzleY, player.angle);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Chế độ nhiều người chơi - gửi lên server
      this.ws.send(
        JSON.stringify({
          type: "shoot",
          x: muzzleX,
          y: muzzleY,
          angle: player.angle,
        })
      );
    } else {
      // Chế độ một người chơi - tạo đạn cục bộ
      const bullet = new Bullet(muzzleX, muzzleY, player.angle, player.id);
      this.bullets.push(bullet);
    }

    this.updateUI();
  }

  createMuzzleFlash(x, y, angle) {
    // Tạo 8-12 hạt lửa bay ra từ miệng súng
    const particleCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < particleCount; i++) {
      const particle = new MuzzleFlashParticle(x, y, angle);
      this.muzzleFlashes.push(particle);
    }
  }

  updateMuzzleFlashes() {
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const flash = this.muzzleFlashes[i];
      flash.update();

      if (flash.life <= 0) {
        this.muzzleFlashes.splice(i, 1);
      }
    }
  }

  renderMuzzleFlashes() {
    this.muzzleFlashes.forEach((flash) => flash.render(this.ctx));
  }

  createSmokeParticles(player) {
    // Tạo 2-4 hạt khói mỗi lần di chuyển
    const particleCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < particleCount; i++) {
      const particle = new SmokeParticle(player);
      this.smokeParticles.push(particle);
    }
  }

  updateSmokeParticles() {
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const smoke = this.smokeParticles[i];
      smoke.update();

      if (smoke.life <= 0) {
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  renderSmokeParticles() {
    this.smokeParticles.forEach((smoke) => smoke.render(this.ctx));
  }

  reload() {
    if (
      this.gameState !== "playing" ||
      !this.playerId ||
      !this.players[this.playerId]
    )
      return;

    const player = this.players[this.playerId];
    player.ammo = Math.min(15, player.ammo + 15);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "reload",
        })
      );
    }

    this.updateUI();
  }

  // Xử lý tin nhắn WebSocket
  handleGameUpdate(data) {
    if (this.players[data.playerId]) {
      this.players[data.playerId].x = data.x;
      this.players[data.playerId].y = data.y;
      this.players[data.playerId].angle = data.angle;
    }
  }

  handleBulletShot(data) {
    const bullet = new Bullet(
      data.bullet.x,
      data.bullet.y,
      data.bullet.angle,
      data.bullet.ownerId
    );
    this.bullets.push(bullet);
  }

  handlePlayerHit(data) {
    if (this.players[data.playerId]) {
      this.players[data.playerId].health = data.health;
      this.updateUI();
    }
  }

  handlePlayerDisconnected(data) {
    console.log("Player disconnected:", data.playerId);
    if (this.players[data.playerId]) {
      delete this.players[data.playerId];
    }

    // If it's the other player who disconnected, you win
    if (data.playerId !== this.playerId) {
      this.scores[this.playerId]++;
      this.updateUI();
      this.showOverlay("Game Over!", "You Won! (Opponent disconnected)", true);
    }
  }

  handleGameEnd(data) {
    this.gameState = "gameOver";
    const message = data.winner === this.playerId ? "You Won!" : "You Lost!";
    this.showOverlay("Game Over!", message, true);
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update();

      // Xóa đạn ra khỏi giới hạn
      if (
        bullet.x < 0 ||
        bullet.x > this.canvas.width ||
        bullet.y < 0 ||
        bullet.y > this.canvas.height
      ) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Kiểm tra va chạm với người chơi
      for (const playerId in this.players) {
        const player = this.players[playerId];
        if (
          player.id !== bullet.ownerId &&
          this.checkCollision(bullet, player)
        ) {
          player.takeDamage(20);
          this.bullets.splice(i, 1);
          this.updateUI();

          if (player.health <= 0) {
            this.gameOver(
              playerId === this.playerId ? "You Lost!" : "You Won!"
            );
          }
          break;
        }
      }
    }

    // Cập nhật hiệu ứng lửa bắn
    this.updateMuzzleFlashes();

    // Cập nhật hiệu ứng khói
    this.updateSmokeParticles();
  }

  checkCollision(bullet, player) {
    const dx = bullet.x - player.x;
    const dy = bullet.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 25; // Bán kính xe tăng + bán kính đạn
  }

  gameOver(message) {
    this.gameState = "gameOver";

    // Cập nhật điểm dựa trên người thắng
    if (message.includes("You Won")) {
      this.scores[this.playerId]++;
    } else if (message.includes("You Lost")) {
      const otherPlayer = this.playerId === "player1" ? "player2" : "player1";
      this.scores[otherPlayer]++;
    }

    this.updateUI();

    // Hiển thị thông báo kết thúc game ngắn gọn, sau đó khởi động lại
    this.showOverlay("Round Over!", message, false);

    // Tự động khởi động lại sau 3 giây
    setTimeout(() => {
      this.restartGame();
    }, 3000);
  }

  restartGame() {
    this.gameState = "restarting";
    this.gameCount++;
    this.bullets = [];

    // Đặt lại máu và đạn của người chơi
    if (this.players.player1) {
      this.players.player1.health = 100;
      this.players.player1.ammo = 15;
      this.players.player1.x = 100;
      this.players.player1.y = 300;
    }
    if (this.players.player2) {
      this.players.player2.health = 100;
      this.players.player2.ammo = 15;
      this.players.player2.x = 900;
      this.players.player2.y = 300;
    }

    this.hideOverlay();
    this.gameState = "playing";
    this.updateUI();

    console.log(
      `Game ${this.gameCount} started! Scores: Player1: ${this.scores.player1}, Player2: ${this.scores.player2}`
    );
  }

  showOverlay(title, message, showJoin = false) {
    const overlay = document.getElementById("game-overlay");
    if (!overlay) {
      console.error("Game overlay element not found");
      return;
    }

    const titleElement = document.getElementById("overlay-title");
    const messageElement = document.getElementById("overlay-message");
    const joinBtn = document.getElementById("join-btn");

    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    if (joinBtn) joinBtn.style.display = showJoin ? "inline-block" : "none";

    overlay.classList.remove("hidden");
  }

  render() {
    // Xóa canvas
    this.ctx.fillStyle = "#7f8c8d";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Vẽ lưới
    this.drawGrid();

    // Vẽ người chơi
    for (const playerId in this.players) {
      this.players[playerId].render(this.ctx);
    }

    // Vẽ đạn
    this.bullets.forEach((bullet) => bullet.render(this.ctx));

    // Vẽ hiệu ứng lửa bắn
    this.renderMuzzleFlashes();

    // Vẽ hiệu ứng khói
    this.renderSmokeParticles();

    // Vẽ tâm ngắm
    if (this.gameState === "playing") {
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.mouse.x - 10, this.mouse.y);
      this.ctx.lineTo(this.mouse.x + 10, this.mouse.y);
      this.ctx.moveTo(this.mouse.x, this.mouse.y - 10);
      this.ctx.lineTo(this.mouse.x, this.mouse.y + 10);
      this.ctx.stroke();
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 1;

    // Đường thẳng đứng
    for (let x = 0; x <= this.canvas.width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // Đường thẳng ngang
    for (let y = 0; y <= this.canvas.height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.gameState === "playing") {
      this.handleInput();
      this.updateBullets();
    }

    this.render();
    this.updateUI();

    requestAnimationFrame((time) => this.gameLoop(time));
  }
}

class Tank {
  constructor(x, y, id, color) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.color = color;
    this.angle = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.ammo = 15;
    this.maxAmmo = 15;
    this.radius = 25;
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Thân xe tăng (phần chính) - hình chữ nhật màu xanh ô liu
    ctx.fillStyle = "#8B9A46";
    ctx.fillRect(
      -this.radius,
      -this.radius * 0.6,
      this.radius * 2,
      this.radius * 1.2
    );

    // Xích xe tăng - các phần nâu đậm ở trên dưới
    ctx.fillStyle = "#6a6d37";
    ctx.fillRect(-this.radius * 0.8, -this.radius - 0.1, this.radius * 1.7, 8);
    ctx.fillRect(-this.radius * 0.8, this.radius - 8, this.radius * 1.7, 8);

    // Chi tiết xích - các đoạn xích riêng lẻ
    ctx.fillStyle = "#565830FF";
    for (let i = 0; i < 6; i++) {
      const x = -this.radius * 0.8 + i * this.radius * 0.28;
      ctx.fillRect(x, -this.radius - 0.1, 3, 8);
      ctx.fillRect(x, this.radius - 8, 3, 8);
    }

    // Tháp pháo xe tăng - hình lục giác
    ctx.fillStyle = "#9BAF5A";
    const turretWidth = this.radius * 1.4;
    const turretHeight = this.radius * 0.9;
    ctx.beginPath();
    ctx.moveTo(-turretWidth / 3, -turretHeight / 2);
    ctx.lineTo(turretWidth / 3, -turretHeight / 2);
    ctx.lineTo(turretWidth / 2, -turretHeight / 4);
    ctx.lineTo(turretWidth / 2, turretHeight / 4);
    ctx.lineTo(turretWidth / 3, turretHeight / 2);
    ctx.lineTo(-turretWidth / 3, turretHeight / 2);
    ctx.lineTo(-turretWidth / 2, turretHeight / 4);
    ctx.lineTo(-turretWidth / 2, -turretHeight / 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#404921FF";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Chi tiết tháp pháo - các phần tử hình tròn và chữ nhật
    ctx.fillStyle = "#6B7C32";

    // Nóc chỉ huy (đặc điểm hình tròn lớn)
    ctx.beginPath();
    ctx.arc(
      turretWidth / 6,
      -turretHeight / 4,
      this.radius * 0.2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Viền đen cho nóc chỉ huy
    ctx.strokeStyle = "#404921FF";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Chi tiết hình tròn nhỏ
    ctx.beginPath();
    ctx.arc(
      -turretWidth / 4,
      -turretHeight / 4,
      this.radius * 0.12,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      turretWidth / 4,
      turretHeight / 4,
      this.radius * 0.08,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Chi tiết hình chữ nhật
    ctx.fillRect(
      turretWidth / 4,
      -turretHeight / 6,
      this.radius * 0.25,
      this.radius * 0.15
    );
    ctx.fillRect(
      -turretWidth / 3,
      turretHeight / 6,
      this.radius * 0.2,
      this.radius * 0.1
    );

    // Viền xe tăng - xanh đậm hơn
    ctx.strokeStyle = "#505C28FF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Viền thân xe
    ctx.beginPath();
    ctx.moveTo(-this.radius, -this.radius * 0.6);
    ctx.lineTo(this.radius * 0.7, -this.radius * 0.7);
    ctx.lineTo(this.radius, -this.radius * 0.4);
    ctx.lineTo(this.radius, this.radius * 0.4);
    ctx.lineTo(this.radius * 0.7, this.radius * 0.7);
    ctx.lineTo(-this.radius, this.radius * 0.6);
    ctx.lineTo(-this.radius, -this.radius * 0.6);
    ctx.closePath();
    ctx.stroke();

    // Nòng súng chính - dài và mỏng (vẽ sau viền để đè lên)
    ctx.fillStyle = "#616B34FF";
    const barrelLength = this.radius * 1.5;
    const barrelWidth = this.radius * 0.15;
    ctx.fillRect(turretWidth / 2, -barrelWidth / 2, barrelLength, barrelWidth);

    // Thêm viền cho nòng súng
    ctx.strokeStyle = "#6B7C32";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      turretWidth / 2,
      -barrelWidth / 2,
      barrelLength,
      barrelWidth
    );

    // Miệng súng - đầu được gia cố
    ctx.fillStyle = "#455023FF";
    ctx.fillRect(
      turretWidth / 2 + barrelLength,
      -barrelWidth / 2 - 2,
      4,
      barrelWidth + 4
    );

    // Viền xích
    ctx.fillStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      -this.radius * 0.8,
      -this.radius - 0.1,
      this.radius * 1.7,
      8
    );
    ctx.strokeRect(-this.radius * 0.8, this.radius - 8, this.radius * 1.7, 8);

    // Thanh máu
    ctx.restore();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(this.x - 30, this.y - 40, 60, 8);
    ctx.fillStyle =
      this.health > 50 ? "#27ae60" : this.health > 25 ? "#f39c12" : "#e74c3c";
    ctx.fillRect(
      this.x - 30,
      this.y - 40,
      (this.health / this.maxHealth) * 60,
      8
    );

    // ID người chơi
    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeText(this.id.toUpperCase(), this.x, this.y - 50);
    ctx.fillText(this.id.toUpperCase(), this.x, this.y - 50);
  }
}

class Bullet {
  constructor(x, y, angle, ownerId) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.ownerId = ownerId;
    this.speed = 8;
    this.radius = 3;
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Vẽ đạn hình nhọn (tam giác)
    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    ctx.moveTo(this.radius * 2, 0); // Đầu nhọn
    ctx.lineTo(-this.radius, -this.radius * 0.5); // Góc trái
    ctx.lineTo(-this.radius, this.radius * 0.5); // Góc phải
    ctx.closePath();
    ctx.fill();

    // Viền đen cho đạn
    ctx.strokeStyle = "#C2560EFF";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hiệu ứng vệt đạn (hình nhọn phía sau)
    ctx.fillStyle = "rgba(243, 156, 18, 0.3)";
    ctx.beginPath();
    ctx.moveTo(this.radius, 0);
    ctx.lineTo(-this.radius * 0.5, -this.radius * 0.3);
    ctx.lineTo(-this.radius * 0.5, this.radius * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

class MuzzleFlashParticle {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;

    // Tạo hướng bay ngẫu nhiên xung quanh hướng nòng súng
    const spread = (Math.random() - 0.5) * 0.6; // Góc spread ±30 độ
    this.velocityAngle = angle + spread;

    // Tốc độ ngẫu nhiên
    this.speed = 2 + Math.random() * 4;
    this.vx = Math.cos(this.velocityAngle) * this.speed;
    this.vy = Math.sin(this.velocityAngle) * this.speed;

    // Thuộc tính hiệu ứng
    this.life = 1.0;
    this.maxLife = 1.0;
    this.size = 2 + Math.random() * 3;
    this.color = this.getRandomFireColor();
  }

  getRandomFireColor() {
    const colors = [
      "#ff4500", // Cam đỏ
      "#ff6500", // Cam
      "#ff8500", // Cam vàng
      "#ffa500", // Cam nhạt
      "#ffff00", // Vàng
      "#ff0000", // Đỏ
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Giảm tốc độ theo thời gian
    this.vx *= 0.98;
    this.vy *= 0.98;

    // Giảm kích thước
    this.size *= 0.95;

    // Giảm tuổi thọ
    this.life -= 0.05;
  }

  render(ctx) {
    if (this.life <= 0) return;

    ctx.save();

    // Độ trong suốt dựa trên tuổi thọ
    const alpha = this.life;

    // Vẽ hạt lửa
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;

    // Tạo hiệu ứng lửa với gradient
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.5, this.color + "80");
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Vẽ lõi sáng
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class SmokeParticle {
  constructor(player) {
    // Vị trí khói ở phía sau xe tăng
    const backAngle = player.angle + Math.PI; // Góc ngược lại
    const offset = 20 + Math.random() * 10; // Khoảng cách từ tâm xe
    this.x = player.x + Math.cos(backAngle) * offset;
    this.y = player.y + Math.sin(backAngle) * offset;

    // Thêm một chút ngẫu nhiên cho vị trí
    this.x += (Math.random() - 0.5) * 15;
    this.y += (Math.random() - 0.5) * 15;

    // Tốc độ bay lên và ra ngoài
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = -0.5 - Math.random() * 1.5; // Bay lên

    // Thuộc tính hiệu ứng
    this.life = 1.0;
    this.maxLife = 1.0;
    this.size = 4 + Math.random() * 6;
    this.alpha = 0.3 + Math.random() * 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Giảm tốc độ theo thời gian
    this.vx *= 0.98;
    this.vy *= 0.98;

    // Tăng kích thước (khói lan ra)
    this.size += 0.1;

    // Giảm tuổi thọ
    this.life -= 0.005;

    // Giảm độ trong suốt
    this.alpha *= 0.91;
  }

  render(ctx) {
    if (this.life <= 0 || this.alpha <= 0) return;

    ctx.save();

    // Độ trong suốt dựa trên tuổi thọ và alpha
    ctx.globalAlpha = this.life * this.alpha;

    // Tạo hiệu ứng khói với gradient
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size
    );
    gradient.addColorStop(0, "rgba(220, 220, 220, 0.4)");
    gradient.addColorStop(0.3, "rgba(180, 180, 180, 0.2)");
    gradient.addColorStop(0.7, "rgba(140, 140, 140, 0.1)");
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Thêm một lớp khói mờ bên ngoài
    ctx.globalAlpha = this.life * this.alpha * 0.3;
    ctx.fillStyle = "rgba(160, 160, 160, 0.15)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Khởi tạo game khi trang được tải
document.addEventListener("DOMContentLoaded", () => {
  new TankBattleGame();
});
