import './styles/style.css';
import { Game } from './core/game/Game.js';
import { 
  createIcons, 
  MonitorPlay, 
  Users, 
  ClipboardCopy, 
  UserPlus, 
  Swords, 
  Search, 
  Hourglass, 
  ListOrdered, 
  Star, 
  Music, 
  Trophy, 
  CheckCircle2 
} from 'lucide';

// Pre-bind icons so UIManager can call window.lucide.createIcons() without arguments
const icons = {
  MonitorPlay, Users, ClipboardCopy, UserPlus, Swords, Search,
  Hourglass, ListOrdered, Star, Music, Trophy, CheckCircle2
};

window.lucide = { 
  createIcons: () => createIcons({ icons }) 
};

document.addEventListener('DOMContentLoaded', () => {
  // Initial icons render
  window.lucide.createIcons();

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