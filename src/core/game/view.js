import { GAME_CONFIG } from '../config.js';

/**
 * Handle recursive screen redrawing and depth sorting
 */
export function drawGame(game) {
    game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

    let mapW = game.gameMap.width * game.gameMap.tileSize * game.gameMap.scale;
    let mapH = game.gameMap.height * game.gameMap.tileSize * game.gameMap.scale;

    // Camera
    let cameraX = mapW > game.canvas.width ?
        Math.max(0, Math.min(mapW - game.canvas.width, game.player.x - game.canvas.width / 2)) :
        -(game.canvas.width - mapW) / 2;
    let cameraY = mapH > game.canvas.height ?
        Math.max(0, Math.min(mapH - game.canvas.height, game.player.y - game.canvas.height / 2)) :
        -(game.canvas.height - mapH) / 2;

    game.ctx.save();
    game.ctx.translate(-cameraX, -cameraY);

    if (game.gameMap && game.gameMap.ready) {
        game.gameMap.draw(game.ctx);
        if (GAME_CONFIG.DEBUG_MODE) game.gameMap.drawCollisions(game.ctx);
    }

    if (game.entitiesInitialized) {
        const sorted = [...game.enemies, ...game.rivals, game.player].sort((a, b) => a.y - b.y);
        for (let ent of sorted) if (ent.isActive !== false) ent.draw(game.ctx);
    }

    // Draw remote multiplayer players (from Colyseus state)
    if (game.isMultiplayer && game.multiplayer) {
        game.multiplayer.remotePlayers.forEach((rp) => {
            drawRemotePlayer(game.ctx, rp);
        });
    }

    game.ctx.restore();
}

/**
 * Renders a remote player as a colored circle with name label above.
 */
function drawRemotePlayer(ctx, rp) {
    const r = GAME_CONFIG.PLAYER_RADIUS;

    ctx.beginPath();
    ctx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 180, 255, 0.45)';
    ctx.fill();
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    ctx.font = `7px 'Press Start 2P'`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(rp.name || '?', rp.x, rp.y - r - 5);
    ctx.fillStyle = '#fff';
    ctx.fillText(rp.name || '?', rp.x, rp.y - r - 5);
}
