import { GAME_CONFIG } from '../../core/config.js';

/**
 * Update Enemy State (IDLE, WALK, NOTICE, FLEE)
 */
export function updateEnemyAI(enemy, canvasWidth, canvasHeight, isInterrogated, player, gameMap) {
    if (!enemy.isActive) return;

    if (enemy.state === 'INTERROGATED') {
        enemy.dx = 0;
        enemy.dy = 0;
        enemy.animFrame = 0;
        return;
    }

    // Reaction and Reaction Cooldown Management
    if (enemy.cooldownTimer > 0) enemy.cooldownTimer--;

    if (player && enemy.state !== 'NOTICE' && enemy.state !== 'FLEE') {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < GAME_CONFIG.FLEE_RADIUS && enemy.cooldownTimer <= 0) {
            enemy.state = 'NOTICE';
            enemy.noticeTimer = 30;
            enemy.dx = 0;
            enemy.dy = 0;
            enemy.animFrame = 0; // Reset so idle sheet renders from frame 0
            enemy.tick = 0;
            
            // Look at player
            enemy.facingLeft = (dx < 0);
        }
    }

    // Process States
    if (enemy.state === 'NOTICE') {
        enemy.noticeTimer--;
        if (enemy.noticeTimer <= 0) {
            enemy.state = 'FLEE';
            enemy.fleeTimer = 180; // Run for 3 seconds
            enemy.animFrame = 0; // switch idle→run sheet
            enemy.tick = 0;
            
            // Pick target furthest from player
            const target = findFurthestPointFromPlayer(enemy, player, gameMap);
            enemy.targetX = target.x;
            enemy.targetY = target.y;
        }
    }

    if (enemy.state === 'FLEE') {
        enemy.fleeTimer--;
        
        // Move towards target
        const dx = enemy.targetX - enemy.x;
        const dy = enemy.targetY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const speed = enemy.speed * 2.5; 
        if (dist > 10) {
            enemy.dx = (dx / dist) * speed;
            enemy.dy = (dy / dist) * speed;
        } else {
            enemy.dx = 0;
            enemy.dy = 0;
            enemy.state = 'TIRED';
            enemy.tiredTimer = 120;
        }

        // Re-evaluate if player gets too close
        if (player) {
            const pDx = enemy.x - player.x;
            const pDy = enemy.y - player.y;
            const pDist = Math.sqrt(pDx * pDx + pDy * pDy);
            if (pDist < 100) {
                const target = findFurthestPointFromPlayer(enemy, player, gameMap);
                enemy.targetX = target.x;
                enemy.targetY = target.y;
            }
        }
        
        updateFacing(enemy);

        if (enemy.fleeTimer <= 0) {
            enemy.state = 'TIRED';
            enemy.tiredTimer = 180;
            enemy.dx = 0;
            enemy.dy = 0;
            enemy.animFrame = 0; // switch run→idle sheet
            enemy.tick = 0;
        }
    }

    if (enemy.state === 'TIRED') {
        enemy.tiredTimer--;
        enemy.dx = 0;
        enemy.dy = 0;
        if (enemy.tiredTimer <= 0) {
            enemy.state = 'WALK';
            enemy.cooldownTimer = 240;
            enemy.stateTimer = 180;
            enemy.animFrame = 0; // switch idle→run sheet
            enemy.tick = 0;
        }
    }

    // Wander state management
    if (enemy.state === 'WALK') {
        if (enemy.cooldownTimer > 0 && player) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                enemy.dx = (dx / dist) * enemy.speed;
                enemy.dy = (dy / dist) * enemy.speed;
            }
            updateFacing(enemy);
        }
    }
        
    enemy.stateTimer--;
    if (enemy.stateTimer <= 0 && enemy.state !== 'NOTICE' && enemy.state !== 'FLEE' && enemy.state !== 'TIRED') {
        if (enemy.cooldownTimer > 0) {
            enemy.state = 'WALK';
            enemy.stateTimer = 60;
            enemy.animFrame = 0;
            enemy.tick = 0;
        } else if (enemy.state === 'IDLE') {
            enemy.state = 'WALK';
            enemy.stateTimer = 60 + Math.random() * 90;
            const angle = Math.random() * Math.PI * 2;
            enemy.dx = Math.cos(angle) * enemy.speed;
            enemy.dy = Math.sin(angle) * enemy.speed;
            updateFacing(enemy);
            enemy.animFrame = 0; // switch idle→run sheet
            enemy.tick = 0;
        } else {
            enemy.state = 'IDLE';
            enemy.stateTimer = 60 + Math.random() * 120;
            enemy.dx = 0;
            enemy.dy = 0;
            enemy.animFrame = 0; // switch run→idle sheet
            enemy.tick = 0;
        }
    }

    // IMPROVED: Physics implementation with proper collision resolution
    if (enemy.state === 'WALK' || enemy.state === 'FLEE') {
        let moveX = enemy.dx;
        let moveY = enemy.dy;
        
        if (gameMap && (moveX !== 0 || moveY !== 0)) {
            // Try to resolve collision smoothly
            const resolved = resolveCollision(enemy, moveX, moveY, gameMap);
            enemy.x = resolved.x;
            enemy.y = resolved.y;
            
            // Check if we're still stuck and try to escape
            if (checkCollision(enemy, enemy.x, enemy.y, gameMap)) {
                // Emergency unstuck
                unstuckEnemy(enemy, gameMap);
            }
            
            // Update direction if we couldn't move in intended direction
            if (resolved.x === enemy.x - moveX && resolved.y === enemy.y - moveY) {
                // Completely stuck, try new direction
                if (enemy.state === 'WALK' && enemy.cooldownTimer <= 0) {
                    const angle = Math.random() * Math.PI * 2;
                    enemy.dx = Math.cos(angle) * enemy.speed;
                    enemy.dy = Math.sin(angle) * enemy.speed;
                    updateFacing(enemy);
                }
            }
        } else if (gameMap) {
            // No movement, just check if stuck
            if (checkCollision(enemy, enemy.x, enemy.y, gameMap)) {
                unstuckEnemy(enemy, gameMap);
            }
        } else {
            enemy.x += moveX;
            enemy.y += moveY;
        }

        // Boundary constraints
        if (gameMap) {
            const clamped = gameMap.clampToArea(enemy.x, enemy.y, GAME_CONFIG.ENEMY_RADIUS);
            enemy.x = clamped.x;
            enemy.y = clamped.y;
        }
        
        if (moveX !== 0 || moveY !== 0) updateFacing(enemy);
    }

    // Animation state is now handled exclusively in Enemy.js to avoid double-ticks
}

/**
 * NEW: Smooth collision resolution
 */
function resolveCollision(enemy, dx, dy, gameMap) {
    let newX = enemy.x;
    let newY = enemy.y;
    
    // Try moving in small steps for smoother collision
    const steps = 4;
    const stepX = dx / steps;
    const stepY = dy / steps;
    
    for (let i = 0; i < steps; i++) {
        const testX = newX + stepX;
        const testY = newY + stepY;
        
        let canMoveX = true;
        let canMoveY = true;
        
        // Check X movement
        if (!checkCollision(enemy, testX, newY, gameMap)) {
            newX = testX;
        } else {
            canMoveX = false;
        }
        
        // Check Y movement
        if (!checkCollision(enemy, newX, testY, gameMap)) {
            newY = testY;
        } else {
            canMoveY = false;
        }
        
        // If both directions blocked, try diagonal
        if (!canMoveX && !canMoveY) {
            if (!checkCollision(enemy, testX, testY, gameMap)) {
                newX = testX;
                newY = testY;
            }
        }
    }
    
    return { x: newX, y: newY };
}

/**
 * NEW: Emergency unstuck function
 */
function unstuckEnemy(enemy, gameMap) {
    // Try to move in all 8 directions to get unstuck
    const directions = [
        { dx: -5, dy: 0 },   // Left
        { dx: 5, dy: 0 },    // Right
        { dx: 0, dy: -5 },   // Up
        { dx: 0, dy: 5 },    // Down
        { dx: -5, dy: -5 },  // Up-Left
        { dx: 5, dy: -5 },   // Up-Right
        { dx: -5, dy: 5 },   // Down-Left
        { dx: 5, dy: 5 }     // Down-Right
    ];
    
    for (let dir of directions) {
        const newX = enemy.x + dir.dx;
        const newY = enemy.y + dir.dy;
        if (!checkCollision(enemy, newX, newY, gameMap)) {
            enemy.x = newX;
            enemy.y = newY;
            return true;
        }
    }
    
    // If completely stuck, teleport slightly
    enemy.x += 10;
    enemy.y += 10;
    return false;
}

/**
 * IMPROVED: Sensors around enemy for collision with multiple points
 */
export function checkCollision(enemy, x, y, gameMap) {
    if (!gameMap || !gameMap.ready) return false;
    const r = enemy.radius;
    
    // Check multiple points around the enemy
    const checkPoints = [
        { x: x - r, y: y },                 // Left
        { x: x + r, y: y },                 // Right
        { x: x, y: y - r },                 // Top
        { x: x, y: y + r * 0.75 },          // Bottom (feet)
        { x: x - r * 0.7, y: y - r * 0.7 }, // Top-left
        { x: x + r * 0.7, y: y - r * 0.7 }, // Top-right
        { x: x - r * 0.7, y: y + r * 0.5 }, // Bottom-left
        { x: x + r * 0.7, y: y + r * 0.5 }  // Bottom-right
    ];
    
    for (let point of checkPoints) {
        if (gameMap.isSolid(point.x, point.y)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Handle Sprite facing based on direction vector
 */
export function updateFacing(enemy) {
    if (Math.abs(enemy.dx) < 0.1) return;
    enemy.facingLeft = (enemy.dx < 0);
}

/**
 * Find a coordinate on the map furthest from the player that is not solid.
 */
function findFurthestPointFromPlayer(enemy, player, gameMap) {
    if (!gameMap || !player) return { x: enemy.x, y: enemy.y };

    const mapW = gameMap.width * (gameMap.tileWidth || gameMap.tileSize) * gameMap.scale;
    const mapH = gameMap.height * (gameMap.tileHeight || gameMap.tileSize) * gameMap.scale;
    
    let bestTarget = { x: enemy.x, y: enemy.y };
    let maxDist = -1;

    // Sample points in a grid
    const samples = 6;
    for (let ix = 0; ix < samples; ix++) {
        for (let iy = 0; iy < samples; iy++) {
            const tx = (ix / (samples - 1)) * mapW;
            const ty = (iy / (samples - 1)) * mapH;

            if (!gameMap.isSolid(tx, ty)) {
                const distToPlayer = Math.sqrt(Math.pow(tx - player.x, 2) + Math.pow(ty - player.y, 2));
                if (distToPlayer > maxDist) {
                    maxDist = distToPlayer;
                    bestTarget = { x: tx, y: ty };
                }
            }
        }
    }
    return bestTarget;
}
 

