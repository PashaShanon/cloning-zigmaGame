import { GAME_CONFIG } from '../../core/config.js';
import botSpriteUrl from '../../assets/modern_tiles/Characters_free/Bob_run_16x16.png';
import botIdleUrl from '../../assets/modern_tiles/Characters_free/Bob_idle_anim_16x16.png';

export class Bot {
  constructor(x, y, name, score) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.score = score;
    this.radius = GAME_CONFIG.PLAYER_RADIUS;

    this.runImage = new Image();
    this.runImage.src = botSpriteUrl;
    this.idleImage = new Image();
    this.idleImage.src = botIdleUrl;

    this.baseFrame = 18; 
    this.animFrame = 0;
    this.tick = 0;
    this.isMoving = false;
  }

  update() {
    // Just idling for Simulation
    this.tick++;
    if (this.tick > 10) {
      this.animFrame = (this.animFrame + 1) % 6;
      this.tick = 0;
    }
  }

  draw(ctx) {
    if (!this.runImage.complete) return;
    const frameWidth = 16;
    const frameHeight = 32;
    const currentFrame = this.baseFrame + this.animFrame;
    const srcX = currentFrame * frameWidth;
    const dw = frameWidth * GAME_CONFIG.SCALE;
    const dh = frameHeight * GAME_CONFIG.SCALE;

    ctx.drawImage(
      this.idleImage, 
      srcX, 0, frameWidth, frameHeight, 
      this.x - dw / 2, this.y - dh, dw, dh
    );

    // Draw BOT label
    ctx.font = "8px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700"; // GOLD for competitors
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeText(this.name, this.x, this.y - dh - 5);
    ctx.fillText(this.name, this.x, this.y - dh - 5);
  }
}
