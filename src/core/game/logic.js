import { GAME_CONFIG } from '../config.js';
import { Enemy } from '../../entities/enemy/Enemy.js';
import { questions } from '../../data/questions.js';

/**
 * Handle game physics, spawning, interaction and state updates
 */
export function updateGame(game) {
    if (game.gameMap && game.gameMap.ready && !game.entitiesInitialized) {
        const mapW = game.gameMap.width * game.gameMap.tileSize * game.gameMap.scale;
        const mapH = game.gameMap.height * game.gameMap.tileSize * game.gameMap.scale;
        
        game.player.x = mapW / 2;
        game.player.y = mapH / 2;
        
        spawnEnemies(game, GAME_CONFIG.TOTAL_ENEMIES);
        game.entitiesInitialized = true;
    }

    if (!game.entitiesInitialized) return;

    const useW = game.gameMap.width * game.gameMap.tileSize * game.gameMap.scale;
    const useH = game.gameMap.height * game.gameMap.tileSize * game.gameMap.scale;
    
    if (!game.isAnswering) {
        game.player.update(useW, useH, game.gameMap);
    }

    for (let rival of game.rivals) {
      rival.update();
    }

    for (let enemy of game.enemies) {
      if (enemy.isActive) {
        const isBeingInterrogated = game.isAnswering && enemy === game.currentHitEnemy;
        enemy.update(useW, useH, isBeingInterrogated, game.player, game.gameMap);
      }
    }
}

/**
 * Circle-based collision check to trigger interactions
 */
export function handleInteraction(game) {
    for (let enemy of game.enemies) {
        if (enemy.isActive && enemy.isCollidingWith(game.player)) {
            triggerQuiz(game, enemy);
            break;
        }
    }
}

/**
 * Create enemies at random non-solid map positions
 */
export function spawnEnemies(game, count) {
    const mapW = game.gameMap.width * game.gameMap.tileSize * game.gameMap.scale;
    const mapH = game.gameMap.height * game.gameMap.tileSize * game.gameMap.scale;

    for (let i = 0; i < count; i++) {
        let x, y, isValid = false, attempts = 0;
        while (!isValid && attempts < 10) {
            x = 64 + Math.random() * (mapW - 128);
            y = 128 + Math.random() * (mapH - 192);
            if (!game.gameMap.isSolid(x, y)) isValid = true;
            attempts++;
        }
        game.enemies.push(new Enemy(x, y)); // type is randomly chosen inside Enemy constructor
    }
}

/**
 * Handle the trivia quiz state when player hits an enemy
 */
export function triggerQuiz(game, enemy) {
    game.isAnswering = true;
    game.currentHitEnemy = enemy; 
    
    // Filter questions by difficulty first
    const poolByDifficulty = questions.filter(q => q.difficulty === game.difficulty);
    const availableQuestions = poolByDifficulty.filter(q => !game.usedQuestions.includes(q.question));
    
    // Fallback if we run out: Reset questions of this difficulty
    const finalPool = availableQuestions.length > 0 ? availableQuestions : (game.usedQuestions = [], poolByDifficulty);
    const question = finalPool[Math.floor(Math.random() * finalPool.length)];
    game.usedQuestions.push(question.question);

    game.uiManager.showQuestion(question, enemy, (isCorrect) => {
        game.answeredQuestionsCount++;
        if (isCorrect) {
            game.score += GAME_CONFIG.SCORE_PER_QUESTION;
            game.correctAnswersCount++;
        }
        if (game.currentHitEnemy) game.currentHitEnemy.isActive = false;
        
        game.uiManager.updateScore(game.score);
        game.isAnswering = false; 
        game.currentHitEnemy = null;

        // Check if player reached the goal
        if (game.answeredQuestionsCount >= GAME_CONFIG.MAX_QUESTIONS) {
            game.gameOver();
        } else {
            spawnEnemies(game, 1);
        }
    });
}
