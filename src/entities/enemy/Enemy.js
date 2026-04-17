import { GAME_CONFIG } from '../../core/config.js';
import goblin_idle from '../../assets/sprites/goblin_idle.png';
import goblin_run from '../../assets/sprites/goblin_run.png';
import skeleton_idle from '../../assets/sprites/skeleton_idle.png';
import skeleton_run from '../../assets/sprites/skeleton_run.png';

// Sub-modules
import { updateEnemyAI } from './ai.js';
import { drawEnemy } from './view.js';

const CHARACTER_ASSETS = {
  'Goblin': { run: goblin_run, idle: goblin_idle, idleFrames: 8, runFrames: 8 },
  'Skeleton': { run: skeleton_run, idle: skeleton_idle, idleFrames: 6, runFrames: 8 }
};

export class Enemy {
  /**
   * Initializes the Enemy.
   */
  constructor(x, y, characterName = null) {
    const ENEMY_TYPES = ['Goblin', 'Skeleton'];
    // If no valid type given, pick randomly
    this.characterName = ENEMY_TYPES.includes(characterName)
      ? characterName
      : ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    this.x = x;
    this.y = y;
    this.radius = GAME_CONFIG.ENEMY_RADIUS;
    this.speed = GAME_CONFIG.ENEMY_SPEED;
    this.id = Math.random().toString(36).substr(2, 9);
    this.isActive = true; 

    // Load assets
    const assets = CHARACTER_ASSETS[this.characterName] || CHARACTER_ASSETS['Goblin'];
    this.assets = assets;
    this.runImage = new Image();
    this.runImage.src = assets.run;
    this.idleImage = new Image();
    this.idleImage.src = assets.idle;

    // Animation state
    this.baseFrame = 0; 
    this.animFrame = 0;
    this.tick = 0;
    this.facingLeft = false;
    this.isMoving = false;
    
    // AI state machine
    this.state = 'IDLE'; 
    this.stateTimer = Math.random() * 60;
    this.dx = 0;
    this.dy = 0;
    
    // logic timers
    this.noticeTimer = 0;
    this.fleeTimer = 0;
    this.cooldownTimer = 0;
  }

  update(canvasWidth, canvasHeight, isInterrogated = false, player = null, gameMap = null, isMultiplayer = false) {
    if (isMultiplayer) {
        const tx = this.targetX ?? this.x;
        const ty = this.targetY ?? this.y;
        const dist = Math.sqrt(Math.pow(tx - this.x, 2) + Math.pow(ty - this.y, 2));
        
        if (dist > 100) {
            this.x = tx;
            this.y = ty;
        } else {
            this.x += (tx - this.x) * 0.2;
            this.y += (ty - this.y) * 0.2;
        }
        
        this.isMoving = (dist > 0.5);
        this.state = this.isMoving ? 'WALK' : 'IDLE';

        if (this.isMoving && Math.abs(tx - this.x) > 0.1) {
            this.facingLeft = (tx < this.x);
        }
    } else {
        updateEnemyAI(this, canvasWidth, canvasHeight, isInterrogated, player, gameMap);
        // NOTICE and TIRED are frozen states — force isMoving off regardless of stale dx/dy
        if (this.state === 'NOTICE' || this.state === 'TIRED' || this.state === 'INTERROGATED') {
            this.isMoving = false;
        } else {
            this.isMoving = (Math.abs(this.dx) > 0.1 || Math.abs(this.dy) > 0.1);
        }
        // Single player AI updates facing inside updateEnemyAI/updateFacing
    }

    // Determine which sprite sheet will be used this frame
    const useRunSheet = (this.state === 'WALK' || this.state === 'FLEE');
    const frames = useRunSheet
        ? (this.assets.runFrames || 8)
        : (this.assets.idleFrames || 9);

    // Clamp animFrame whenever we switch sheets to avoid out-of-bounds frame reads
    if (this.animFrame >= frames) {
        this.animFrame = 0;
    }

    // Consolidated Animation Loop (Handles both single and multiplayer)
    this.tick++;
    let animSpeed = 5; // Faster default
    if (this.state === 'FLEE') animSpeed = 3; // Even faster when fleeing
    else if (this.state === 'NOTICE') animSpeed = 999; // Pause on notice
    else if (!this.isMoving) animSpeed = 8; // Faster idle

    if (this.tick > animSpeed) {
        this.animFrame = (this.animFrame + 1) % frames;
        this.tick = 0;
    }
  }

  draw(ctx, zoom = 1.0) {
    drawEnemy(this, ctx, this.assets, zoom);
  }

  isCollidingWith(player) {
    if (!this.isActive) return false;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    return Math.sqrt(dx * dx + dy * dy) < this.radius + player.radius;
  }
}