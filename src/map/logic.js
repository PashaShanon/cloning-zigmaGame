/**
 * Parse TMX XML data, Tileset metadata and handle collision checks
 */
export async function initMap(map, tmxData) {
    try {
        // 1. Load tileset images
        const loadPromises = map.tilesetsInfo.map(ts => {
          return new Promise((resolve) => {
            ts.img.src = ts.src;
            ts.img.onload = () => resolve();
            ts.img.onerror = () => {
              console.error("Failed to load map tileset:", ts.src);
              resolve(); 
            }
          });
        });

        await Promise.all(loadPromises);

        // 2. Parse XML
        if (!tmxData) return;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(tmxData, "text/xml");
        const mapNode = xmlDoc.getElementsByTagName("map")[0];
        
        map.width = parseInt(mapNode.getAttribute("width")); 
        map.height = parseInt(mapNode.getAttribute("height")); 
        map.tileWidth = parseInt(mapNode.getAttribute("tilewidth"));
        map.tileHeight = parseInt(mapNode.getAttribute("tileheight"));

        map.offscreenCanvas.width = map.width * map.tileSize;
        map.offscreenCanvas.height = map.height * map.tileSize;
        
        // 3. Create collision grid for faster lookups
        map.collisionGrid = new Array(map.height);
        for (let i = 0; i < map.height; i++) {
            map.collisionGrid[i] = new Array(map.width);
            for (let j = 0; j < map.width; j++) {
                map.collisionGrid[i][j] = false;
            }
        }
        
        // 4. Render layers and build collision grid
        const layers = xmlDoc.getElementsByTagName("layer");
        for (let i = 0; i < layers.length; i++) {
            const layerNode = layers[i];
            const dataNode = layerNode.getElementsByTagName("data")[0];
            
            // Check if layer has collision property
            const properties = layerNode.getElementsByTagName("property");
            let isCollisionLayer = false;
            for (let prop of properties) {
                if (prop.getAttribute("name") === "collision" && prop.getAttribute("value") === "true") {
                    isCollisionLayer = true;
                    break;
                }
            }
            
            if (dataNode) {
                try {
                    const encoding = dataNode.getAttribute("encoding");
                    let tileIds = null;
                    if (encoding === "csv") {
                        tileIds = new Uint32Array(
                            dataNode.textContent.split(',')
                                .map(n => n.trim())
                                .filter(n => n !== "")
                                .map(n => parseInt(n))
                        );
                    } else if (encoding === "base64") {
                        const compressed = dataNode.getAttribute("compression");
                        if (compressed === "gzip" || compressed === "zlib") {
                            console.warn("Compressed TMX not fully supported:", compressed);
                        }
                        // Clean string: remove any whitespace AND any other non-base64 characters
                        let b64 = dataNode.textContent.replace(/[^A-Za-z0-9+/=]/g, "");
                        // Ensure padding is correct (length must be multiple of 4)
                        while (b64.length % 4 !== 0) {
                            b64 += "=";
                        }
                        tileIds = decodeBase64(b64);
                    }

                    if (tileIds) {
                        map.renderLayer(tileIds);
                        // Build collision grid from this layer if it's a collision layer
                        if (isCollisionLayer) {
                            buildCollisionGrid(map, tileIds);
                        }
                    }
                } catch (e) {
                    console.error(`Error processing layer "${layerNode.getAttribute('name')}":`, e);
                }
            }
        }
        
        // 5. Parse Object Layers
        const objectGroups = xmlDoc.getElementsByTagName("objectgroup");
        map.playerSpawnPoints = [];

        for (let i = 0; i < objectGroups.length; i++) {
            const objects = objectGroups[i].getElementsByTagName("object");
            const groupName = objectGroups[i].getAttribute("name") || "";

            for (let j = 0; j < objects.length; j++) {
                const obj = objects[j];
                let x = parseFloat(obj.getAttribute("x")) || 0;
                let y = parseFloat(obj.getAttribute("y")) || 0;
                const width  = parseFloat(obj.getAttribute("width"))  || 0;
                const height = parseFloat(obj.getAttribute("height")) || 0;

                // Scale from Tiled coords to game world coords
                const scaleX = (map.tileSize / map.tileWidth) * map.scale;
                const scaleY = (map.tileSize / map.tileHeight) * map.scale;
                x = x * scaleX;
                y = y * scaleY;
                const w = width  * scaleX;
                const h = height * scaleY;

                // ── "spawn-player" or "player spawn" layer: point objects (no width/height) ──
                const isSpawnLayer = groupName.toLowerCase() === "spawn-player" || 
                                   groupName.toLowerCase() === "player spawn";
                
                if (isSpawnLayer) {
                    const isPoint = obj.getElementsByTagName("point").length > 0 || (width === 0 && height === 0);
                    if (isPoint) {
                        map.playerSpawnPoints.push({ x, y });
                        console.log(`[Map] Player spawn point: (${x.toFixed(1)}, ${y.toFixed(1)})`);
                    }
                    continue; // don't add to collisionObjects
                }

                const objData = {
                    x: x,
                    y: y,
                    width: w,
                    height: h,
                    name: obj.getAttribute("name") || "",
                    type: obj.getAttribute("type") || "solid"
                };

                // Special case for Game-area
                if (objData.name === "Game-area") {
                    map.gameArea = objData;
                    console.log("Game-area found:", objData);
                }

                map.collisionObjects.push(objData);
            }
        }
        
        // 6. Build spatial hash for collision objects
        buildSpatialHash(map);
        
        map.ready = true;
        console.log("Map initialized:", map.width, "x", map.height, "Collision objects:", map.collisionObjects.length);
    } catch (err) {
        console.error("Map init error:", err);
    }
}

/**
 * Build collision grid from tile layer
 */
function buildCollisionGrid(map, tileIds) {
    for (let i = 0; i < tileIds.length; i++) {
        let gid = tileIds[i] & 0x1FFFFFFF; // Remove flags
        if (gid !== 0) {
            const x = i % map.width;
            const y = Math.floor(i / map.width);
            map.collisionGrid[y][x] = true;
        }
    }
}

/**
 * Build spatial hash for faster collision detection
 */
function buildSpatialHash(map) {
    map.spatialHash = {};
    const cellSize = 64; // Size of spatial hash cells
    
    for (let obj of map.collisionObjects) {
        const startX = Math.floor(obj.x / cellSize);
        const startY = Math.floor(obj.y / cellSize);
        const endX = Math.floor((obj.x + obj.width) / cellSize);
        const endY = Math.floor((obj.y + obj.height) / cellSize);
        
        for (let cy = startY; cy <= endY; cy++) {
            for (let cx = startX; cx <= endX; cx++) {
                const key = `${cx},${cy}`;
                if (!map.spatialHash[key]) {
                    map.spatialHash[key] = [];
                }
                map.spatialHash[key].push(obj);
            }
        }
    }
}

/**
 * Base64 binary decoding utility
 * TMX base64 data is stored as little-endian uint32, which matches
 * the native byte order of Uint32Array on x86 — no byte-swap needed.
 */
export function decodeBase64(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Uint32Array(bytes.buffer);
}

/**
 * IMPROVED: Spatial collision detection for world coordinates
 */
export function isWorldSolid(map, x, y) {
    if (!map.ready) return false;
    
    // Boundary check with tolerance
    const mapW = map.width * map.tileSize * map.scale;
    const mapH = map.height * map.tileSize * map.scale;
    const tolerance = 2;
    if (x < -tolerance || x > mapW + tolerance || y < -tolerance || y > mapH + tolerance) {
        return true;
    }
    
    // Check tile-based collision grid first (faster)
    const tileX = Math.floor(x / (map.tileSize * map.scale));
    const tileY = Math.floor(y / (map.tileSize * map.scale));
    if (tileX >= 0 && tileX < map.width && tileY >= 0 && tileY < map.height) {
        if (map.collisionGrid && map.collisionGrid[tileY] && map.collisionGrid[tileY][tileX]) {
            return true;
        }
    }
    
    // Check object collisions using spatial hash
    if (map.spatialHash) {
        const cellSize = 64;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const key = `${cellX},${cellY}`;
        
        const nearbyObjects = map.spatialHash[key] || [];
        for (const obj of nearbyObjects) {
            if (x >= obj.x && x <= obj.x + obj.width &&
                y >= obj.y && y <= obj.y + obj.height) {
                return true;
            }
        }
        
        // Also check adjacent cells
        const neighbors = [
            `${cellX-1},${cellY}`, `${cellX+1},${cellY}`,
            `${cellX},${cellY-1}`, `${cellX},${cellY+1}`,
            `${cellX-1},${cellY-1}`, `${cellX+1},${cellY+1}`,
            `${cellX-1},${cellY+1}`, `${cellX+1},${cellY-1}`
        ];
        
        for (const neighborKey of neighbors) {
            const neighborObjects = map.spatialHash[neighborKey];
            if (neighborObjects) {
                for (const obj of neighborObjects) {
                    if (x >= obj.x && x <= obj.x + obj.width &&
                        y >= obj.y && y <= obj.y + obj.height) {
                        return true;
                    }
                }
            }
        }
    } else {
        // Fallback to linear search
        for (const obj of map.collisionObjects) {
            if (x >= obj.x && x <= obj.x + obj.width &&
                y >= obj.y && y <= obj.y + obj.height) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Check if a rectangle collides with any solid (for entity collision)
 */
export function isRectSolid(map, rect) {
    if (!map.ready) return false;
    
    // Check corners and edges of the rectangle
    const checkPoints = [
        { x: rect.x, y: rect.y }, // Top-left
        { x: rect.x + rect.width, y: rect.y }, // Top-right
        { x: rect.x, y: rect.y + rect.height }, // Bottom-left
        { x: rect.x + rect.width, y: rect.y + rect.height }, // Bottom-right
        { x: rect.x + rect.width/2, y: rect.y }, // Top-center
        { x: rect.x + rect.width/2, y: rect.y + rect.height }, // Bottom-center
        { x: rect.x, y: rect.y + rect.height/2 }, // Middle-left
        { x: rect.x + rect.width, y: rect.y + rect.height/2 } // Middle-right
    ];
    
    for (let point of checkPoints) {
        if (isWorldSolid(map, point.x, point.y)) {
            return true;
        }
    }
    return false;
}

/**
 * Restrict a position within the map's Game-area if defined.
 */
export function clampToGameArea(map, x, y, radius = 0) {
    if (!map.ready) return { x, y };

    let minX, minY, maxX, maxY;

    if (map.gameArea) {
        minX = map.gameArea.x + radius;
        minY = map.gameArea.y + radius;
        maxX = map.gameArea.x + map.gameArea.width - radius;
        maxY = map.gameArea.y + map.gameArea.height - radius;
    } else {
        // Fallback to full map dimensions
        const mapW = map.width * map.tileSize * map.scale;
        const mapH = map.height * map.tileSize * map.scale;
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