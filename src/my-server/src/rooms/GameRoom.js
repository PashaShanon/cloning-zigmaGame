import { Room } from "@colyseus/core";
import { Schema, MapSchema, type } from "@colyseus/schema";
import { MapManager } from "./MapManager.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============== SCHEMA DEFINITIONS ===============
class EnemyState extends Schema {
    constructor(id, x, y, type) {
        super();
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type;
        this.isActive = true;
        this.vx = 0;
        this.vy = 0;
        this.state = "WALK"; 
        this.stateTimer = 60 + Math.random() * 120;
        this.noticeTimer = 0;
        this.interrogatorId = "";
        this.baseFrame = 18;
    }
}

type("string")(EnemyState.prototype, "id");
type("number")(EnemyState.prototype, "x");
type("number")(EnemyState.prototype, "y");
type("string")(EnemyState.prototype, "type");
type("boolean")(EnemyState.prototype, "isActive");
type("number")(EnemyState.prototype, "vx");
type("number")(EnemyState.prototype, "vy");
type("string")(EnemyState.prototype, "state");
type("number")(EnemyState.prototype, "stateTimer");
type("string")(EnemyState.prototype, "interrogatorId");
type("number")(EnemyState.prototype, "baseFrame");

class Player extends Schema {
    constructor(name = "Anonymous") {
        super();
        this.name = name;
        this.score = 0;
        this.correctAnswers = 0;
        this.isReady = false;
        this.x = 400;
        this.y = 300;
        this.baseFrame = 18;
        this.isMoving = false;
        this.facingLeft = false;
        this.keys = new MapSchema();
        this.keys.set("w", false);
        this.keys.set("a", false);
        this.keys.set("s", false);
        this.keys.set("d", false);
    }
}

type("number")(Player.prototype, "score");
type("number")(Player.prototype, "correctAnswers");
type("boolean")(Player.prototype, "isReady");
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "baseFrame");
type("boolean")(Player.prototype, "isMoving");
type("string")(Player.prototype, "name");
type("boolean")(Player.prototype, "facingLeft");
type({ map: "boolean" })(Player.prototype, "keys");

class QuestionState extends Schema {
    constructor(q = "", opts = [], correct = "") {
        super();
        this.question = q;
        this.options = new MapSchema(); // Use Map or Array? Array is better for options but Schema needs a type. 
        // We'll use MapSchema with indices for simplicity or just strings.
        opts.forEach((opt, index) => this.options.set(index.toString(), opt));
        this.correctAnswer = correct;
    }
}

type("string")(QuestionState.prototype, "question");
type({ map: "string" })(QuestionState.prototype, "options");
type("string")(QuestionState.prototype, "correctAnswer");

class GameState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.enemies = new MapSchema();
        this.gameStarted = false;
        this.currentQuestion = null;
        this.questionStartTime = 0;
        this.hostId = "";
        this.adminId = "";
        this.clock = 0;
        this.mapName = "map.tmx";
    }
}

type("boolean")(GameState.prototype, "gameStarted");
type(QuestionState)(GameState.prototype, "currentQuestion"); 
type("number")(GameState.prototype, "questionStartTime");
type("string")(GameState.prototype, "hostId");
type("string")(GameState.prototype, "adminId");
type("number")(GameState.prototype, "clock");
type("string")(GameState.prototype, "mapName");
type({ map: Player })(GameState.prototype, "players");
type({ map: EnemyState })(GameState.prototype, "enemies");

// =============== QUESTION BANK ===============
const questions = [
    { question: "Berapa hasil dari 5 + 5?", options: ["8", "9", "10", "11"], correctAnswer: "10", difficulty: "EASY" },
    { question: "Apa warna dari langit yang cerah?", options: ["Biru", "Merah", "Hijau", "Kuning"], correctAnswer: "Biru", difficulty: "EASY" },
    { question: "Hewan apa yang dikenal sebagai Raja Hutan?", options: ["Gajah", "Singa", "Harimau", "Zebra"], correctAnswer: "Singa", difficulty: "EASY" },
    { question: "Ibukota negara Indonesia adalah?", options: ["Jakarta", "Bandung", "Surabaya", "Medan"], correctAnswer: "Jakarta", difficulty: "NORMAL" },
    { question: "Planet terdekat dari Matahari adalah?", options: ["Venus", "Mars", "Merkurius", "Jupiter"], correctAnswer: "Merkurius", difficulty: "NORMAL" },
    { question: "Apa singkatan dari NKRI?", options: ["Negara Kesatuan Republik Indonesia", "Negara Kita Republik Indonesia", "Negara Kedaulatan Republik Indonesia", "Negara Kebangsaan Republik Indonesia"], correctAnswer: "Negara Kesatuan Republik Indonesia", difficulty: "NORMAL" },
    { question: "Siapa presiden pertama Indonesia?", options: ["Soeharto", "B.J. Habibie", "Soekarno", "Abdurrahman Wahid"], correctAnswer: "Soekarno", difficulty: "NORMAL" },
    { question: "Siapa penemu lampu pijar?", options: ["Isaac Newton", "Albert Einstein", "Thomas Alva Edison", "Nikola Tesla"], correctAnswer: "Thomas Alva Edison", difficulty: "HARD" },
    { question: "Berapakah jumlah provinsi di Indonesia saat ini (2024)?", options: ["34", "36", "38", "40"], correctAnswer: "38", difficulty: "HARD" },
    { question: "Unsur kimia dengan lambang 'Au' adalah?", options: ["Perak", "Emas", "Aluminium", "Tembaga"], correctAnswer: "Emas", difficulty: "HARD" }
];

// =============== GAME ROOM ===============
export class GameRoom extends Room {
    onCreate(options) {
        console.log("[GameRoom] Creating room with options:", options);
        
        this.setState(new GameState());
        
        this.maxQuestions = options.maxQuestions || 5;
        this.mapName = options.mapName || "map.tmx";
        this.difficulty = "NORMAL"; // Default difficulty since UI was replaced by map selection
        this.timeLimit = options.timeLimit || 5;

        this.state.mapName = this.mapName;
        
        // Use client-provided roomCode for better filter reliability
        this.roomCode = (options.roomCode || this.roomId.substring(0, 6)).toUpperCase();
        this.setMetadata({ roomCode: this.roomCode, mapName: this.mapName });
        
        // Track answered questions per player
        this.playerAnswers = new Map();
        this.pendingClientAnswers = new Map(); // sessionId -> { question, options, correctAnswer, timer }
        this.usedQuestions = [];
        
        // Load Map for server-side collisions
        this.mapManager = new MapManager(2); // Scale 2
        const tmxPath = path.resolve(__dirname, `../../../assets/maps/${this.mapName}`);
        this.mapManager.loadMap(tmxPath);

        console.log(`[GameRoom] Room ${this.roomId} created, map=${this.mapName}, maxQ=${this.maxQuestions}`);
        
        // ============= MESSAGE HANDLERS =============
        
        this.onMessage("input", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                // Debug log to verify message arrival at server
                if (data.pressed) console.log(`[Server] Input from ${player.name}: ${data.key}=${data.pressed}`);
                
                if (data.key === "w") player.keys.set("w", data.pressed);
                if (data.key === "a") player.keys.set("a", data.pressed);
                if (data.key === "s") player.keys.set("s", data.pressed);
                if (data.key === "d") player.keys.set("d", data.pressed);
            }
        });

        this.onMessage("move", (client, data) => {
            // Obsolete for authoritative movement, but kept for legacy compat if needed
        });

        this.onMessage("attack", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || !this.state.gameStarted) return;
            
            // Prevent spamming questions if already answering
            if (this.pendingClientAnswers.has(client.sessionId)) return;

            // Broadcast attack animation
            this.broadcast("player_attack", { sessionId: client.sessionId });

            // Hit detection
            const ATTACK_RANGE = 50; 
            let hitEnemy = null;

            this.state.enemies.forEach((enemy) => {
                if (!enemy.isActive) return;
                const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
                if (dist < ATTACK_RANGE) {
                    hitEnemy = enemy;
                }
            });

            if (hitEnemy) {
                // FORCE STOP player keys on server
                player.keys.set("w", false);
                player.keys.set("a", false);
                player.keys.set("s", false);
                player.keys.set("d", false);
                player.isMoving = false;

                hitEnemy.state = "INTERROGATED";
                hitEnemy.vx = 0; hitEnemy.vy = 0;
                hitEnemy.interrogatorId = client.sessionId; // Track who is interrogating
                this.sendQuestionToPlayer(client); 
            }
        });
        
        this.onMessage("enemy_hit", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || !this.state.gameStarted) return;
            if (this.pendingClientAnswers.has(client.sessionId)) return;

            const hitEnemy = this.state.enemies.get(data.enemyId);
            if (!hitEnemy || !hitEnemy.isActive || hitEnemy.state === "INTERROGATED") return;

            // Validate player is close enough (generous radius for lag tolerance)
            const dist = Math.sqrt(
                Math.pow(player.x - hitEnemy.x, 2) + Math.pow(player.y - hitEnemy.y, 2)
            );
            if (dist > 80) return; // Too far away

            player.keys.set("w", false);
            player.keys.set("a", false);
            player.keys.set("s", false);
            player.keys.set("d", false);
            player.isMoving = false;

            hitEnemy.state = "INTERROGATED";
            hitEnemy.vx = 0; hitEnemy.vy = 0;
            hitEnemy.interrogatorId = client.sessionId;
            this.sendQuestionToPlayer(client);
        });

        this.onMessage("set_ready", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (player && !this.state.gameStarted) {
                player.isReady = true;
                console.log(`[GameRoom] Player ${player.name} is ready`);
                this.checkAllReady();
            }
        });

        this.onMessage("host_start", (client) => {
            if (client.sessionId === this.state.hostId && !this.state.gameStarted) {
                console.log(`[GameRoom] Host forced game start`);
                this.startGame();
            }
        });

        this.onMessage("host_end_game", (client) => {
            if (client.sessionId === this.state.hostId) {
                console.log(`[GameRoom] Host forced game end`);
                this.endGame("Admin mengakhiri permainan");
            }
        });

        this.onMessage("chat", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && message) {
                this.broadcast("chat_message", {
                    name: player.name,
                    message: message.substring(0, 100)
                });
            }
        });

        this.onMessage("answer", async (client, data) => {
            if (!this.state.gameStarted) return;
            const player = this.state.players.get(client.sessionId);
            if (!player) return;
            
            const pending = this.pendingClientAnswers.get(client.sessionId);
            if (pending) {
                const isCorrect = data.answer === pending.correctAnswer;
                if (isCorrect) {
                    player.score += 10;
                    player.correctAnswers++;
                }
                
                if (pending.timer) clearTimeout(pending.timer);
                this.pendingClientAnswers.delete(client.sessionId);

                client.send("answer_result", {
                    isCorrect: isCorrect,
                    score: player.score,
                    correctAnswer: pending.correctAnswer
                });

                // Check for win condition (50 points)
                if (player.score >= 50) {
                    this.endGame(`${player.name} Menang! (Skor 50)`);
                    return;
                }

                // Always resume enemy — teleport to safe spot so player isn't stuck
                this.state.enemies.forEach(enemy => {
                    if (enemy.interrogatorId === client.sessionId) {
                        let nx = 0, ny = 0;
                        let safe = false;
                        let attempts = 0;
                        const mapW = this.mapManager.width * this.mapManager.tileWidth * 2;
                        const mapH = this.mapManager.height * this.mapManager.tileHeight * 2;
                        
                        while (!safe && attempts < 50) {
                            nx = 50 + Math.random() * (mapW - 100);
                            ny = 50 + Math.random() * (mapH - 100);
                            if (!this.mapManager.isSolid(nx, ny, 15)) safe = true;
                            attempts++;
                        }
                        enemy.x = nx;
                        enemy.y = ny;
                        enemy.state = "WALK";
                        enemy.stateTimer = 120;
                        enemy.vx = 0;
                        enemy.vy = 0;
                        enemy.interrogatorId = "";
                    }
                });
            }
        });

        this.onMessage("join_ready", (client) => {
            console.log(`[GameRoom] Client ${client.sessionId} is ready, sending join data`);
            const isHost = client.sessionId === this.state.hostId;
            
            client.send("joined", {
                sessionId: client.sessionId,
                roomCode: this.roomCode,
                isHost: isHost,
                isAdmin: client.sessionId === this.state.adminId,
                maxQuestions: this.maxQuestions,
                difficulty: this.difficulty,
                timeLimit: this.timeLimit || 5 
            });
        });
    }
    
    checkAllReady() {
        const allPlayers = Array.from(this.state.players.values());
        const allReady = allPlayers.length > 0 && allPlayers.every(p => p.isReady === true);
        
        if (allReady && !this.state.gameStarted && allPlayers.length >= 1) {
            this.startGame();
        }
    }
    
    async startGame() {
        console.log("[GameRoom] Starting game!");
        this.state.gameStarted = true;
        
        // Initialize Timer
        this.state.clock = (this.timeLimit || 5) * 60;
        
        // Initialize Enemies on Server-side for sync
        this.initServerEnemies();

        this.broadcast("game_start");

        // 60fps Server Simulation
        this.setSimulationInterval((dt) => {
            this.updatePlayers();
            this.updateEnemies();
        }, 16);

        // 1s Timer Loop
        this.gameClockInterval = setInterval(() => {
            if (this.state.clock > 0) {
                this.state.clock -= 1;
                if (this.state.clock <= 0) {
                    this.endGameByTimer();
                }
            }
        }, 1000);
    }

    initServerEnemies() {
        const count = 15;
        const characters = ['Amelia', 'Alex', 'Bob'];
        // Spawn clearance margin — enemies won't appear within this many px of any wall
        const SPAWN_MARGIN = 40;
        
        for (let i = 0; i < count; i++) {
            const id = `enemy_${i}`;
            
            let x = 0, y = 0;
            let foundSafeSpot = false;
            let attempts = 0;

            const area = this.mapManager.enemySpawnArea
                      || this.mapManager.gameArea
                      || { x: 50, y: 50, width: 800, height: 600 };

            const MIN_PLAYER_DIST = 250;

            while (!foundSafeSpot && attempts < 500) {
                x = area.x + SPAWN_MARGIN + Math.random() * (area.width  - SPAWN_MARGIN * 2);
                y = area.y + SPAWN_MARGIN + Math.random() * (area.height - SPAWN_MARGIN * 2);
                
                // Reject if inside or too close to any wall
                const wallSafe = !this.mapManager.isTooCloseToWall(x, y, SPAWN_MARGIN);
                
                // Reject if too close to ANY player
                let playerSafe = true;
                if (this.state.players) {
                    this.state.players.forEach(p => {
                        const d = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
                        if (d < MIN_PLAYER_DIST) playerSafe = false;
                    });
                }

                if (wallSafe && playerSafe) {
                    foundSafeSpot = true;
                }
                attempts++;
            }

            if (!foundSafeSpot) {
                console.warn(`[GameRoom] enemy_${i}: could not find clear spot after 500 attempts, using last candidate`);
            }
            
            const type = characters[Math.floor(Math.random() * characters.length)];
            this.state.enemies.set(id, new EnemyState(id, x, y, type));
        }
        console.log(`[GameRoom] Initialized ${count} enemies with ${40}px wall-clearance check.`);
    }

    updatePlayers() {
        if (!this.state.gameStarted) return;

        const SPEED = 2.5;

        this.state.players.forEach((player, id) => {
            // LOCK movement if answering a question
            if (this.pendingClientAnswers.has(id)) {
                player.isMoving = false;
                return;
            }

            let dx = 0;
            let dy = 0;

            if (player.keys.get("w")) { dy -= 1; player.baseFrame = 6; }
            if (player.keys.get("s")) { dy += 1; player.baseFrame = 18; }
            if (player.keys.get("a")) { dx -= 1; player.baseFrame = 12; player.facingLeft = true; }
            if (player.keys.get("d")) { dx += 1; player.baseFrame = 0;  player.facingLeft = false; }

            if (dx !== 0 || dy !== 0) {
                player.isMoving = true;
                const mag = Math.sqrt(dx*dx + dy*dy);
                const vx = (dx / mag) * SPEED;
                const vy = (dy / mag) * SPEED;

                const nx = player.x + vx;
                const ny = player.y + vy;

                // Server-side Collision (Reduced radius even more to 8 for testing)
                const COL_RADIUS = 8;
                if (!this.mapManager.isSolid(nx, player.y, COL_RADIUS)) player.x = nx;
                if (!this.mapManager.isSolid(player.x, ny, COL_RADIUS)) player.y = ny;

                // Clamp to Game-area
                const clamped = this.mapManager.clampToArea(player.x, player.y, COL_RADIUS);
                player.x = clamped.x;
                player.y = clamped.y;
            } else {
                player.isMoving = false;
            }
        });
    }

    updateEnemies() {
        if (!this.state.gameStarted) return;
        
        const SENSOR_RANGE = 180; // Distance to notice player
        const FLEE_SPEED = 2.8;   // Running speed
        const WALK_SPEED = 1.2;   // Wandering speed

        this.state.enemies.forEach((enemy) => {
            if (!enemy.isActive) return;

            // 1. FIND NEAREST PLAYER
            let nearestPlayer = null;
            let minDist = Infinity;
            
            this.state.players.forEach((player) => {
                const dist = Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2));
                if (dist < minDist) {
                    minDist = dist;
                    nearestPlayer = player;
                }
            });

            // 2. STATE MACHINE LOGIC
            switch (enemy.state) {
                case "WALK":
                    // Transition to NOTICE if player found
                    if (minDist < SENSOR_RANGE) {
                        enemy.state = "NOTICE";
                        enemy.stateTimer = 45; // 0.75s pause
                        enemy.vx = 0; enemy.vy = 0;
                    } else {
                        // Wander logic
                        enemy.stateTimer--;
                        if (enemy.stateTimer <= 0) {
                            const angle = Math.random() * Math.PI * 2;
                            enemy.vx = Math.cos(angle) * WALK_SPEED;
                            enemy.vy = Math.sin(angle) * WALK_SPEED;
                            enemy.stateTimer = 100 + Math.random() * 200;
                        }
                    }
                    break;

                case "NOTICE":
                    enemy.stateTimer--;
                    if (enemy.stateTimer <= 0) {
                        enemy.state = "FLEE";
                        enemy.stateTimer = 240; // Flee for 4 seconds
                    }
                    break;

                case "FLEE":
                    if (nearestPlayer) {
                        const dx = enemy.x - nearestPlayer.x;
                        const dy = enemy.y - nearestPlayer.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist > 0) {
                            enemy.vx = (dx / dist) * 2.2;
                            enemy.vy = (dy / dist) * 2.2;
                        }
                    }
                    enemy.stateTimer--;
                    if (enemy.stateTimer <= 0) enemy.state = "TIRED";
                    break;

                case "TIRED":
                    enemy.stateTimer--;
                    if (enemy.stateTimer <= 0) {
                        enemy.state = "WALK";
                        enemy.stateTimer = 0;
                    }
                    break;

                case "INTERROGATED":
                    enemy.vx = 0;
                    enemy.vy = 0;
                    break;
            }

            // 3. EXECUTE MOVEMENT & COLLISION
            if (enemy.vx !== 0 || enemy.vy !== 0) {
                // Set baseFrame based on movement
                if (Math.abs(enemy.vx) > Math.abs(enemy.vy)) {
                    enemy.baseFrame = enemy.vx > 0 ? 0 : 12; // 0=Right, 12=Left
                } else {
                    enemy.baseFrame = enemy.vy > 0 ? 18 : 6; // 18=Down, 6=Up
                }

                const nx = enemy.x + enemy.vx;
                const ny = enemy.y + enemy.vy;

                // Wall Collision (Server Othoritative)
                // Radius 10 for enemy body
                if (!this.mapManager.isSolid(nx, enemy.y, 10)) {
                    enemy.x = nx;
                } else {
                    enemy.vx *= -1; // Bounce on X
                    enemy.stateTimer = 0; // Trigger new direction in next WALK cycle
                }

                if (!this.mapManager.isSolid(enemy.x, ny, 10)) {
                    enemy.y = ny;
                } else {
                    enemy.vy *= -1; // Bounce on Y
                    enemy.stateTimer = 0;
                }
            }

            // 4. BOUNDARY CLAMPING
            const clamped = this.mapManager.clampToArea(enemy.x, enemy.y, 16);
            if (clamped.x !== enemy.x) {
                enemy.x = clamped.x;
                enemy.vx *= -1;
            }
            if (clamped.y !== enemy.y) {
                enemy.y = clamped.y;
                enemy.vy *= -1;
            }
        });
    }

    endGame(reason = "Game Over") {
        if (!this.state.gameStarted) return;
        console.log(`[GameRoom] Game ended: ${reason}`);
        
        if (this.gameClockInterval) clearInterval(this.gameClockInterval);
        
        this.state.gameStarted = false;

        const scores = Array.from(this.state.players.entries()).map(([id, player]) => ({
            id: id,
            name: player.name,
            score: player.score,
            correct: player.correctAnswers
        })).sort((a, b) => b.score - a.score);
        
        this.broadcast("game_over", { 
            scores, 
            reason: reason,
            remainingTime: this.state.clock
        });
    }

    endGameByTimer() {
        this.endGame("Waktu Habis!");
    }
    
    async checkAllAnswered(forceTimeout = false) {
        // Obsolete without global questions
    }
    
    async sendQuestionToPlayer(client) {
        // Get question based on difficulty
        const availableQuestions = questions.filter(q => q.difficulty === this.difficulty);
        const unusedQuestions = availableQuestions.filter(q => !this.usedQuestions.includes(q.question));
        
        let question;
        if (unusedQuestions.length > 0) {
            question = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
        } else {
            this.usedQuestions = [];
            question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        }
        
        this.usedQuestions.push(question.question);
        
        client.send("new_question", {
            question: question.question,
            options: question.options
        });
        
        // Clear previous timer if exists
        const oldPending = this.pendingClientAnswers.get(client.sessionId);
        if (oldPending?.timer) clearTimeout(oldPending.timer);

        // Store with timer
        const timer = setTimeout(() => {
            const currentPending = this.pendingClientAnswers.get(client.sessionId);
            if (currentPending && currentPending.question === question.question) {
                client.send("answer_result", {
                    isCorrect: false,
                    score: this.state.players.get(client.sessionId)?.score || 0,
                    correctAnswer: question.correctAnswer
                });
                this.pendingClientAnswers.delete(client.sessionId);
            }
        }, 30000);

        this.pendingClientAnswers.set(client.sessionId, {
            question: question.question,
            correctAnswer: question.correctAnswer,
            timer: timer
        });
    }
    
    onJoin(client, options) {
        try {
            const safeName = options && options.name ? options.name : "UNKNOWN";
            console.log(`[GameRoom] Player ${safeName} (ID: ${client.sessionId}) joining room ${this.roomId}`);
            
            const isDedicatedHost = options && options.isHost === true;
            
            // Set first player as host if no host yet, OR if specifically joining as host
            if (isDedicatedHost) {
                this.state.hostId = client.sessionId;
                this.state.adminId = client.sessionId;
                console.log(`[GameRoom] Dedicated Host assigned: ${this.state.hostId} (Spectator)`);
                
                // Send specific joined info to host immediately or wait for join_ready
                return; // Host does not join as a player character
            }

            // If no host assigned yet (player joined first?), assign them as owner but they are still a player
            if (!this.state.hostId) {
                this.state.hostId = client.sessionId; 
                console.log(`[GameRoom] First Player assigned as Host/Owner: ${this.state.hostId}`);
            }

            // Create player
            const playerName = (options && options.name) ? String(options.name).substring(0, 10) : "PLAYER";
            const player = new Player(playerName);
            
            // ── Player spawn logic ──────────────────────────────────────────
            // Priority 1: Point(s) from the "spawn-player" Tiled layer
            // Priority 2: Rectangle area from legacy "player spawn" layer
            // Priority 3: Map-name fallback / full-map random
            let sx = 400, sy = 300;
            let found = false;
            let tries = 0;

            const spawnPoints = this.mapManager.playerSpawnPoints;
            const spawnArea   = this.mapManager.playerSpawnArea;
            const PLAYER_MARGIN = 30;

            if (spawnPoints && spawnPoints.length > 0) {
                // Use round-robin across defined points so multiple players
                // don't stack exactly on top of each other.
                const playerCount = this.state.players.size; // before adding this player
                const pt = spawnPoints[playerCount % spawnPoints.length];

                // Scatter slightly around the point so players aren't stacked
                const SCATTER = 24; // pixels
                while (!found && tries < 100) {
                    const angle = Math.random() * Math.PI * 2;
                    const r     = Math.random() * SCATTER;
                    sx = pt.x + Math.cos(angle) * r;
                    sy = pt.y + Math.sin(angle) * r;
                    if (!this.mapManager.isTooCloseToWall(sx, sy, PLAYER_MARGIN)) found = true;
                    tries++;
                }
                if (!found) { sx = pt.x; sy = pt.y; found = true; } // Use exact point as last resort
                console.log(`[GameRoom] Spawning player near point (${pt.x}, ${pt.y}) → (${sx.toFixed(1)}, ${sy.toFixed(1)})`);
            } else {
                // Legacy / fallback path
                while (!found && tries < 200) {
                    if (spawnArea) {
                        sx = spawnArea.x + PLAYER_MARGIN + Math.random() * (spawnArea.width  - PLAYER_MARGIN * 2);
                        sy = spawnArea.y + PLAYER_MARGIN + Math.random() * (spawnArea.height - PLAYER_MARGIN * 2);
                    } else if (this.mapName === 'map.tmx') {
                        sx = 160 + Math.random() * 40;
                        sy = 816;
                    } else {
                        const mapW = (this.mapManager.width * this.mapManager.tileWidth * 2) || 800;
                        const mapH = (this.mapManager.height * this.mapManager.tileHeight * 2) || 800;
                        sx = PLAYER_MARGIN + Math.random() * (mapW - PLAYER_MARGIN * 2);
                        sy = PLAYER_MARGIN + Math.random() * (mapH - PLAYER_MARGIN * 2);
                    }
                    if (!this.mapManager.isTooCloseToWall(sx, sy, PLAYER_MARGIN)) found = true;
                    tries++;
                }
            }
            player.x = sx;
            player.y = sy;

            this.state.players.set(client.sessionId, player);
            
            // Broadcast updated player list
            this.broadcastPlayerList();
        } catch (err) {
            console.error("[GameRoom] Error in onJoin:", err);
        }
    }
    
    onLeave(client, consented) {
        console.log(`[GameRoom] Player ${client.sessionId} left`);
        this.state.players.delete(client.sessionId);
        
        // If host leaves, designate new host if possible
        if (client.sessionId === this.state.hostId) {
            this.state.hostId = Array.from(this.state.players.keys())[0] || "";
            console.log(`[GameRoom] Host changed to: ${this.state.hostId}`);
        }

        this.broadcastPlayerList();
    }
    
    onDispose() {
        console.log(`[GameRoom] Room ${this.roomId} disposed`);
        if (this.questionTimer) clearTimeout(this.questionTimer);
        if (this.clientQuestionTimer) clearTimeout(this.clientQuestionTimer);
    }
    
    broadcastPlayerList() {
        const playerList = Array.from(this.state.players.entries()).map(([id, p]) => ({
            id: id,
            name: p.name,
            isReady: p.isReady,
            score: p.score
        }));
        
        // Player list is synchronized via onStateChange
    }
}