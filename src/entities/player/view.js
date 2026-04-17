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
        correct = 0,
        maxQuestions = 5,
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
      
      // Ensure player is visible even when zoomed out (Host POV)
      // We counteract the global camera zoom by increasing the local draw scale
      const zoomFactor = (zoom < 1.0) ? (1.0 / zoom) : 1.0;
      const dw = frameWidth * GAME_CONFIG.SCALE * zoomFactor;
      const dh = frameHeight * GAME_CONFIG.SCALE * zoomFactor;

      ctx.save();
      // Use crisp pixels even when scaled up
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

      // Label Configuration
      const scaleFactor = (zoom < 1.0) ? (1.0 / zoom) : 1.0;
      const baseFontSize = 6 * GAME_CONFIG.SCALE * scaleFactor;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = `${baseFontSize}px "Press Start 2P"`;
      
      // Calculate layout positions very close to character top (y - dh/2)
      const headTop = y - (dh / 2);
      
      // 1. Draw Name (Topmost)
      const nameY = headTop - (10 * scaleFactor);
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 3 * scaleFactor;
      ctx.strokeText(name, x, nameY);
      ctx.fillText(name, x, nameY);
      
      // 2. Progress Bar (Middle)
      const barW = 44 * scaleFactor;
      const barH = 5 * scaleFactor;
      const barY = headTop - (8 * scaleFactor);
      const barX = x - barW / 2;
      
      // Bar Background (Dark)
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(barX, barY, barW, barH);
      
      // Bar Progress (Green)
      ctx.fillStyle = "#4CAF50";
      const progress = maxQuestions > 0 ? Math.min(1, correct / maxQuestions) : 0; 
      if (progress > 0) {
          ctx.fillRect(barX, barY, barW * progress, barH);
      }
      
      // Bar Border (Crisp)
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1 * scaleFactor;
      ctx.strokeRect(barX, barY, barW, barH);

      // 3. Stats / PTS (Just above head/integrated)
      if (score !== null) {
          const statsText = `${score} PTS (${correct}/${maxQuestions})`;
          ctx.font = `${baseFontSize * 0.7}px "Press Start 2P"`;
          const statsY = headTop - (1 * scaleFactor);
          ctx.strokeText(statsText, x, statsY);
          ctx.fillText(statsText, x, statsY);
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
        correct: (window.gameInstance?.correctAnswersCount) ?? 0,
        maxQuestions: (window.gameInstance?.maxQuestions) ?? GAME_CONFIG.MAX_QUESTIONS,
        zoom: zoom
    });
}