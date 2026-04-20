import { GAME_CONFIG } from '../../core/config.js';
import sunny_idle from '../../assets/sprites/sunny_idle.png';
import sunny_run from '../../assets/sprites/sunny_run.png';
import { updatePlayer, resolveStuckPlayer } from './logic.js';
import { drawPlayer } from './view.js';

export class Player {
  /**
   * Initializes the Player.
   * 1. Initializes stats and physics.
   * 2. Loads texture assets.
   * 3. Sets up keyboard listeners.
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.name = 'PLAYER';
    this.radius = GAME_CONFIG.PLAYER_RADIUS; 
    this.speed = GAME_CONFIG.PLAYER_SPEED;
    this.nearInteractable = false;
    
    // Multiplayer properties
    this.id = Math.random().toString(36).substr(2, 9);
    this.multiplayerManager = null;
    
    // image preload with error handling
    this.runImage = new Image();
    this.runImage.src = sunny_run;
    this.runImage.onerror = () => console.error("Failed to load player run sprite");
    
    this.idleImage = new Image();
    this.idleImage.src = sunny_idle;
    this.idleImage.onerror = () => console.error("Failed to load player idle sprite");

    // Sunny frame counts
    this.idleFrames = 9;
    this.runFrames = 8;

    // animations
    this.baseFrame = 0; 
    this.animFrame = 0; 
    this.tick = 0;
    this.isMoving = false;
    this.facingLeft = false;
    this.stuckCounter = 0;

    this.keys = { w: false, s: false, a: false, d: false };
    this.joystickVector = { x: 0, y: 0 }; // Added for mobile analog
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.isInterrogated = false;
    this.score = 0;
    this.maxQuestions = GAME_CONFIG.MAX_QUESTIONS;

    // Mouse listener for attacking
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click
            this.performAttack();
        }
    });

    // controls
    window.addEventListener('keydown', (e) => {
        if (this.isInterrogated) return;
        
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            if (!this.keys[key]) {
                this.keys[key] = true;
                if (this.multiplayerManager) {
                    this.multiplayerManager.room?.send("input", { key, pressed: true });
                }
            }
            if (['w', 'a', 's', 'd'].includes(key)) e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
            if (this.multiplayerManager) {
                this.multiplayerManager.room?.send("input", { key, pressed: false });
            }
            if (['w', 'a', 's', 'd'].includes(key)) e.preventDefault();
        }
    });
    
    window.addEventListener('blur', () => {
        this.keys = { w: false, s: false, a: false, d: false };
        this.isMoving = false;
    });
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  setMultiplayerManager(manager) {
    this.multiplayerManager = manager;
  }

  update(canvasWidth, canvasHeight, gameMap) {
    if (this.multiplayerManager?.isConnected) {
        const tx = this.targetX ?? this.x;
        const ty = this.targetY ?? this.y;
        const dist = Math.sqrt(Math.pow(tx - this.x, 2) + Math.pow(ty - this.y, 2));
        
        this.x += (tx - this.x) * 0.3;
        this.y += (ty - this.y) * 0.3;

        this.isMoving = (dist > 0.5);
        if (this.isMoving && Math.abs(tx - this.x) > 0.1) {
            this.facingLeft = (tx < this.x);
        }

        this.tick++;
        if (this.tick > 5) {
            const maxFrames = this.isMoving ? 8 : 9;
            this.animFrame = (this.animFrame + 1) % maxFrames;
            this.tick = 0;
        }
    } else {
        if (this.isInterrogated) {
            this.isMoving = false;
        } else {
            updatePlayer(this, canvasWidth, canvasHeight, gameMap);
        }

        if (this.keys.a) this.facingLeft = true;
        if (this.keys.d) this.facingLeft = false;

        // Animation for single player
        this.tick++;
        if (this.tick > 6) {
          const maxFrames = this.isMoving ? 8 : 9;
          this.animFrame = (this.animFrame + 1) % maxFrames;
          this.tick = 0;
        }
    }
  }

  updateForMultiplayer(canvasWidth, canvasHeight, gameMap, multiplayerManager) {
    if (multiplayerManager && !this.multiplayerManager) {
      this.multiplayerManager = multiplayerManager;
    }
    this.update(canvasWidth, canvasHeight, gameMap);
  }

  draw(ctx, zoom = 1.0) {
    drawPlayer(this, ctx, zoom);
  }
  
  performAttack() {
    if (this.attackCooldown > 0 || this.isInterrogated) return;
    this.isAttacking = true;
    this.attackCooldown = 0.5;
    if (this.multiplayerManager) {
        this.multiplayerManager.sendAttack();
    }
    setTimeout(() => {
        this.isAttacking = false;
    }, 400); 
  }

  resetPosition(x, y) {
    this.x = x;
    this.y = y;
    this.stuckCounter = 0;
    this.isMoving = false;
  }
}