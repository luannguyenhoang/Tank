const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

class TankBattleServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        this.rooms = new Map(); // roomCode -> room data
        this.players = new Map(); // ws -> player data
        
        this.setupServer();
        this.setupWebSocket();
    }
    
    setupServer() {
        this.server.on('request', (req, res) => {
            let filePath = req.url === '/' ? '/index.html' : req.url;
            filePath = path.join(__dirname, filePath);
            
            const extname = path.extname(filePath);
            const contentType = this.getContentType(extname);
            
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - File Not Found</h1>');
                    } else {
                        res.writeHead(500);
                        res.end('Server Error: ' + err.code);
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        });
    }
    
    getContentType(extname) {
        const types = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.woff': 'application/font-woff',
            '.ttf': 'application/font-ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'application/font-otf',
            '.wasm': 'application/wasm'
        };
        return types[extname] || 'application/octet-stream';
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('New player connected');
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            
            ws.on('close', () => {
                this.handleDisconnect(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
    }
    
    handleMessage(ws, data) {
        switch (data.type) {
            case 'createRoom':
                this.createRoom(ws, data);
                break;
            case 'joinRoom':
                this.joinRoom(ws, data);
                break;
            case 'startGame':
                this.startGame(ws, data);
                break;
            case 'gameUpdate':
                this.handleGameUpdate(ws, data);
                break;
            case 'shoot':
                this.handleShoot(ws, data);
                break;
            case 'reload':
                this.handleReload(ws, data);
                break;
            case 'leaveRoom':
                this.leaveRoom(ws, data);
                break;
        }
    }
    
    createRoom(ws, data) {
        const roomCode = data.roomCode;
        const playerId = 'player1';
        
        if (this.rooms.has(roomCode)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Room code already exists'
            }));
            return;
        }
        
        const room = {
            code: roomCode,
            players: new Map(),
            bullets: [],
            state: 'waiting', // waiting, playing, finished
            createdAt: Date.now(),
            host: ws
        };
        
        room.players.set(playerId, {
            id: playerId,
            ws: ws,
            x: 100,
            y: 300,
            angle: 0,
            health: 100,
            ammo: 30,
            color: '#3498db'
        });
        
        this.rooms.set(roomCode, room);
        this.players.set(ws, { roomCode, playerId });
        
        ws.send(JSON.stringify({
            type: 'roomCreated',
            roomCode: roomCode,
            playerId: playerId
        }));
        
        console.log(`Room ${roomCode} created by player ${playerId}`);
    }
    
    joinRoom(ws, data) {
        const roomCode = data.roomCode;
        const room = this.rooms.get(roomCode);
        
        if (!room) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Room not found'
            }));
            return;
        }
        
        if (room.players.size >= 2) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Room is full'
            }));
            return;
        }
        
        if (room.state !== 'waiting') {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Game already started'
            }));
            return;
        }
        
        const playerId = 'player2';
        room.players.set(playerId, {
            id: playerId,
            ws: ws,
            x: 900,
            y: 300,
            angle: 0,
            health: 100,
            ammo: 30,
            color: '#e74c3c'
        });
        
        this.players.set(ws, { roomCode, playerId });
        
        // Notify all players in the room
        this.broadcastToRoom(roomCode, {
            type: 'playerJoined',
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.id === 'player1' ? 'Player 1' : 'Player 2',
                status: 'ready'
            }))
        });
        
        console.log(`Player ${playerId} joined room ${roomCode}`);
    }
    
    startGame(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const room = this.rooms.get(playerInfo.roomCode);
        if (!room || room.state !== 'waiting') return;
        
        // Only host can start the game
        if (room.host !== ws) return;
        
        room.state = 'playing';
        
        // Notify all players in the room
        this.broadcastToRoom(playerInfo.roomCode, {
            type: 'gameStarted',
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                x: p.x,
                y: p.y,
                health: p.health,
                ammo: p.ammo,
                color: p.color
            }))
        });
        
        console.log(`Game started in room ${playerInfo.roomCode}`);
    }
    
    handleGameUpdate(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const room = this.rooms.get(playerInfo.roomCode);
        if (!room || room.state !== 'playing') return;
        
        const player = room.players.get(playerInfo.playerId);
        if (!player) return;
        
        // Update player position and angle
        player.x = data.x;
        player.y = data.y;
        player.angle = data.angle;
        
        // Broadcast update to other players
        this.broadcastToRoom(playerInfo.roomCode, {
            type: 'gameUpdate',
            playerId: playerInfo.playerId,
            x: player.x,
            y: player.y,
            angle: player.angle
        }, ws);
    }
    
    handleShoot(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const room = this.rooms.get(playerInfo.roomCode);
        if (!room || room.state !== 'playing') return;
        
        const player = room.players.get(playerInfo.playerId);
        if (!player || player.ammo <= 0) return;
        
        player.ammo--;
        
        const bullet = {
            id: Date.now() + Math.random(),
            x: data.x,
            y: data.y,
            angle: data.angle,
            ownerId: playerInfo.playerId,
            speed: 8,
            createdAt: Date.now()
        };
        
        room.bullets.push(bullet);
        
        // Broadcast bullet to all players
        this.broadcastToRoom(playerInfo.roomCode, {
            type: 'bulletShot',
            bullet: bullet
        });
        
        // Check for collisions
        this.checkBulletCollisions(room);
    }
    
    handleReload(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const room = this.rooms.get(playerInfo.roomCode);
        if (!room || room.state !== 'playing') return;
        
        const player = room.players.get(playerInfo.playerId);
        if (!player) return;
        
        player.ammo = Math.min(30, player.ammo + 10);
        
        this.broadcastToRoom(playerInfo.roomCode, {
            type: 'playerReloaded',
            playerId: playerInfo.playerId,
            ammo: player.ammo
        });
    }
    
    leaveRoom(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const room = this.rooms.get(playerInfo.roomCode);
        if (room) {
            room.players.delete(playerInfo.playerId);
            
            if (room.players.size === 0) {
                this.rooms.delete(playerInfo.roomCode);
            } else {
                this.broadcastToRoom(playerInfo.roomCode, {
                    type: 'playerLeft',
                    playerId: playerInfo.playerId
                });
            }
        }
        
        this.players.delete(ws);
        console.log(`Player ${playerInfo.playerId} left room ${playerInfo.roomCode}`);
    }
    
    checkBulletCollisions(room) {
        for (let i = room.bullets.length - 1; i >= 0; i--) {
            const bullet = room.bullets[i];
            
            // Remove old bullets
            if (Date.now() - bullet.createdAt > 5000) {
                room.bullets.splice(i, 1);
                continue;
            }
            
            // Check collision with players
            for (const [playerId, player] of room.players) {
                if (playerId !== bullet.ownerId) {
                    const dx = bullet.x - player.x;
                    const dy = bullet.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 25) {
                        // Hit!
                        player.health = Math.max(0, player.health - 20);
                        room.bullets.splice(i, 1);
                        
                        this.broadcastToRoom(room.code, {
                            type: 'playerHit',
                            playerId: playerId,
                            health: player.health,
                            bulletId: bullet.id
                        });
                        
                        if (player.health <= 0) {
                            this.endGame(room, bullet.ownerId);
                        }
                        break;
                    }
                }
            }
        }
    }
    
    endGame(room, winnerId) {
        room.state = 'finished';
        
        this.broadcastToRoom(room.code, {
            type: 'gameEnded',
            winner: winnerId
        });
        
        // Clean up room after 30 seconds
        setTimeout(() => {
            this.rooms.delete(room.code);
        }, 30000);
    }
    
    handleDisconnect(ws) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const room = this.rooms.get(playerInfo.roomCode);
        if (room) {
            room.players.delete(playerInfo.playerId);
            
            if (room.players.size === 0) {
                this.rooms.delete(playerInfo.roomCode);
            } else {
                this.broadcastToRoom(playerInfo.roomCode, {
                    type: 'playerDisconnected',
                    playerId: playerInfo.playerId
                });
            }
        }
        
        this.players.delete(ws);
        console.log(`Player ${playerInfo.playerId} disconnected`);
    }
    
    broadcastToRoom(roomCode, message, excludeWs = null) {
        const room = this.rooms.get(roomCode);
        if (!room) return;
        
        for (const player of room.players.values()) {
            if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        }
    }
    
    start() {
        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`Tank Battle Server running on port ${this.port}`);
            console.log(`Open http://localhost:${this.port} to play!`);
            console.log(`For multiplayer on different computers:`);
            console.log(`- Get your IP address and share it`);
            console.log(`- Others can access: http://YOUR_IP:${this.port}`);
        });
    }
}

// Start server
const port = process.env.PORT || 8080;
const server = new TankBattleServer(port);
server.start();
