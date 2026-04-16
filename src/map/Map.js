import { GAME_CONFIG } from '../core/config.js';
import mapData0 from '../assets/maps/map.tmx?raw';
import mapData1 from '../assets/maps/map1.tmx?raw';
import mapData2 from '../assets/maps/map2.tmx?raw';

const MAPS = {
  'map.tmx': mapData0,
  'map1.tmx': mapData1,
  'map2.tmx': mapData2
};

// SunnySide World Tilesets (Ensure these files exist in src/assets/tilesets/)
import outputTilesetImg from '../assets/tilesets/output_tileset.png';
import sunnySideImg from '../assets/tilesets/spr_tileset_sunnysideworld_16px.png';

// Core modules
import { initMap, isWorldSolid, clampToGameArea } from './logic.js';
import { renderLayer, drawMap, drawCollisions } from './view.js';

export class Map {
  /**
   * Initializes the Map.
   * 1. Initializes state and offscreen canvas.
   * 2. Sets up tileset metadata and scaling.
   * 3. Triggers map loading and parsing.
   */
  constructor() {
    this.ready = false;
    this.offscreenCanvas = document.createElement('canvas');
    this.ctx = this.offscreenCanvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; 
    
    this.currentMapName = '-';
    this.width = 0;
    this.height = 0;
    this.collisionObjects = []; 
    
    this.scale = GAME_CONFIG.SCALE; 
    this.tileSize = GAME_CONFIG.TILE_SIZE;

    // Updated to match map.tmx tileset definitions (only one tileset)
    this.tilesetsInfo = [
      { firstgid: 1, columns: 64, src: sunnySideImg, img: new Image() }
    ];

    this.loadMap('map.tmx');
  }

  loadMap(mapName) {
    const data = MAPS[mapName] || MAPS['map.tmx'];
    this.currentMapName = mapName;
    this.ready = false;
    this.collisionObjects = [];
    initMap(this, data);
  }

  /**
   * Renders specific tile layers to the offscreen canvas.
   */
  renderLayer(tileIds) {
    renderLayer(this, tileIds);
  }

  /**
   * Draws the rendered map onto the main game canvas.
   */
  draw(ctx) {
    drawMap(this, ctx);
  }

  /**
   * Determines if a specific world coordinate is solid (collidable).
   */
  isSolid(worldX, worldY) {
    return isWorldSolid(this, worldX, worldY);
  }

  /**
   * Renders collision boundaries for debugging purposes.
   */
  drawCollisions(ctx) {
    drawCollisions(this, ctx);
  }

  /**
   * Clamps a position to the defined Game-area.
   */
  clampToArea(x, y, radius = 0) {
    return clampToGameArea(this, x, y, radius);
  }
}
