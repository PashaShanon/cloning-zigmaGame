import { GAME_CONFIG } from '../../core/config.js';

/**
 * Handles character rendering, notice indicators, and debug overlays
 */
export function drawEnemy(enemy, ctx, assets, zoom = 1.0) {
    if (!enemy.isActive) return;

    const isWalking = (enemy.state === 'WALK' || enemy.state === 'FLEE');
    const currentImage = isWalking ? enemy.runImage : enemy.idleImage;
    const maxFrames = isWalking ? (assets.runFrames || 8) : (assets.idleFrames || 9);

    if (currentImage && currentImage.complete && currentImage.width > 0) {
      const frameWidth = currentImage.width / maxFrames;
      const frameHeight = currentImage.height;
      
      // Force baseFrame to 0 for single-strip assets
      const currentBaseFrame = 0;
      const currentFrame = (enemy.animFrame % maxFrames);
      const srcX = (currentBaseFrame + currentFrame) * frameWidth;
      
      // Apply scale adjustment for minimap readability
      const scaleFactor = Math.max(1, 0.4 / zoom);
      const dw = frameWidth * GAME_CONFIG.SCALE * scaleFactor;
      const dh = frameHeight * GAME_CONFIG.SCALE * scaleFactor;
      
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Implement FLIP if facingLeft
      // We draw centered on (enemy.x, enemy.y) vertically to match hitbox center
      if (enemy.facingLeft) {
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.scale(-1, 1);
          ctx.drawImage(
            currentImage, 
            srcX, 0, frameWidth, frameHeight, 
            - dw / 2, - dh / 2, dw, dh
          );
          ctx.restore();
      } else {
          ctx.drawImage(
            currentImage, 
            srcX, 0, frameWidth, frameHeight, 
            enemy.x - dw / 2, enemy.y - dh / 2, dw, dh
          );
      }

      // DEBUG SENSOR RANGE
      if (GAME_CONFIG.DEBUG_MODE) {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 180, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
      }

      // Reaction Indicator
      if (enemy.isNearby && GAME_CONFIG.DEBUG_MODE) {
          const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = "#FFD700";
          ctx.font = `bold ${14 * GAME_CONFIG.SCALE / 2}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText("[Klik!]", enemy.x, enemy.y - dh/2 - 12);
          ctx.globalAlpha = 1.0;

          // Highlight ring
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, dw / 2 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 220, 0, ${pulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();
      } 

      // Label Styling (NOTICE/TIRED)
      const baseFontSize = 8 * GAME_CONFIG.SCALE * scaleFactor;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      if (enemy.state === 'NOTICE') {
          const bubbleY = enemy.y - dh/2 - (15 * scaleFactor);
          ctx.font = `bold ${baseFontSize * 2.5}px Arial`;
          ctx.fillStyle = "#FF4444";
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3 * scaleFactor;
          ctx.strokeText("!", enemy.x, bubbleY);
          ctx.fillText("!", enemy.x, bubbleY);
      } else if (enemy.state === 'TIRED') {
          const textY = enemy.y - dh/2 - (5 * scaleFactor);
          ctx.font = `bold ${baseFontSize * 1.5}px "Press Start 2P"`;
          ctx.fillStyle = "#4FC3F7";
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2 * scaleFactor;
          ctx.strokeText("...", enemy.x, textY);
          ctx.fillText("...", enemy.x, textY);
      }

      // Hitbox
      if (GAME_CONFIG.DEBUG_MODE) {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
          ctx.strokeStyle = "yellow";
          ctx.stroke();
          ctx.closePath();
      }
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.closePath();
    }
}