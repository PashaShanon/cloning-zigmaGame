import { Client } from "@colyseus/sdk";
import { Enemy } from '../entities/enemy/Enemy.js';
import { Player } from '../entities/player/Player.js';
import { drawCharacterSprite } from '../entities/player/view.js';

// Import character textures for remote players
import sunnyRunUrl from '../assets/sprites/sunny_run.png';
import sunnyIdleUrl from '../assets/sprites/sunny_idle.png';

/**
 * Manages the Colyseus multiplayer connection and room lifecycle.
 * Uses onStateChange + messages — no client-side schema classes needed.
 */
export class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.client = null;
        this.room = null;
        this.sessionId = null;
        this.roomCode = null;
        this.isHost = false;
        this.isAdmin = false;
        this.isConnected = false;
        /** @type {Map<string, {x,y,name,baseFrame,isMoving,score}>} */
        this.remotePlayers = new Map();
        this._prevPlayerKeys = new Set();

        // Cache for remote player textures
        this.textures = {
            'sunny': { run: new Image(), idle: new Image() },
        };
        this.textures['sunny'].run.src = sunnyRunUrl;
        this.textures['sunny'].idle.src = sunnyIdleUrl;
    }

    async connect(serverUrl = null) {
        if (!serverUrl) {
            // Automatically use the host's IP address so phones on LAN can connect
            serverUrl = `ws://${window.location.hostname}:2567`;
        }
        this.client = new Client(serverUrl);
        this.isConnected = true;
        console.log("[MP] Client ready:", serverUrl);
    }

    async createRoom(playerName, options = {}) {
        if (!this.client) await this.connect();
        
        // Generate a random 6-character room code on client to ensure it's indexed correctly
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        this.room = await this.client.create("game_room", {
            name: playerName,
            roomCode: roomCode, // Crucial for filtering
            maxQuestions: options.maxQuestions || 5,
            mapName:      options.mapName      || "map.tmx",
            timeLimit:    options.timeLimit    || 5,
            isHost:       true // Explicitly joining as dedicated host
        });
        
        console.log(`[MP] Room created with code: ${roomCode}`);
        this.roomCode = roomCode;
        this.room.sessionId = this.room.sessionId; // Trigger getter
        this.sessionId = this.room.sessionId;
        this.isHost = true;
        this._setupListeners();
        return this.room.roomId;
    }

    async joinRoom(roomCode, playerName) {
        if (!this.client) await this.connect();
        
        const codeToFind = roomCode.trim().toUpperCase();
        console.log(`[MP] Joining room with code: ${codeToFind}`);

        // Join using the filterBy criteria set on the server
        this.room = await this.client.join("game_room", { 
            roomCode: codeToFind, 
            name: playerName,
            isHost: false // Explicitly joining as a player
        });
        
        this.sessionId = this.room.sessionId;
        this.isHost = false;
        this._setupListeners();
        return this.room.roomId;
    }

    _setupListeners() {
        const room = this.room;

        // ── Sent by server right after join ─────────────────────
        room.onMessage("player_attack", (data) => {
            const remoteP = this.remotePlayers.get(data.sessionId);
            if (remoteP) {
                remoteP.isAttacking = true;
                setTimeout(() => {
                    remoteP.isAttacking = false;
                }, 500);
            }
        });
        
        room.onMessage("joined", (data) => {
            this.sessionId = this.room.sessionId; // Use authoritative ID
            this.roomCode  = data.roomCode;
            this.isHost    = data.isHost;
            this.isAdmin   = data.isAdmin;
            this.game.uiManager.onRoomJoined(this.roomCode, this.isHost, data);
        });

        // ── Full state sync (replaces reactive schema callbacks) ─
        this.room.onStateChange((state) => {
            if (!state) return;
            
            // Debugging: Pastikan data dari server masuk
            // console.log("[MP] State update received");

            // Force authoritative sessionId from the room object itself if local one is missing
            if (!this.sessionId && this.room?.sessionId) {
                this.sessionId = this.room.sessionId;
            }

            // Handle host updates
            if (state.hostId) {
                const wasHost = this.isHost;
                this.isHost = (this.sessionId === state.hostId);
                
                // Track admin separately from game/state.adminId if needed, 
                // but for now we use the initial data.
                if (state.adminId) {
                   this.isAdmin = (this.sessionId === state.adminId);
                }

                // If host status changed, notify UI
                if (wasHost !== this.isHost) {
                   this.game.uiManager.onHostChanged(this.isHost);
                }
            }

            // Handle Map Change
            if (state.mapName && state.mapName !== this.game.mapName) {
                console.log(`[MP] Map change detected: ${state.mapName}`);
                this.game.mapName = state.mapName;
                this.game.map.loadMap(state.mapName);
            }

            // Handle Timer
            if (state.clock !== undefined) {
                this.game.timeRemaining = state.clock;
                this.game.uiManager.updateTimer(state.clock);
            }

            // Handle Enemies
            if (state.enemies) {
                this._syncEnemies(state.enemies);
            }

            if (state.players) {
                try {
                    this._syncPlayers(state.players);
                } catch (e) { console.error("[MP] Player sync error:", e); }
            }
        });

        // ── Gameplay messages ─────────────────────────────────────
        room.onMessage("game_start", () => {
            this.game.uiManager.hideLobby();
            this.game.uiManager.showPreGameCountdown(() => {
                // Determine view based on host/admin status
                if (this.isAdmin) {
                   this.game.uiManager.navigateTo('/host/progress');
                } else {
                   this.game.uiManager.navigateTo('/game');
                }
                
                this.game.startMultiplayer();
                this.game.gameLoop();
            });
        });

        room.onMessage("new_question", (data) => {
            this.game.isAnswering = true;
            if (this.game.player) this.game.player.isInterrogated = true; // Lock local movement
            
            let targetEnemy = null;
            if (this.game.enemies) {
                targetEnemy = this.game.enemies.find(e => e.state === 'INTERROGATED') || this.game.nearbyEnemy;
            }

            this.game.uiManager.showQuestion(
                { question: data.question, options: data.options, correctAnswer: "__SERVER__" },
                targetEnemy,
                (_isCorrect, selectedOption) => {
                    room.send("answer", { answer: selectedOption });
                }
            );
        });

        room.onMessage("answer_result", (data) => {
            this.game.score = data.score;
            if (data.isCorrect) this.game.correctAnswersCount++;
            this.game.answeredQuestionsCount++;
            this.game.uiManager.updateScore(this.game.score);
            this.game.uiManager.showNotification(
                data.isCorrect ? "Benar!" : `Salah!`,
                data.isCorrect ? "success" : "error"
            );
            
            // Re-enable movement after short delay
            setTimeout(() => {
                this.game.isAnswering = false;
                if (this.game.player) this.game.player.isInterrogated = false;
            }, 100); // Fast resume
        });

        room.onMessage("game_over", (data) => {
            this.game.uiManager.showMultiplayerGameOver(data.scores, this.sessionId, data.reason, data.remainingTime);
        });

        room.onMessage("chat_message", (data) => {
            this.game.uiManager.addChatMessage(data.name, data.message);
        });

        room.onMessage("trigger_question", (data) => {
            const hitter = this.remotePlayers.get(data.hitterId) || (data.hitterId === this.sessionId ? { name: "KAMU" } : { name: "Seseorang" });
            this.game.uiManager.showNotification(`${hitter.name} memicu pertanyaan!`, "info");
        });

        // ── Error & disconnect ────────────────────────────────────
        room.onError((code, message) => {
            console.error("[MP] Error:", code, message);
            this.game.uiManager.showNotification(`Error: ${message}`, "error");
        });

        room.onLeave(() => {
            this.game.uiManager.showNotification("Terputus dari server");
        });

        // Tell server we are ready for the "joined" initial data
        room.send("join_ready", {});
    }

    /** Sync server enemies to game instance */
    _syncEnemies(enemiesState) {
        if (!this.game) return;
        
        // Use a set of server enemy IDs for quick lookup
        const serverIds = new Set();
        enemiesState.forEach((state, id) => serverIds.add(id));

        // Remove local enemies that are no longer on server
        this.game.enemies = this.game.enemies.filter(localEnemy => serverIds.has(localEnemy.id));

        enemiesState.forEach((state, id) => {
            let localEnemy = this.game.enemies.find(e => e.id === id);
            
            if (!localEnemy) {
                // Create new local enemy from server state
                localEnemy = new Enemy(state.x, state.y, state.type);
                localEnemy.id = id;
                this.game.enemies.push(localEnemy);
            }
            
            // Sync status
            localEnemy.isActive = state.isActive;
            localEnemy.state = state.state; 
            localEnemy.baseFrame = 0; // Force 0 for strip assets
            
            // Set TARGETS for smooth client-side interpolation
            localEnemy.targetX = state.x;
            localEnemy.targetY = state.y;
        });
    }

    /**
     * Syncs player list from raw state.players (plain Map from Colyseus).
     */
    _syncPlayers(players) {
        const currentKeys = new Set();

        // `players` comes as a plain JS object or Map depending on Colyseus version
        let entries;
        if (typeof players.entries === "function") {
            entries = [...players.entries()];
        } else if (typeof players === "object" && players !== null) {
            entries = Object.entries(players);
        } else {
            console.warn("[MP] Unknown players format:", players);
            return;
        }

        // AUTHORITATIVE ID SYNC
        const currentSessionId = this.sessionId || this.room?.sessionId || this.room?.id;
        if (!currentSessionId) return;

        // Ensure we don't accidentally render ourselves as a remote player
        if (currentSessionId) {
            this.remotePlayers.delete(currentSessionId);
        }

        const validEntries = entries.filter(([, p]) => p && typeof p === "object");
        for (const [id, p] of validEntries) {
            currentKeys.add(id);
            const playerName = p.name || `Player_${id.substring(0, 4)}`;

            if (id === currentSessionId) {
                // Dedicated hosts / admins should NOT have a local player character sprite
                // Check both local flag and data from server if available
                if (this.isAdmin || p.isAdmin || this.isHost) {
                    if (this.game.player) {
                        console.log("[MP] Cleaning up unintended local player for Admin");
                        this.game.player = null; 
                    }
                    continue;
                }

                // Initialize LOCAL player if null
                if (!this.game.player) {
                    console.log("[MP] Creating local player for session:", id);
                    this.game.player = new Player(p.x ?? 400, p.y ?? 300);
                    this.game.player.name = playerName;
                    this.game.player.setMultiplayerManager(this);
                }

                // AUTHORITATIVE POSITION SYNC (Smoothed)
                this.game.player.targetX = p.x;
                this.game.player.targetY = p.y;
                this.game.player.isMoving  = p.isMoving;
                this.game.player.facingLeft = p.facingLeft;
                
                // Sync our own score
                if (typeof p.score === "number") {
                    this.game.score = p.score;
                }
                continue;
            }
            
            const existing = this.remotePlayers.get(id);
            if (existing) {
                // Update SERVER TARGET positions (not render positions)
                if (typeof p.x === 'number') existing.targetX = p.x;
                if (typeof p.y === 'number') existing.targetY = p.y;
                existing.baseFrame = 0; 
                existing.isMoving  = (typeof p.isMoving === 'boolean') ? p.isMoving : existing.isMoving;
                existing.facingLeft = (typeof p.facingLeft === 'boolean') ? p.facingLeft : existing.facingLeft;
                existing.score     = (typeof p.score === 'number') ? p.score : existing.score;
                existing.answered  = (typeof p.answeredCount === 'number') ? p.answeredCount : existing.answered;
                existing.name      = playerName;
            } else {
                // Initialize render positions at target to avoid first-frame snap
                this.remotePlayers.set(id, {
                    x: p.x ?? 400,      // render position (lerped)
                    y: p.y ?? 300,
                    targetX: p.x ?? 400, // server-authoritative target
                    targetY: p.y ?? 300,
                    name: playerName,
                    baseFrame: 0,
                    isMoving:  p.isMoving  ?? false,
                    facingLeft: p.facingLeft ?? false,
                    score:     p.score     ?? 0,
                    answered:  p.answeredCount ?? 0,
                    animFrame: 0,
                    animTick: 0
                });
            }
        }

        // Remove disconnected players
        for (const id of this.remotePlayers.keys()) {
            if (!currentKeys.has(id)) this.remotePlayers.delete(id);
        }

        // Build player list for lobby UI (all players including self)
        const list = validEntries
            .map(([id, p]) => ({
                id,
                name:    (p && p.name) || "?",
                isReady: (p && p.isReady) || false,
                score:   (p && p.score) || 0
            }));
        
        // Only update UI if game.uiManager exists and we're in lobby
        if (this.game.uiManager && this.game.uiManager.updateLobbyList) {
            try {
                this.game.uiManager.updateLobbyList(list, this.room.state.hostId, this.sessionId);
            } catch (e) { console.error("[MP] updateLobbyList error:", e); }
        }
    }

    // ── Send helpers ─────────────────────────────────────────────

    /**
     * Call every frame from the game loop to interpolate remote player positions
     * and advance their animation frames independently of network updates.
     */
    updateRemotePlayers() {
        const LERP = 0.2;        // Smoothing factor (0=no move, 1=snap)
        const ANIM_SPEED = 6;    // Ticks per frame advance

        this.remotePlayers.forEach((p) => {
            // Lerp render position toward server target
            const tx = p.targetX ?? p.x;
            const ty = p.targetY ?? p.y;

            const dist = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
            if (dist > 150) {
                // Snap if too far (respawn / teleport)
                p.x = tx;
                p.y = ty;
            } else {
                p.x += (tx - p.x) * LERP;
                p.y += (ty - p.y) * LERP;
            }

            // Independent animation tick
            const runFrames = 8;
            const idleFrames = 9;
            const maxFrames = p.isMoving ? runFrames : idleFrames;

            p.animTick = (p.animTick || 0) + 1;
            let speed = p.isMoving ? 6 : 10;
            if (p.animTick >= speed) {
                p.animFrame = ((p.animFrame || 0) + 1) % maxFrames;
                p.animTick = 0;
            }
        });
    }

    // ── Send helpers ─────────────────────────────────────────────
    sendPosition(x, y, baseFrame, isMoving) {
        this.room?.send("move", { x, y, baseFrame, isMoving });
    }

    sendEnemyHit(enemyId) {
        this.room?.send("enemy_hit", { enemyId });
    }

    sendAttack(x, y) {
        this.room?.send("attack", { x, y });
    }

    sendReady() {
        this.room?.send("set_ready");
    }

    sendChat(message) {
        if (message?.trim()) this.room?.send("chat", message.trim());
    }

    drawRemotePlayer(ctx, p, id) {
        if (id === this.sessionId || id === this.room?.sessionId) return;
        
        const charType = p.charType || 'sunny';
        const tex = this.textures[charType] || this.textures['sunny'];
        
        drawCharacterSprite(ctx, p.x, p.y, {
            name: p.name,
            isMoving: p.isMoving,
            facingLeft: p.facingLeft,
            baseFrame: p.baseFrame || 18,
            animFrame: p.animFrame || 0,   // locally ticked
            runImage: tex.run,
            idleImage: tex.idle,
            score: p.score,
            answered: p.answered || 0,
            maxQuestions: this.game.maxQuestions || 5,
            zoom: this.game.cameraZoom
        });
    }

    disconnect() {
        this.room?.leave();
        this.room = null;
        this.remotePlayers.clear();
        this.isConnected = false;
    }
}