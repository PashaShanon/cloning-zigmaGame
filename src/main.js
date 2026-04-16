import './styles/style.css';
import { Game } from './core/game/Game.js';

document.addEventListener('DOMContentLoaded', () => {
  const playerName = localStorage.getItem('playerName');
  if (!playerName) {
    window.location.href = '/login.html';
    return;
  }

  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    const game = new Game(canvas);
  } else {
    console.error("Game canvas not found!");
  }
});