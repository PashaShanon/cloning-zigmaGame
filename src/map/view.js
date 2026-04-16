import { GAME_CONFIG } from '../core/config.js';

/**
 * Render individual tile layers based on GID calculations (fixed for flags)
 */
export function renderLayer(map, tileIds) {
    if(!map.ctx) return;
    for (let i = 0; i < tileIds.length; i++) {
        let gid = tileIds[i] & 0x1FFFFFFF; // Remove flip flags
        if (gid === 0) continue;
        
        let tileset = null;
        for (let j = map.tilesetsInfo.length - 1; j >= 0; j--) {
            if (gid >= map.tilesetsInfo[j].firstgid) {
                tileset = map.tilesetsInfo[j];
                break;
            }
        }
        
        if (!tileset) continue;

        const localId = gid - tileset.firstgid;
        const srcX = (localId % tileset.columns) * map.tileSize;
        const srcY = Math.floor(localId / tileset.columns) * map.tileSize;
        const destX = (i % map.width) * map.tileSize;
        const destY = Math.floor(i / map.width) * map.tileSize;
        
        // Check for flip flags and apply transforms if needed
        const flippedHorizontally = (tileIds[i] & 0x80000000) !== 0;
        const flippedVertically = (tileIds[i] & 0x40000000) !== 0;
        const flippedDiagonally = (tileIds[i] & 0x20000000) !== 0;
        
        if (flippedHorizontally || flippedVertically || flippedDiagonally) {
            map.ctx.save();
            map.ctx.translate(destX + map.tileSize/2, destY + map.tileSize/2);
            
            // Standard Tiled flag transformation logic
            if (flippedDiagonally) {
                if (flippedHorizontally && flippedVertically) {
                    map.ctx.rotate(Math.PI/2);
                    map.ctx.scale(-1, 1);
                } else if (flippedHorizontally) {
                    map.ctx.rotate(Math.PI/2);
                } else if (flippedVertically) {
                    map.ctx.rotate(3 * Math.PI/2);
                } else {
                    map.ctx.rotate(Math.PI/2);
                    map.ctx.scale(1, -1);
                }
            } else {
                if (flippedHorizontally && flippedVertically) {
                    map.ctx.scale(-1, -1);
                } else if (flippedHorizontally) {
                    map.ctx.scale(-1, 1);
                } else if (flippedVertically) {
                    map.ctx.scale(1, -1);
                }
            }

            map.ctx.drawImage(tileset.img, srcX, srcY, map.tileSize, map.tileSize, 
                             -map.tileSize/2, -map.tileSize/2, map.tileSize, map.tileSize);
            map.ctx.restore();
        } else {
            map.ctx.drawImage(tileset.img, srcX, srcY, map.tileSize, map.tileSize, 
                             destX, destY, map.tileSize, map.tileSize);
        }
    }
}

/**
 * Main map draw call with global scaling (fixed for smooth rendering)
 */
export function drawMap(map, ctx) {
    if (!map.ready) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
        map.offscreenCanvas, 
        0, 0, map.offscreenCanvas.width, map.offscreenCanvas.height, 
        0, 0, map.offscreenCanvas.width * map.scale, map.offscreenCanvas.height * map.scale
    );
}

/**
 * Debug renderer for showing collision boxes (improved)
 */
export function drawCollisions(map, ctx) {
    if (!map.ready || map.collisionObjects.length === 0) return;
    
    // Draw object collisions
    for (const obj of map.collisionObjects) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 1;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }
    
    // Draw tile-based collisions (debug)
    if (map.collisionGrid && GAME_CONFIG.DEBUG_MODE) {
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.collisionGrid[y][x]) {
                    ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
                    ctx.fillRect(
                        x * map.tileSize * map.scale,
                        y * map.tileSize * map.scale,
                        map.tileSize * map.scale,
                        map.tileSize * map.scale
                    );
                }
            }
        }
    }
}