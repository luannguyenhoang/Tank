const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

class TankBattleServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        this.games = new Map();
        this.players = new Map();
        
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
            case 'createGame':
                this.createGame(ws, data);
                break;
            case 'joinGame':
                this.joinGame(ws, data);
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
        }
    }
    
    createGame(ws, data) {
        const gameId = this.generateGameId();
        const playerId = 'player1';
        
        const game = {
            id: gameId,
            players: new Map(),
            bullets: [],
            state: 'waiting', // waiting, playing, finished
            createdAt: Date.now()
        };
        
        game.players.set(playerId, {
            id: playerId,
            ws: ws,
            x: 100,
            y: 300,
            angle: 0,
            health: 100,
            ammo: 30,
            color: '#3498db'
        });
        
        this.games.set(gameId, game);
        this.players.set(ws, { gameId, playerId });
        
        ws.send(JSON.stringify({
            type: 'gameCreated',
            gameId: gameId,
            playerId: playerId
        }));
        
        console.log(`Game ${gameId} created by player ${playerId}`);
    }
    
    joinGame(ws, data) {
        const gameId = data.gameId;
        const game = this.games.get(gameId);
        
        if (!game) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Game not found'
            }));
            return;
        }
        
        if (game.players.size >= 2) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Game is full'
            }));
            return;
        }
        
        const playerId = 'player2';
        game.players.set(playerId, {
            id: playerId,
            ws: ws,
            x: 900,
            y: 300,
            angle: 0,
            health: 100,
            ammo: 30,
            color: '#e74c3c'
        });
        
        this.players.set(ws, { gameId, playerId });
        game.state = 'playing';
        
        // Notify all players in the game
        this.broadcastToGame(gameId, {
            type: 'gameStarted',
            players: Array.from(game.players.values()).map(p => ({
                id: p.id,
                x: p.x,
                y: p.y,
                health: p.health,
                ammo: p.ammo,
                color: p.color
            }))
        });
        
        console.log(`Player ${playerId} joined game ${gameId}`);
    }
    
    handleGameUpdate(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const game = this.games.get(playerInfo.gameId);
        if (!game || game.state !== 'playing') return;
        
        const player = game.players.get(playerInfo.playerId);
        if (!player) return;
        
        // Update player position and angle
        player.x = data.x;
        player.y = data.y;
        player.angle = data.angle;
        
        // Broadcast update to other players
        this.broadcastToGame(playerInfo.gameId, {
            type: 'playerUpdate',
            playerId: playerInfo.playerId,
            x: player.x,
            y: player.y,
            angle: player.angle
        }, ws);
    }
    
    handleShoot(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const game = this.games.get(playerInfo.gameId);
        if (!game || game.state !== 'playing') return;
        
        const player = game.players.get(playerInfo.playerId);
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
        
        game.bullets.push(bullet);
        
        // Broadcast bullet to all players
        this.broadcastToGame(playerInfo.gameId, {
            type: 'bulletShot',
            bullet: bullet
        });
        
        // Check for collisions
        this.checkBulletCollisions(game);
    }
    
    handleReload(ws, data) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const game = this.games.get(playerInfo.gameId);
        if (!game || game.state !== 'playing') return;
        
        const player = game.players.get(playerInfo.playerId);
        if (!player) return;
        
        player.ammo = Math.min(30, player.ammo + 10);
        
        this.broadcastToGame(playerInfo.gameId, {
            type: 'playerReloaded',
            playerId: playerInfo.playerId,
            ammo: player.ammo
        });
    }
    
    checkBulletCollisions(game) {
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            const bullet = game.bullets[i];
            
            // Remove old bullets
            if (Date.now() - bullet.createdAt > 5000) {
                game.bullets.splice(i, 1);
                continue;
            }
            
            // Check collision with players
            for (const [playerId, player] of game.players) {
                if (playerId !== bullet.ownerId) {
                    const dx = bullet.x - player.x;
                    const dy = bullet.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 25) {
                        // Hit!
                        player.health = Math.max(0, player.health - 20);
                        game.bullets.splice(i, 1);
                        
                        this.broadcastToGame(game.id, {
                            type: 'playerHit',
                            playerId: playerId,
                            health: player.health,
                            bulletId: bullet.id
                        });
                        
                        if (player.health <= 0) {
                            this.endGame(game, bullet.ownerId);
                        }
                        break;
                    }
                }
            }
        }
    }
    
    endGame(game, winnerId) {
        game.state = 'finished';
        
        this.broadcastToGame(game.id, {
            type: 'gameEnded',
            winner: winnerId
        });
        
        // Clean up game after 30 seconds
        setTimeout(() => {
            this.games.delete(game.id);
        }, 30000);
    }
    
    handleDisconnect(ws) {
        const playerInfo = this.players.get(ws);
        if (!playerInfo) return;
        
        const game = this.games.get(playerInfo.gameId);
        if (game) {
            game.players.delete(playerInfo.playerId);
            
            if (game.players.size === 0) {
                this.games.delete(playerInfo.gameId);
            } else {
                this.broadcastToGame(playerInfo.gameId, {
                    type: 'playerDisconnected',
                    playerId: playerInfo.playerId
                });
            }
        }
        
        this.players.delete(ws);
        console.log(`Player ${playerInfo.playerId} disconnected`);
    }
    
    broadcastToGame(gameId, message, excludeWs = null) {
        const game = this.games.get(gameId);
        if (!game) return;
        
        for (const player of game.players.values()) {
            if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        }
    }
    
    generateGameId() {
        return Math.random().toString(36).substr(2, 9);
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
