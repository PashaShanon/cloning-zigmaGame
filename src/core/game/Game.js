import { GAME_CONFIG } from '../config.js';
import { Player } from '../../entities/player/Player.js';
import { Enemy } from '../../entities/enemy/Enemy.js';
import { Map } from '../../map/Map.js';
import { UIManager } from '../../ui/UIManager.js';
import { QuestionManager } from '../../data/questions.js';
import { MultiplayerManager } from '../../multiplayer/Multiplayer.js';
import { MobileController } from './MobileController.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.map = new Map();
    this.player = null;
    this.enemies = [];
    
    // Multiplayer Manager (Colyseus)
    this.multiplayer = new MultiplayerManager(this);
    
    this.uiManager = new UIManager(this);
    this.questionManager = new QuestionManager();
    this.mobileController = new MobileController(this);
    
    // Game state
    this.isRunning = false;
    this.isInLobby = true;
    this.isAnswering = false;
    this.score = 0;
    this.correctAnswersCount = 0;
    this.answeredQuestionsCount = 0;
    this.timeRemaining = 0;
    this.maxQuestions = GAME_CONFIG.MAX_QUESTIONS;
    this.difficulty = 'NORMAL';
    this.mapName = '-';
    this.playerName = 'PLAYER';
    
    this.lastNetworkUpdate = 0;
    this.networkUpdateRate = 1000 / 20; 

    // Interrogation state
    this.nearbyEnemy = null;
    
    // Camera state
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraZoom = 1.0;
    this.isAdminMode = false;
    
    this.init();
  }
  
  async init() {
    this.setupCanvas();
    window.addEventListener('resize', () => this.setupCanvas());
    
    this.uiManager.showStartScreen((questions, timeInSec, mapNameChoice, playerName, mode) => {
      this.playerName = playerName; 
      if (mode === 'multi') {
        const timeLimit = Math.floor(timeInSec / 60);
        this.multiplayer.createRoom(playerName, { maxQuestions: questions, mapName: mapNameChoice, timeLimit });
      } else {
        this.startSinglePlayer(questions, timeInSec, mapNameChoice, playerName);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.nearbyEnemy && !this.isAnswering) {
        const enemy = this.nearbyEnemy;
        if (this.multiplayer.isConnected) {
          this.multiplayer.sendEnemyHit(enemy.id);
        } else {
          this.triggerLocalQuestion(enemy);
        }
      }
    });

    // Auto-detect mobile or small screen
    if ('ontouchstart' in window || window.innerWidth < 1024) {
      this.mobileController.init();
    }
  }

  forceShowMobileControls() {
    this.mobileController.forceShowMobileControls();
  }
  
  setupCanvas() {
    let logicalWidth = window.innerWidth;
    let logicalHeight = window.innerHeight;

    // Minimum logical width of 800 to prevent mobile zooming in too closely
    if (window.innerWidth < 800) {
      const scale = 800 / window.innerWidth;
      logicalWidth = 800;
      logicalHeight = window.innerHeight * scale;
    }

    this.canvas.width = logicalWidth;
    this.canvas.height = logicalHeight;
  }


  updateCamera() {
    if (this.isAdminMode) {
      // Zoom out to see the whole map
      const mapWidth = this.map.width * this.map.tileSize * this.map.scale;
      const mapHeight = this.map.height * this.map.tileSize * this.map.scale;
      
      // Calculate zoom to fit map perfectly in the view
      const padding = 100;
      this.cameraZoom = Math.min(this.canvas.width / (mapWidth + padding), this.canvas.height / (mapHeight + padding), 0.35);
      
      this.cameraX = mapWidth / 2 - (this.canvas.width / 2) / this.cameraZoom;
      this.cameraY = mapHeight / 2 - (this.canvas.height / 2) / this.cameraZoom;
      return;
    }

    this.cameraZoom = 1.0;
    if (!this.player) return;

    // Target position for camera (center player)
    let targetX = this.player.x - this.canvas.width / 2;
    let targetY = this.player.y - this.canvas.height / 2;

    // Map boundaries
    const mapWidth = this.map.width * this.map.tileSize * this.map.scale;
    const mapHeight = this.map.height * this.map.tileSize * this.map.scale;

    // Clamp camera to map bounds
    this.cameraX = Math.max(0, Math.min(targetX, mapWidth - this.canvas.width));
    this.cameraY = Math.max(0, Math.min(targetY, mapHeight - this.canvas.height));

    // If map is smaller than canvas, center it
    if (mapWidth < this.canvas.width) {
        this.cameraX = -(this.canvas.width - mapWidth) / 2;
    }
    if (mapHeight < this.canvas.height) {
        this.cameraY = -(this.canvas.height - mapHeight) / 2;
    }
  }
  
  startSinglePlayer(questions, timeInSeconds, mapName, playerName) {
    console.log("[Game] Starting Single Player...");
    this.playerName = playerName;
    this.maxQuestions = questions;
    this.timeRemaining = timeInSeconds;
    this.mapName = mapName;
    
    // We need to tell the map to switch
    this.map.loadMap(mapName);
    
    this.score = 0;
    this.correctAnswersCount = 0;
    this.answeredQuestionsCount = 0;
    this.isRunning = true;
    this.isInLobby = false;
    
    const spawnItems = () => {
      if (this.map.ready) {
        let spawnX, spawnY;

        // Use spawn points from map if available
        if (this.map.playerSpawnPoints && this.map.playerSpawnPoints.length > 0) {
            const pt = this.map.playerSpawnPoints[Math.floor(Math.random() * this.map.playerSpawnPoints.length)];
            spawnX = pt.x;
            spawnY = pt.y;
            console.log(`[Game] Spawning player at map spawn point: (${spawnX}, ${spawnY})`);
        } else {
            // Fallback: Center player in the map
            spawnX = (this.map.width * this.map.tileSize * this.map.scale) / 2;
            spawnY = (this.map.height * this.map.tileSize * this.map.scale) / 2;
            
            let attempts = 0;
            while(this.map.isSolid(spawnX, spawnY) && attempts < 100) {
                spawnX += (Math.random() - 0.5) * 64;
                spawnY += (Math.random() - 0.5) * 64;
                attempts++;
            }
            console.log(`[Game] Spawning player at map center: (${spawnX}, ${spawnY})`);
        }
        
        if (!this.player) {
          this.player = new Player(spawnX, spawnY);
          this.player.name = this.playerName;
        } else {
          this.player.resetPosition(spawnX, spawnY);
        }
        
        this.initEnemies();
        
        if (this.multiplayer.isConnected) {
            this.isRunning = true;
            this.gameLoop();
        } else {
            this.isRunning = false;
            this.uiManager.showPreGameCountdown(() => {
              this.isRunning = true;
              this.gameLoop();
            });
        }
      } else {
        setTimeout(spawnItems, 100);
      }
    };
    spawnItems();
  }

  startMultiplayer() {
    this.score = 0;
    this.correctAnswersCount = 0;
    this.answeredQuestionsCount = 0;
    this.isInLobby = false;

    const spawnItems = () => {
      if (this.map.ready) {
        const safePos = this.findSafeSpawnPoint();
        if (this.player) this.player.resetPosition(safePos.x, safePos.y);
        this.isRunning = true;
      } else {
        setTimeout(spawnItems, 100);
      }
    };
    spawnItems();
  }

  initEnemies() {
    this.enemies = [];
    const count = GAME_CONFIG.TOTAL_ENEMIES || 10;
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }

  spawnEnemy(enemyToReplace = null) {
    const mapW = this.map.width * this.map.tileSize * this.map.scale;
    const mapH = this.map.height * this.map.tileSize * this.map.scale;
    const margin = 100;

    let x, y, attempts = 0;
    const MIN_DISTANCE = 300; 

    do {
      x = margin + Math.random() * (mapW - margin * 2);
      y = margin + Math.random() * (mapH - margin * 2);
      
      // Check distance from player
      let dist = Infinity;
      if (this.player) {
          dist = Math.sqrt(Math.pow(x - this.player.x, 2) + Math.pow(y - this.player.y, 2));
      }
      
      const isSolid = this.map.isSolid(x, y);
      const isTooClose = dist < MIN_DISTANCE;
      
      if (!isSolid && !isTooClose) break;
      attempts++;
    } while (attempts < 100);

    const types = ['Human', 'Goblin', 'Skeleton'];
    const type = types[Math.floor(Math.random() * types.length)];
    const newEnemy = new Enemy(x, y, type);

    if (enemyToReplace) {
      const index = this.enemies.indexOf(enemyToReplace);
      if (index !== -1) this.enemies[index] = newEnemy;
    } else {
      this.enemies.push(newEnemy);
    }
  }

  update() {
    if (!this.isRunning) return;
    
    if (this.player) {
      // In Admin mode, the player character is not controlled by the host
      if (!this.isAdminMode) {
        this.player.update(this.canvas.width, this.canvas.height, this.map);
      }
      
      if (this.multiplayer.isConnected) {
        this.multiplayer.updateRemotePlayers();
        const now = Date.now();
        if (now - this.lastNetworkUpdate > this.networkUpdateRate) {
          this.multiplayer.sendPosition(this.player.x, this.player.y, this.player.baseFrame, this.player.isMoving);
          this.lastNetworkUpdate = now;
        }
      }
    }
    
    this.enemies.forEach(enemy => {
        enemy.update(
            this.canvas.width, 
            this.canvas.height, 
            false, 
            this.player, 
            this.map, 
            this.multiplayer.isConnected
        );
    });   
    
    this.checkEnemyCollisions();
    this.updateCamera();
    
    if (!this.multiplayer.isConnected && this.timeRemaining > 0) {
      this.timeRemaining -= 1/60;
      this.uiManager.updateTimer(Math.max(0, Math.floor(this.timeRemaining)));
      if (this.timeRemaining <= 0) this.gameOver();
    }
  }

  checkEnemyCollisions() {
    if (!this.player || this.isAnswering) return;
    let foundNearby = null;
    for (const enemy of this.enemies) {
      if (enemy.isActive && enemy.state !== 'INTERROGATED' && enemy.isCollidingWith(this.player)) {
        foundNearby = enemy;
        break;
      }
    }
    this.nearbyEnemy = foundNearby;
  }

  triggerLocalQuestion(enemy) {
    this.isAnswering = true;
    if (this.player) this.player.isInterrogated = true;
    
    if (enemy) {
        enemy.state = "INTERROGATED";
        enemy.dx = 0;
        enemy.dy = 0;
    }

    const q = this.questionManager.getRandomQuestion(this.difficulty);
    this.uiManager.showQuestion(q, enemy, (isCorrect) => {
      this.isAnswering = false;
      if (this.player) this.player.isInterrogated = false;
      
      if (isCorrect) {
        this.score += 10;
        this.correctAnswersCount++;
        this.uiManager.updateScore(this.score);
        this.uiManager.showNotification('Benar!');
        
        // Check for 50 point win condition
        if (this.score >= 50) {
            this.gameOver();
            return;
        }
      } else {
        this.uiManager.showNotification('Salah!');
      }
      this.answeredQuestionsCount++;
      
      if (enemy) {
        const safePos = this.findSafeSpawnPoint();
        enemy.x = safePos.x;
        enemy.y = safePos.y;
        enemy.state = 'WALK';
        enemy.stateTimer = 120;
      }

      if (this.answeredQuestionsCount >= this.maxQuestions) {
        this.gameOver();
      }
    });
  }

  gameOver() {
    this.isRunning = false;
    this.uiManager.showGameOver(this.score, this.correctAnswersCount, Math.floor(this.timeRemaining), this.playerName);
  }

  draw() {
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    
    if (this.cameraZoom !== 1.0) {
        this.ctx.scale(this.cameraZoom, this.cameraZoom);
    }

    // APPLY CAMERA TRANSLATION
    this.ctx.translate(-Math.round(this.cameraX), -Math.round(this.cameraY));
    
    if (this.map.ready) this.map.draw(this.ctx);

    if (this.nearbyEnemy) this.nearbyEnemy.isNearby = true;
    this.enemies.forEach(e => e.draw(this.ctx, this.cameraZoom));
    if (this.nearbyEnemy) this.nearbyEnemy.isNearby = false;
    
    if (this.multiplayer.remotePlayers) {
      this.multiplayer.remotePlayers.forEach((p) => {
          this.multiplayer.drawRemotePlayer(this.ctx, p);
      });
    }
    
    if (this.player) this.player.draw(this.ctx, this.cameraZoom);
    
    this.ctx.restore();
    if (GAME_CONFIG.DEBUG_MODE) this.drawDebugInfo();
  }

  findSafeSpawnPoint() {
      if (!this.map || !this.map.ready) return { x: 400, y: 300 };
      let attempts = 0;
      const mapW = this.map.width * this.map.tileSize * this.map.scale;
      const mapH = this.map.height * this.map.tileSize * this.map.scale;
      while (attempts < 100) {
          const x = 100 + Math.random() * (mapW - 200);
          const y = 100 + Math.random() * (mapH - 200);
          if (!this.map.isSolid(x, y)) return { x, y };
          attempts++;
      }
      return { x: 400, y: 300 };
  }

  drawDebugInfo() {
    this.ctx.fillStyle = "yellow";
    this.ctx.font = "14px monospace";
    this.ctx.fillText(`MP: ${this.multiplayer.isConnected ? 'CONNECTED' : 'OFFLINE'}`, 20, 30);
    this.ctx.fillText(`Cam: ${Math.round(this.cameraX)}, ${Math.round(this.cameraY)}`, 20, 50);
  }

  gameLoop () {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

  