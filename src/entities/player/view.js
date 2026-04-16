import { GAME_CONFIG } from '../../core/config.js';

/**
 * Reusable character sprite drawing (improved)
 */
export function drawCharacterSprite(ctx, x, y, config = {}) {
    const { 
        name = "PLAYER", 
        isMoving = false, 
        facingLeft = false,
        baseFrame = 0, 
        animFrame = 0, 
        runImage, 
        idleImage,
        idleFrames = 9,
        runFrames = 8,
        score = null,
        zoom = 1.0
    } = config;

    const currentImage = isMoving ? runImage : idleImage;
    const maxFrames = isMoving ? runFrames : idleFrames;

    if (currentImage && currentImage.complete && currentImage.width > 0) {
      const frameWidth = currentImage.width / maxFrames;
      const frameHeight = currentImage.height;

      // Force baseFrame to 0 since we use single-strip assets + facingLeft logic
      const currentBaseFrame = 0; 
      const currentFrame = (animFrame % maxFrames);
      const srcX = (currentBaseFrame + currentFrame) * frameWidth;
      
      const dw = frameWidth * GAME_CONFIG.SCALE;
      const dh = frameHeight * GAME_CONFIG.SCALE;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      
      // Implement FLIP if facingLeft
      // We draw centered on (x, y) vertically to match hitbox center
      if (facingLeft) {
          ctx.save();
          ctx.translate(x, y);
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
            x - dw / 2, y - dh / 2, dw, dh
          );
      }

      // Label - Scale font based on zoom to keep it readable
      // Use a minimum scale to ensure visibility on minimap
      const scaleFactorLabel = Math.max(1, 0.4 / zoom); 
      const baseFontSize = (10 * GAME_CONFIG.SCALE/2);
      ctx.font = `bold ${baseFontSize * scaleFactorLabel}px "Press Start 2P"`;
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2 * scaleFactorLabel;
      const labelY = y - (dh / 2) - (10 * scaleFactorLabel);
      ctx.strokeText(name, x, labelY);
      ctx.fillText(name, x, labelY);
      
      if (score !== null) {
          ctx.font = `bold ${8 * scaleFactorLabel}px Arial`;
          ctx.fillText(`${score} PTS`, x, labelY - (12 * scaleFactorLabel));
      }
      
      ctx.restore();
    } else {
      ctx.fillStyle = "#2196F3";
      ctx.beginPath(); ctx.arc(x, y - 10, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "white"; ctx.fillText(name, x, y - 25);
    }
}

export function drawPlayer(player, ctx, zoom = 1.0) {
    drawCharacterSprite(ctx, player.x, player.y, {
        name: player.name,
        isMoving: player.isMoving,
        facingLeft: player.facingLeft,
        baseFrame: player.baseFrame,
        animFrame: player.animFrame,
        runImage: player.runImage,
        idleImage: player.idleImage,
        idleFrames: player.idleFrames || 9,
        runFrames: player.runFrames || 8,
        zoom: zoom
    });
}