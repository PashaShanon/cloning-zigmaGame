import { GAME_CONFIG } from '../../core/config.js';

/**
 * Handles player movement logic, normalization, and collision detection
 */
export function updatePlayer(player, canvasWidth, canvasHeight, gameMap) {
    let dx = 0;
    let dy = 0;
    player.isMoving = false;

    // input check
    if (!player.isInterrogated) {
        // Keyboard Input (WASD)
        if (player.keys.w) { dy -= 1; player.isMoving = true; player.baseFrame = 6; }
        if (player.keys.s) { dy += 1; player.isMoving = true; player.baseFrame = 18; }
        if (player.keys.a) { dx -= 1; player.isMoving = true; player.baseFrame = 12; }
        if (player.keys.d) { dx += 1; player.isMoving = true; player.baseFrame = 0; }

        // Joystick Input (Mobile) - Only if no keyboard input is active
        if (dx === 0 && dy === 0 && (player.joystickVector.x !== 0 || player.joystickVector.y !== 0)) {
            dx = player.joystickVector.x;
            dy = player.joystickVector.y;
            player.isMoving = true;

            // Determine baseFrame based on major direction
            if (Math.abs(dx) > Math.abs(dy)) {
                player.baseFrame = dx < 0 ? 12 : 0; // Left or Right
            } else {
                player.baseFrame = dy < 0 ? 6 : 18; // Up or Down
            }
        }
    }

    // Handle Cooldowns
    if (player.attackCooldown > 0) {
        player.attackCooldown -= 1/60;
    }

    // Normalize movement speed (so WASD diagonal isn't faster, but analog can be slower)
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    const nextX = player.x + dx * player.speed;
    const nextY = player.y + dy * player.speed;

    // Collision Check with Map
    if (gameMap && gameMap.ready) {
        const mapWidth = gameMap.width * gameMap.tileSize * gameMap.scale;
        const mapHeight = gameMap.height * gameMap.tileSize * gameMap.scale;

        if (!checkCollision(player, nextX, player.y, gameMap)) {
            player.x = nextX;
        }
        if (!checkCollision(player, player.x, nextY, gameMap)) {
            player.y = nextY;
        }

        // Clamp to Game-area defined in Tiled
        const clamped = gameMap.clampToArea(player.x, player.y, GAME_CONFIG.PLAYER_RADIUS);
        player.x = clamped.x;
        player.y = clamped.y;
    }

    

    // Step animation
    player.tick++;
    if (player.tick > 5) {
      player.animFrame = (player.animFrame + 1) % 6;
      player.tick = 0;
    }
}

/**
 * Physics sensor points for map collision
 */
export function checkCollision(player, x, y, gameMap) {
    if (!gameMap) return false;
    const r = player.radius;
    return (
        gameMap.isSolid(x - r, y) ||
        gameMap.isSolid(x + r, y) ||
        gameMap.isSolid(x, y - r) ||
        gameMap.isSolid(x, y + r * 0.625)
    );
}

/**
 * Check if player is completely stuck and try to resolve
 */
export function resolveStuckPlayer(player, gameMap) {
    if (!gameMap) return false;
    
    // Try to move player in small steps to get unstuck
    const directions = [
        { dx: 0, dy: -2 },  // Up
        { dx: 0, dy: 2 },   // Down
        { dx: -2, dy: 0 },  // Left
        { dx: 2, dy: 0 },   // Right
        { dx: -2, dy: -2 }, // Up-left
        { dx: 2, dy: -2 },  // Up-right
        { dx: -2, dy: 2 },  // Down-left
        { dx: 2, dy: 2 }    // Down-right
    ];
    
    for (let dir of directions) {
        const newX = player.x + dir.dx;
        const newY = player.y + dir.dy;
        if (!checkCollision(player, newX, newY, gameMap)) {
            player.x = newX;
            player.y = newY;
            return true;
        }
    }
    
    return false;
}
