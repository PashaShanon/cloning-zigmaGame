export const GAME_CONFIG = {
    // 1. Visual & Scaling
    SCALE: 2, 
    TILE_SIZE: 16, // Base tile size from assets

    // 2. Player start menu
    get PLAYER_SPEED() { return 2 * (this.SCALE / 2); },
    PLAYER_RADIUS: 12, // Match server authority

    // 3. Enemy start menu
    _enemySpeedBase: 1,
    get ENEMY_SPEED() { return this._enemySpeedBase * (this.SCALE / 2); },
    set ENEMY_SPEED(val) { this._enemySpeedBase = val; },
    ENEMY_RADIUS: 12, // Match server authority
    
    // 4. Gameplay Rules
    SCORE_PER_QUESTION: 10,
    INITIAL_TIME: 60, 
    MAX_QUESTIONS: 5, 

    // 5. System
    _fleeRadiusBase: 150,
    get FLEE_RADIUS() { return this._fleeRadiusBase * (this.SCALE / 2); },
    set FLEE_RADIUS(val) { this._fleeRadiusBase = val; },
    TOTAL_ENEMIES: 10, // Initial count of enemies on map 

    DEBUG_MODE: false // Toggle to true to see hitboxes & detection circles 
};

