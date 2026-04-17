import fs from 'fs';
import path from 'path';

export class MapManager {
    constructor(scale = 2) {
        this.scale = scale;
        this.collisionRects = [];
        this.gameArea = null;
        this.enemySpawnArea = null;
        this.playerSpawnArea = null;   // rectangle area (legacy)
        this.playerSpawnPoints = [];   // point list from "spawn-player" layer
        this.width = 0;
        this.height = 0;
        this.tileWidth = 0;
        this.tileHeight = 0;
    }

    loadMap(tmxPath) {
        try {
            const content = fs.readFileSync(tmxPath, 'utf-8');
            
            // Extract map dimensions
            const mapMatch = content.match(/<map[^>]+width="([^"]+)"[^>]+height="([^"]+)"[^>]+tilewidth="([^"]+)"[^>]+tileheight="([^"]+)"/i);
            if (mapMatch) {
                this.width = parseInt(mapMatch[1]);
                this.height = parseInt(mapMatch[2]);
                this.tileWidth = parseInt(mapMatch[3]);
                this.tileHeight = parseInt(mapMatch[4]);
                console.log(`[MapManager] Map dimensions: ${this.width}x${this.height}, tiles: ${this.tileWidth}x${this.tileHeight}`);
            }
            
            // Robust extraction of solid objects (collison, invis-wall, etc.)
            const solidGroups = ['collison', 'invis-wall', 'collision', 'solids', 'Object Layer 1'];
            
            solidGroups.forEach(groupName => {
                const groupRegex = new RegExp(`<objectgroup[^>]*name="${groupName}"[^>]*>([\\s\\S]*?)<\/objectgroup>`, 'i');
                const groupMatch = content.match(groupRegex);
                
                if (groupMatch) {
                    const objectsBlock = groupMatch[1];
                    const objectRegex = /<object[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+width="([^"]+)"[^>]+height="([^"]+)"/g;
                    
                    let match;
                    while ((match = objectRegex.exec(objectsBlock)) !== null) {
                        const x = parseFloat(match[1]) * this.scale;
                        const y = parseFloat(match[2]) * this.scale;
                        const w = parseFloat(match[3]) * this.scale;
                        const h = parseFloat(match[4]) * this.scale;
                        
                        this.collisionRects.push({ x, y, width: w, height: h });
                    }
                    console.log(`[MapManager] Loaded ${this.collisionRects.length} total solid objects (added ${groupName})`);
                }
            });

            // Extract enemy spawn area
            const enemySpawnMatch = content.match(/<objectgroup[^>]*name="enemy spawn"[^>]*>([\s\S]*?)<\/objectgroup>/i);
            if (enemySpawnMatch) {
                const spawnBlock = enemySpawnMatch[1];
                const spawnObjMatch = spawnBlock.match(/<object[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+width="([^"]+)"[^>]+height="([^"]+)"/i);
                if (spawnObjMatch) {
                    this.enemySpawnArea = {
                        x: parseFloat(spawnObjMatch[1]) * this.scale,
                        y: parseFloat(spawnObjMatch[2]) * this.scale,
                        width: parseFloat(spawnObjMatch[3]) * this.scale,
                        height: parseFloat(spawnObjMatch[4]) * this.scale
                    };
                    console.log("[MapManager] Loaded enemy spawn area:", this.enemySpawnArea);
                }
            }

            // Extract player spawn points from "spawn-player" or "player spawn" layer (point objects)
            const playerSpawnMatch = content.match(/<objectgroup[^>]*name="(spawn-player|player spawn)"[^>]*>([\s\S]*?)<\/objectgroup>/i);
            if (playerSpawnMatch) {
                const spawnBlock = playerSpawnMatch[2];
                // Match every <object ... x="..." y="..."> that contains a <point/> child
                const pointObjRegex = /<object[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]*>[\s\S]*?<point\s*\/>[\s\S]*?<\/object>/gi;
                let pm;
                while ((pm = pointObjRegex.exec(spawnBlock)) !== null) {
                    this.playerSpawnPoints.push({
                        x: parseFloat(pm[1]) * this.scale,
                        y: parseFloat(pm[2]) * this.scale
                    });
                }
                // Also support inline self-closing objects that have a <point/> after the tag
                if (this.playerSpawnPoints.length === 0) {
                    const inlineRegex = /<object[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]*\/>/gi;
                    let im;
                    while ((im = inlineRegex.exec(spawnBlock)) !== null) {
                        this.playerSpawnPoints.push({
                            x: parseFloat(im[1]) * this.scale,
                            y: parseFloat(im[2]) * this.scale
                        });
                    }
                }
                console.log(`[MapManager] Loaded ${this.playerSpawnPoints.length} player spawn point(s):`, this.playerSpawnPoints);
            }

            // Fallback: legacy rectangle "player spawn" layer
            const playerSpawnAreaMatch = content.match(/<objectgroup[^>]*name="player spawn"[^>]*>([\/\s\S]*?)<\/objectgroup>/i);
            if (playerSpawnAreaMatch && this.playerSpawnPoints.length === 0) {
                const spawnBlock = playerSpawnAreaMatch[1];
                const spawnObjMatch = spawnBlock.match(/<object[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+width="([^"]+)"[^>]+height="([^"]+)"/i);
                if (spawnObjMatch) {
                    this.playerSpawnArea = {
                        x: parseFloat(spawnObjMatch[1]) * this.scale,
                        y: parseFloat(spawnObjMatch[2]) * this.scale,
                        width: parseFloat(spawnObjMatch[3]) * this.scale,
                        height: parseFloat(spawnObjMatch[4]) * this.scale
                    };
                    console.log("[MapManager] Loaded player spawn area (legacy):", this.playerSpawnArea);
                }
            }

            // Extract Game-area object
            const gameAreaMatch = content.match(/<object[^>]+name="Game-area"[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+width="([^"]+)"[^>]+height="([^"]+)"/i);
            if (gameAreaMatch) {
                this.gameArea = {
                    x: parseFloat(gameAreaMatch[1]) * this.scale,
                    y: parseFloat(gameAreaMatch[2]) * this.scale,
                    width: parseFloat(gameAreaMatch[3]) * this.scale,
                    height: parseFloat(gameAreaMatch[4]) * this.scale
                };
                console.log("[MapManager] Game-area boundary loaded:", this.gameArea);
            }
        } catch (err) {
            console.error("[MapManager] Error loading TMX:", err);
        }
    }

    clampToArea(x, y, radius = 0) {
        let minX, minY, maxX, maxY;

        if (this.gameArea) {
            minX = this.gameArea.x + radius;
            minY = this.gameArea.y + radius;
            maxX = this.gameArea.x + this.gameArea.width - radius;
            maxY = this.gameArea.y + this.gameArea.height - radius;
        } else {
            // Fallback to map dimensions
            const mapW = this.width * this.tileWidth * this.scale;
            const mapH = this.height * this.tileHeight * this.scale;
            minX = radius;
            minY = radius;
            maxX = mapW - radius;
            maxY = mapH - radius;
        }

        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y))
        };
    }

    isSolid(x, y, radius = 5) {
        // Circle-rect AABB collision check
        for (const rect of this.collisionRects) {
            if (x + radius > rect.x && 
                x - radius < rect.x + rect.width &&
                y + radius > rect.y && 
                y - radius < rect.y + rect.height) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns true if the point is inside a wall OR within `margin` pixels of any wall.
     * Used during enemy/player spawning to guarantee a safe clearance zone.
     */
    isTooCloseToWall(x, y, margin = 30) {
        // Check center + 8 probe points at the given margin distance
        const probeOffsets = [
            [0, 0],
            [margin, 0], [-margin, 0],
            [0, margin], [0, -margin],
            [margin, margin], [-margin, margin],
            [margin, -margin], [-margin, -margin]
        ];
        for (const [dx, dy] of probeOffsets) {
            if (this.isSolid(x + dx, y + dy, 4)) return true;
        }
        return false;
    }
}
