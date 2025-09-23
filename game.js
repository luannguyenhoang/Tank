class TankBattleGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'waiting'; // waiting, playing, gameOver
        this.playerId = null;
        this.players = {};
        this.bullets = [];
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.lastTime = 0;
        this.gameId = null;
        this.roomCode = null;
        this.isHost = false;
        this.ws = null;
        this.currentView = 'modes'; // modes, room-creation, room-joining, waiting-room
        this.scores = { player1: 0, player2: 0 };
        this.gameCount = 0;
        
        this.setupEventListeners();
        this.setupUI();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.shoot();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                this.reload();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') {
                this.shoot();
            }
        });
    }
    
    setupUI() {
        // Game mode buttons
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.showRoomCreation();
        });
        
        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.showRoomJoining();
        });
        
        document.getElementById('single-player-btn').addEventListener('click', () => {
            this.startSinglePlayer();
        });
        
        // Room creation
        document.getElementById('start-room-btn').addEventListener('click', () => {
            this.startRoomGame();
        });
        
        document.getElementById('copy-code-btn').addEventListener('click', () => {
            this.copyRoomCode();
        });
        
        // Room joining
        document.getElementById('connect-room-btn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        // Back buttons
        document.getElementById('back-to-modes-btn').addEventListener('click', () => {
            this.showGameModes();
        });
        
        document.getElementById('back-to-modes-btn-2').addEventListener('click', () => {
            this.showGameModes();
        });
        
        // Waiting room
        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        document.getElementById('start-room-btn-waiting').addEventListener('click', () => {
            this.startRoomGame();
        });
        
        document.getElementById('copy-code-waiting-btn').addEventListener('click', () => {
            this.copyRoomCodeWaiting();
        });
        
        // Room code input
        document.getElementById('room-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });
    }
    
    // UI View Management
    showGameModes() {
        this.currentView = 'modes';
        this.hideAllViews();
        document.getElementById('game-modes').style.display = 'block';
        document.getElementById('overlay-title').textContent = 'Tank Battle 1v1';
        document.getElementById('overlay-message').textContent = 'Choose your game mode!';
    }
    
    showRoomCreation() {
        this.currentView = 'room-creation';
        this.hideAllViews();
        document.getElementById('room-creation').style.display = 'block';
        this.createRoom();
    }
    
    showRoomJoining() {
        this.currentView = 'room-joining';
        this.hideAllViews();
        document.getElementById('room-joining').style.display = 'block';
        document.getElementById('room-code-input').focus();
    }
    
    showWaitingRoom() {
        this.currentView = 'waiting-room';
        this.hideAllViews();
        document.getElementById('waiting-room').style.display = 'block';
        
        // Update room code in waiting room
        if (this.roomCode) {
            document.getElementById('room-code-waiting').textContent = this.roomCode;
        }
    }
    
    hideAllViews() {
        document.getElementById('game-modes').style.display = 'none';
        document.getElementById('room-creation').style.display = 'none';
        document.getElementById('room-joining').style.display = 'none';
        document.getElementById('waiting-room').style.display = 'none';
    }
    
    // Room Management
    createRoom() {
        this.roomCode = this.generateRoomCode();
        this.isHost = true;
        document.getElementById('room-code-display').textContent = this.roomCode;
        this.connectWebSocket();
    }
    
    joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.toUpperCase();
        if (!roomCode || roomCode.length !== 6) {
            alert('Please enter a valid 6-character room code!');
            return;
        }
        
        this.roomCode = roomCode;
        this.isHost = false;
        this.connectWebSocket();
    }
    
    connectWebSocket() {
        // For Railway deployment, use wss protocol
        const protocol = 'wss:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to server');
            if (this.isHost) {
                this.ws.send(JSON.stringify({
                    type: 'createRoom',
                    roomCode: this.roomCode
                }));
            } else {
                this.ws.send(JSON.stringify({
                    type: 'joinRoom',
                    roomCode: this.roomCode
                }));
            }
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.showGameModes();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('Connection failed. Please try again.');
            this.showGameModes();
        };
    }
    
    handleWebSocketMessage(data) {
        console.log('Received WebSocket message:', data);
        
        switch (data.type) {
            case 'roomCreated':
                this.showWaitingRoom();
                this.updateWaitingRoom([{ id: 'player1', name: 'You', status: 'ready' }]);
                break;
                
            case 'roomJoined':
                this.showWaitingRoom();
                this.updateWaitingRoom(data.players);
                break;
                
            case 'playerJoined':
                this.updateWaitingRoom(data.players);
                break;
                
            case 'gameStarted':
                console.log('Game started message received:', data);
                this.startMultiplayerGame(data.players);
                break;
                
            case 'gameUpdate':
                this.handleGameUpdate(data);
                break;
                
            case 'bulletShot':
                this.handleBulletShot(data);
                break;
                
            case 'playerHit':
                this.handlePlayerHit(data);
                break;
                
            case 'playerDisconnected':
                this.handlePlayerDisconnected(data);
                break;
                
            case 'gameEnded':
                this.handleGameEnd(data);
                break;
                
            case 'error':
                alert(data.message);
                this.showGameModes();
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    startSinglePlayer() {
        this.gameState = 'playing';
        this.playerId = 'player1';
        this.players = {
            player1: new Tank(100, 300, 'player1', '#3498db'),
            player2: new Tank(900, 300, 'player2', '#e74c3c')
        };
        this.hideOverlay();
        this.updateUI();
    }
    
    startRoomGame() {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: 'startGame'
            }));
        }
    }
    
    startMultiplayerGame(players) {
        console.log('Starting multiplayer game with players:', players);
        this.gameState = 'playing';
        this.players = {};
        
        // Find which player is me based on WebSocket connection
        let myPlayerId = null;
        if (this.isHost) {
            myPlayerId = 'player1';
        } else {
            myPlayerId = 'player2';
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
        
        console.log('My player ID:', this.playerId);
        console.log('All players:', this.players);
        console.log('Is host:', this.isHost);
        
        this.hideOverlay();
        this.updateUI();
    }
    
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    copyRoomCode() {
        navigator.clipboard.writeText(this.roomCode).then(() => {
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }
    
    copyRoomCodeWaiting() {
        navigator.clipboard.writeText(this.roomCode).then(() => {
            const btn = document.getElementById('copy-code-waiting-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }
    
    updateWaitingRoom(players) {
        const player1Element = document.getElementById('player1-waiting');
        const player2Element = document.getElementById('player2-waiting');
        const startBtn = document.getElementById('start-room-btn-waiting');
        
        player1Element.querySelector('.player-status').textContent = 'Ready';
        player1Element.querySelector('.player-status').className = 'player-status ready';
        
        if (players.length > 1) {
            player2Element.querySelector('.player-status').textContent = 'Ready';
            player2Element.querySelector('.player-status').className = 'player-status ready';
            
            // Show start button for host when 2 players are ready
            if (this.isHost) {
                startBtn.style.display = 'inline-block';
            }
        } else {
            player2Element.querySelector('.player-status').textContent = 'Waiting...';
            player2Element.querySelector('.player-status').className = 'player-status waiting';
            startBtn.style.display = 'none';
        }
    }
    
    leaveRoom() {
        if (this.ws) {
            this.ws.close();
        }
        this.showGameModes();
    }
    
    hideOverlay() {
        document.getElementById('game-overlay').classList.add('hidden');
    }
    
    showOverlay(title, message, showJoin = false) {
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-message').textContent = message;
        document.getElementById('join-btn').style.display = showJoin ? 'inline-block' : 'none';
        document.getElementById('game-overlay').classList.remove('hidden');
    }
    
    updateUI() {
        if (this.players.player1) {
            document.getElementById('player1-health').textContent = `Health: ${this.players.player1.health}`;
            document.getElementById('player1-ammo').textContent = `Ammo: ${this.players.player1.ammo}`;
        }
        if (this.players.player2) {
            document.getElementById('player2-health').textContent = `Health: ${this.players.player2.health}`;
            document.getElementById('player2-ammo').textContent = `Ammo: ${this.players.player2.ammo}`;
        }
        
        // Update scores
        document.getElementById('player1-score').textContent = `Score: ${this.scores.player1}`;
        document.getElementById('player2-score').textContent = `Score: ${this.scores.player2}`;
        
        let status = 'Waiting for players...';
        if (this.gameState === 'playing') {
            status = `Game ${this.gameCount} in progress!`;
        } else if (this.gameState === 'gameOver') {
            status = 'Game Over!';
        } else if (this.gameState === 'restarting') {
            status = 'Restarting in 3 seconds...';
        }
        document.getElementById('game-status').textContent = status;
    }
    
    handleInput() {
        if (this.gameState !== 'playing' || !this.playerId || !this.players[this.playerId]) {
            console.log('Input blocked - gameState:', this.gameState, 'playerId:', this.playerId, 'players:', this.players);
            return;
        }
        
        const player = this.players[this.playerId];
        const speed = 3;
        let moved = false;
        
        // Movement
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            player.y -= speed;
            moved = true;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            player.y += speed;
            moved = true;
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            player.x -= speed;
            moved = true;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            player.x += speed;
            moved = true;
        }
        
        // Keep tank within bounds
        player.x = Math.max(25, Math.min(this.canvas.width - 25, player.x));
        player.y = Math.max(25, Math.min(this.canvas.height - 25, player.y));
        
        // Update tank angle based on mouse position
        const dx = this.mouse.x - player.x;
        const dy = this.mouse.y - player.y;
        player.angle = Math.atan2(dy, dx);
        
        // Send update to server if moved (only in multiplayer)
        if (moved && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'gameUpdate',
                x: player.x,
                y: player.y,
                angle: player.angle
            }));
        }
    }
    
    shoot() {
        if (this.gameState !== 'playing' || !this.playerId || !this.players[this.playerId]) return;
        
        const player = this.players[this.playerId];
        if (player.ammo <= 0) return;
        
        player.ammo--;
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Multiplayer mode - send to server
            this.ws.send(JSON.stringify({
                type: 'shoot',
                x: player.x + Math.cos(player.angle) * 30,
                y: player.y + Math.sin(player.angle) * 30,
                angle: player.angle
            }));
        } else {
            // Single player mode - create bullet locally
            const bullet = new Bullet(
                player.x + Math.cos(player.angle) * 30,
                player.y + Math.sin(player.angle) * 30,
                player.angle,
                player.id
            );
            this.bullets.push(bullet);
        }
        
        this.updateUI();
    }
    
    reload() {
        if (this.gameState !== 'playing' || !this.playerId || !this.players[this.playerId]) return;
        
        const player = this.players[this.playerId];
        player.ammo = Math.min(30, player.ammo + 10);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'reload'
            }));
        }
        
        this.updateUI();
    }
    
    // WebSocket message handlers
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
        console.log('Player disconnected:', data.playerId);
        if (this.players[data.playerId]) {
            delete this.players[data.playerId];
        }
        
        // If it's the other player who disconnected, you win
        if (data.playerId !== this.playerId) {
            this.scores[this.playerId]++;
            this.updateUI();
            this.showOverlay('Game Over!', 'You Won! (Opponent disconnected)', true);
        }
    }
    
    handleGameEnd(data) {
        this.gameState = 'gameOver';
        const message = data.winner === this.playerId ? 'You Won!' : 'You Lost!';
        this.showOverlay('Game Over!', message, true);
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();
            
            // Remove bullets that are out of bounds
            if (bullet.x < 0 || bullet.x > this.canvas.width || 
                bullet.y < 0 || bullet.y > this.canvas.height) {
                this.bullets.splice(i, 1);
                continue;
            }
            
            // Check collision with players
            for (const playerId in this.players) {
                const player = this.players[playerId];
                if (player.id !== bullet.ownerId && this.checkCollision(bullet, player)) {
                    player.takeDamage(20);
                    this.bullets.splice(i, 1);
                    this.updateUI();
                    
                    if (player.health <= 0) {
                        this.gameOver(playerId === this.playerId ? 'You Lost!' : 'You Won!');
                    }
                    break;
                }
            }
        }
    }
    
    checkCollision(bullet, player) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 25; // Tank radius + bullet radius
    }
    
    gameOver(message) {
        this.gameState = 'gameOver';
        
        // Update scores based on winner
        if (message.includes('You Won')) {
            this.scores[this.playerId]++;
        } else if (message.includes('You Lost')) {
            const otherPlayer = this.playerId === 'player1' ? 'player2' : 'player1';
            this.scores[otherPlayer]++;
        }
        
        this.updateUI();
        
        // Show game over message briefly, then restart
        this.showOverlay('Round Over!', message, false);
        
        // Auto restart after 3 seconds
        setTimeout(() => {
            this.restartGame();
        }, 3000);
    }
    
    restartGame() {
        this.gameState = 'restarting';
        this.gameCount++;
        this.bullets = [];
        
        // Reset player health and ammo
        if (this.players.player1) {
            this.players.player1.health = 100;
            this.players.player1.ammo = 30;
            this.players.player1.x = 100;
            this.players.player1.y = 300;
        }
        if (this.players.player2) {
            this.players.player2.health = 100;
            this.players.player2.ammo = 30;
            this.players.player2.x = 900;
            this.players.player2.y = 300;
        }
        
        this.hideOverlay();
        this.gameState = 'playing';
        this.updateUI();
        
        console.log(`Game ${this.gameCount} started! Scores: Player1: ${this.scores.player1}, Player2: ${this.scores.player2}`);
    }
    
    showOverlay(title, message, showJoin = false) {
        const overlay = document.getElementById('game-overlay');
        if (!overlay) {
            console.error('Game overlay element not found');
            return;
        }
        
        const titleElement = document.getElementById('overlay-title');
        const messageElement = document.getElementById('overlay-message');
        const joinBtn = document.getElementById('join-btn');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        if (joinBtn) joinBtn.style.display = showJoin ? 'inline-block' : 'none';
        
        overlay.classList.remove('hidden');
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#27ae60';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw players
        for (const playerId in this.players) {
            this.players[playerId].render(this.ctx);
        }
        
        // Draw bullets
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        
        // Draw crosshair
        if (this.gameState === 'playing') {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
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
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
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
        
        if (this.gameState === 'playing') {
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
        this.ammo = 30;
        this.maxAmmo = 30;
        this.radius = 25;
    }
    
    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Tank body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Tank barrel
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.radius - 5, -3, 20, 6);
        
        // Health bar
        ctx.restore();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x - 30, this.y - 40, 60, 8);
        ctx.fillStyle = this.health > 50 ? '#27ae60' : this.health > 25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(this.x - 30, this.y - 40, (this.health / this.maxHealth) * 60, 8);
        
        // Player ID
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
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
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet trail effect
        ctx.fillStyle = 'rgba(243, 156, 18, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - Math.cos(this.angle) * 10, this.y - Math.sin(this.angle) * 10, this.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TankBattleGame();
});
