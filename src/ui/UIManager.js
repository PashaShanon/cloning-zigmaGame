import { GAME_CONFIG } from '../core/config.js';

export class UIManager {
  /**
   * Initializes the UIManager.
   */
  constructor(game) {
    this.game = game;
    this.isJoining = false;

    // HUD
    this.scoreElement   = document.getElementById('score-value');
    this.timerValue     = document.getElementById('timer-value');
    this.uiLayer        = document.getElementById('ui-layer');
    this.zigmaHeader    = document.getElementById('zigma-header');
    this.mobileControls = document.getElementById('mobile-controls');

    // 1. Main Modal (Zigma Home)
    this.startModal     = document.getElementById('start-modal');
    this.inputPlayerName= document.getElementById('input-player-name');
    this.inputRoomCode  = document.getElementById('input-room-code');
    this.mainCreateBtn  = document.getElementById('main-create-room-btn');
    this.mainJoinBtn    = document.getElementById('main-join-room-btn');
    this.displayUserName = document.getElementById('display-user-name');

    // 2. Quiz Selection View
    this.quizSelectView = document.getElementById('quiz-select-view');
    this.quizCancelBtn  = document.getElementById('quiz-cancel-btn');
    this.selectedQuizTitle = document.getElementById('selected-quiz-title');

    // Load logged in player name
    const storedName = localStorage.getItem('playerName');
    if (storedName) {
      if (this.inputPlayerName) this.inputPlayerName.value = storedName;
      if (this.displayUserName) this.displayUserName.textContent = storedName.toUpperCase();
    }

    // Auto-fill room code from URL invite link
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && this.inputRoomCode) {
       this.inputRoomCode.value = roomParam.toUpperCase();
    }

    // 2. Create Settings Modal
    this.settingsModal  = document.getElementById('create-settings-modal');
    this.inputQuestions = document.getElementById('input-questions');
    this.inputTime      = document.getElementById('input-time');
    this.inputMap       = document.getElementById('input-map');
    this.settingsCancelBtn = document.getElementById('settings-cancel-btn');
    this.settingsCreateBtn = document.getElementById('settings-create-btn');

    // 3. Lobby Modal
    this.lobbyModal     = document.getElementById('lobby-modal');
    this.lobbyStatus    = document.getElementById('lobby-status');
    this.lobbyPlayersList = document.getElementById('lobby-players-list');
    
    // Lobby Room Info
    this.infoRoomCode   = document.getElementById('info-room-code');
    this.infoMap        = document.getElementById('info-map');
    this.infoQuestions  = document.getElementById('info-questions');
    this.infoTime       = document.getElementById('info-time');
    this.playerCount    = document.getElementById('player-count');
    this.lobbyQrCode    = document.getElementById('lobby-qr-code');
    this.lobbyInviteLink = document.getElementById('lobby-invite-link');

    // Admin HUD
    this.hostHud        = document.getElementById('host-hud');
    this.hostTimerValue = document.getElementById('host-timer-value');
    this.adminEndGameBtn = document.getElementById('admin-end-game-btn');

    // Lobby Actions
    this.lobbyStartBtn  = document.getElementById('lobby-start-game-btn');
    this.lobbyCancelBtn = document.getElementById('lobby-cancel-room-btn');
    this.lobbyLeaveBtn  = document.getElementById('lobby-client-leave-btn');

    // Countdown
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownNumber  = document.getElementById('countdown-number');

    // Question Modal - New elements
    this.modal          = document.getElementById('question-modal');
    this.questionText   = document.getElementById('question-text');
    this.optionsContainer = document.getElementById('options-container');
    this.questionCounter = document.getElementById('question-counter');
    // Removed question_timer_display

    // Game Over
    this.gameOverModal  = document.getElementById('game-over-modal');
    this.finalRank      = document.getElementById('final-rank');
    this.finalScore     = document.getElementById('final-score');
    this.finalCorrect   = document.getElementById('final-correct');
    this.finalTime      = document.getElementById('final-time');
    this.restartBtn     = document.getElementById('restart-btn');

    // Debug Controls
    this.debugMenu      = document.getElementById('debug-menu');
    this.debugHeader    = document.getElementById('debug-header');
    this.addBotBtn      = document.getElementById('add-bot-btn');
    this.botNameInput   = document.getElementById('bot-name');
    this.botScoreInput  = document.getElementById('bot-score');
    this.endGameBtn     = document.getElementById('end-game-btn');

    this._setupRouter();
    this._setupDebugMenu();
    this._setupLobbyEvents();

    this.restartBtn.onclick = () => {
      const container = document.getElementById('game-container');
      container.classList.add('anim-iris-out');
      
      // Explicitly disconnect from multiplayer when going back to menu
      if (this.game.multiplayer) {
          this.game.multiplayer.disconnect();
      }

      setTimeout(() => {
         this.navigateTo('/');
      }, 1200);
    };

    if (this.adminEndGameBtn) {
        this.adminEndGameBtn.onclick = () => {
            if (this.game.multiplayer?.room) {
                this.game.multiplayer.room.send("host_end_game");
            }
        };
    }

    const toggleEnemiesBtn = document.getElementById('admin-toggle-enemies-btn');
    if (toggleEnemiesBtn) {
        toggleEnemiesBtn.onclick = () => {
            this.game.showEnemies = !this.game.showEnemies;
            toggleEnemiesBtn.textContent = this.game.showEnemies ? 'HIDE ENEMIES' : 'SHOW ENEMIES';
            this.game.showNotification(this.game.showEnemies ? 'Musuh ditampilkan' : 'Musuh disembunyikan', 'info');
        };
    }
  }

  // ─────────────────────────────────────────────────
  // ROUTING SYSTEM
  // ─────────────────────────────────────────────────
  _setupRouter() {
    window.addEventListener('popstate', (e) => {
      this.navigateTo(window.location.pathname, false);
    });

    // Initial route - Normalize index.html to /
    setTimeout(() => {
        let currentPath = window.location.pathname;
        if (currentPath.endsWith('/index.html')) {
            currentPath = currentPath.replace('/index.html', '/');
            window.history.replaceState({}, '', currentPath);
        }
        this.navigateTo(currentPath, false);
    }, 100);
  }

  navigateTo(path, push = true) {
    // Normalize path: treat /index.html as / and remove trailing slashes
    if (path.endsWith('/index.html')) {
        path = path.replace('/index.html', '/');
    }
    if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    console.log("[Router] Navigating to:", path);
    if (push) {
      window.history.pushState({}, '', path);
    }

    // Hide everything first
    this.startModal.classList.add('hidden');
    this.quizSelectView.classList.add('hidden');
    this.settingsModal.classList.add('hidden');
    this.lobbyModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    if (this.mobileControls) this.mobileControls.classList.add('hidden');
    if (this.zigmaHeader) this.zigmaHeader.classList.remove('hidden');

    // Auto-disconnect ONLY if leaving ALL game-related paths for a truly unrelated page (like home or settings)
    const isLobbyOrGame = path.includes('/lobby') || path.includes('/game') || path.includes('/progress') || path.includes('/host/select-quiz') || path.includes('/host/settings');
    
    if (!isLobbyOrGame && this.game.multiplayer && this.game.multiplayer.isConnected) {
        console.log("[Router] Leaving game context entirely, disconnecting multiplayer...");
        this.game.multiplayer.disconnect();
    }

    // Show based on path
    if (path === '/' || path.includes('/home') || path === '/host') {
      this.startModal.classList.remove('hidden');
    } 
    else if (path.includes('/host/select-quiz')) {
      this.quizSelectView.classList.remove('hidden');
    }
    else if (path.includes('/host/settings')) {
      this.settingsModal.classList.remove('hidden');
      if (this.settingsCreateBtn) this.settingsCreateBtn.disabled = false;
    }
    else if (path.includes('/progress')) {
      const parts = path.split('/');
      const codeIndex = parts.indexOf('host') + 1;
      const code = parts[codeIndex];
      
      this.game.isAdminMode = true;
      if (this.hostHud) this.hostHud.classList.remove('hidden');
      this.uiLayer.classList.add('hidden'); // Hide normal HUD
      if (this.zigmaHeader) this.zigmaHeader.classList.add('hidden');
      if (this.mobileControls) this.mobileControls.classList.add('hidden');

      // Reload handling: Join room if not connected
      const mp = this.game.multiplayer;
      const isAlreadyInTargetRoom = mp?.isConnected && (mp?.room?.state?.roomCode === code || mp?.roomCode === code);
      
      if (code && code !== '000000' && !this.isJoining && !isAlreadyInTargetRoom) {
          console.log("[Router] Reconnecting to room in progress view:", code);
          this.isJoining = true;
          this.game.multiplayer.joinRoom(code, 'ADMIN')
            .catch(e => {
                console.error("[Router] Progress reconnect failed:", e);
                this.navigateTo('/');
            })
            .finally(() => { this.isJoining = false; });
      }
    }
    else if (path.includes('/game')) {
      const parts = path.split('/');
      const codeIndex = parts.indexOf('game') + 1;
      const code = parts[codeIndex];

      this.game.isAdminMode = false;
      this.uiLayer.classList.remove('hidden');
      if (this.hostHud) this.hostHud.classList.add('hidden');
      if (this.zigmaHeader) this.zigmaHeader.classList.add('hidden');
      
      // Mobile controls visibility
      if (this.game && this.game.mobileController) {
          this.game.mobileController.show();
      }

      // Reload handling for players
      const mp = this.game.multiplayer;
      const isAlreadyInTargetRoom = mp?.isConnected && (mp?.room?.state?.roomCode === code || mp?.roomCode === code);

      if (code && code !== '000000' && !this.isJoining && !isAlreadyInTargetRoom && !mp?.isReconnecting) {
          console.log("[Router] Attempting to restore game session for room:", code);
          this.isJoining = true;
          
          // Try session reconnection ONLY if not currently in a room
          const reconnectPromise = (!mp?.room) 
            ? this.game.multiplayer.tryReconnect() 
            : Promise.resolve(mp.room);
            
          reconnectPromise.then(room => {
              if (room) {
                  console.log("[Router] Session restored via reconnect");
                  
                  // Start game engine if it's the game or progress view
                  const isGamePath = window.location.pathname.includes('/game');
                  const isProgressPath = window.location.pathname.includes('/progress');
                  if (isGamePath || isProgressPath) {
                      this.game.startMultiplayer(room, room.state.hostId === room.sessionId);
                  }
                  return; 
              }
              
              // If reconnect failed, perform normal join
              const savedName = localStorage.getItem('playerName') || 'PLAYER';
              return this.game.multiplayer.joinRoom(code, savedName);
          })
          .catch(e => {
              console.error("[Router] Player recovery failed:", e);
              // Only redirect if absolutely lost connection and not in middle of a reconnect attempt
              if (!this.game.multiplayer?.isReconnecting) {
                  this.navigateTo('/');
              }
          })
          .finally(() => { this.isJoining = false; });
      }
    }
    else if (path.includes('/lobby')) {
      // Path format: /host/ABCDEF/lobby
      const parts = path.split('/');
      const codeIndex = parts.indexOf('host') + 1;
      const code = parts[codeIndex];
      
      this.lobbyModal.classList.remove('hidden');
      
      // Handle URL-based joining (initial load or direct link)
      // We check isJoining to prevent the recursive double-join bug!
      const mp = this.game.multiplayer;
      const currentRoomCode = mp?.room?.state?.roomCode || mp?.roomCode;
      
      // Strict check: already connected to THIS room?
      const isAlreadyInTargetRoom = mp?.isConnected && currentRoomCode === code && mp?.room;

      console.log(`[Router] Lobby check - Code: ${code}, isJoining: ${this.isJoining}, AlreadyInRoom: ${isAlreadyInTargetRoom}, Reconnecting: ${mp?.isReconnecting}`);

      if (code && code !== '000000' && !this.isJoining && !isAlreadyInTargetRoom && !mp?.isReconnecting) {
          console.log(`[Router] Triggering join/reconnect for code: ${code}`);
          this.isJoining = true;
          
          // Only try reconnect if NOT already in a room
          const reconnectPromise = (!mp?.room)
            ? this.game.multiplayer.tryReconnect()
            : Promise.resolve(mp.room);

          reconnectPromise.then(room => {
              if (room) {
                  console.log("[Router] Session restored via reconnect in lobby");
                  return;
              }
              
              this.inputRoomCode.value = code;
              this.game.playerName = this.inputPlayerName.value.trim() || 'PLAYER';
              this.lobbyStatus.textContent = "Bergabung ke room " + code + "...";
              return this.game.multiplayer.joinRoom(code, this.game.playerName);
          })
          .then(() => {
              console.log("[Router] Join/Reconnect successful for", code);
          })
          .catch(e => {
              console.error("[Router] Join failed:", e);
              if (!this.game.multiplayer?.isConnected) {
                  this.lobbyModal.classList.add('hidden');
                  this.startModal.classList.remove('hidden');
                  this.navigateTo('/');
                  alert("Room tidak ditemukan!");
              }
          })
          .finally(() => { this.isJoining = false; });
      }
    }
  }

  // ─────────────────────────────────────────────────
  // START SCREEN
  // ─────────────────────────────────────────────────
  showStartScreen(onStart) {
    const path = window.location.pathname;
    const isGameContext = path.includes('/game') || path.includes('/lobby') || path.includes('/progress');
    
    if (isGameContext) {
        console.log("[UI] Refresh detected at game path. Maintaining context, skipping start screen.");
        this.startActionCallback = onStart; // Still store callback just in case
        return;
    }

    this.uiLayer.classList.add('hidden');
    this.startActionCallback = onStart;
    
    // MAIN: Host -> Buka Pemilihan Quiz
    this.mainCreateBtn.onclick = () => {
      this.navigateTo('/host/select-quiz');
    };

    // QUIZ SELECT: Batal -> Kembali ke Home
    this.quizCancelBtn.onclick = () => {
      this.navigateTo('/');
    };

    // QUIZ SELECT: Search & Filter Dropdown
    const searchInput = document.getElementById('quiz-search-input');
    const categorySelect = document.getElementById('quiz-category-select');
    const quizCards = document.querySelectorAll('.quiz-item-card');

    const filterQuizzes = () => {
      const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
      const categoryFilter = categorySelect ? categorySelect.value.toUpperCase() : 'ALL';
      
      quizCards.forEach(card => {
        const titleEl = card.querySelector('.quiz-item-title');
        const tagEl = card.querySelector('.quiz-cat-tag');
        if (!titleEl || !tagEl) return;

        const titleMatch = titleEl.textContent.toLowerCase().includes(searchTerm);
        const cardCategory = tagEl.textContent.trim().toUpperCase();
        const categoryMatch = categoryFilter === 'ALL' || cardCategory === categoryFilter;
        
        if (titleMatch && categoryMatch) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    };

    if (searchInput) searchInput.addEventListener('input', filterQuizzes);
    if (categorySelect) categorySelect.addEventListener('change', filterQuizzes);

    // Global selector for quiz cards (since they use onclick in HTML)
    window.selectQuiz = (category, title) => {
      if (this.selectedQuizTitle) this.selectedQuizTitle.textContent = title.toUpperCase();
      this.navigateTo('/host/settings');
    };

    // MAIN: Join Room -> Navigasi ke URL lobby, join ditangani oleh Router/navigateTo
    this.mainJoinBtn.onclick = async () => {
      if (this.isJoining) return;
      
      const code = this.inputRoomCode.value.trim().toUpperCase();
      if (!code) {
        alert("Masukkan Kode Room terlebih dahulu!");
        return;
      }
      this.game.playerName = this.inputPlayerName.value.trim() || 'PLAYER';
      
      // Navigate to lobby URL pattern - this will trigger joinRoom inside navigateTo
      this.navigateTo(`/host/${code}/lobby`);
    };

    // SETTINGS: Batal -> Kembali ke Quiz Selection
    this.settingsCancelBtn.onclick = () => {
      this.navigateTo('/host/select-quiz');
    };

    // SETTINGS: Create -> Buat Room di Server
    this.settingsCreateBtn.onclick = () => {
      if (this.settingsCreateBtn.disabled) return;
      this.settingsCreateBtn.disabled = true;

      const playerName = this.inputPlayerName.value.trim() || 'PLAYER';
      const questions  = parseInt(this.inputQuestions.value);
      const timeInSec  = parseInt(this.inputTime.value) * 60;
      const mapName    = this.inputMap.value;
      
      this.settingsModal.classList.add('hidden');
      this.lobbyStatus.textContent = "Membuat room...";
      this.lobbyPlayersList.innerHTML = '<li class="lobby-player-item"><span>Menghubungkan...</span></li>';
      // Navigate is handled inside onRoomJoined once room is actually created? 
      // Actually we should navigate to a loading state or just /lobby
      
      // Reset info displays
      this.infoRoomCode.textContent = "---";
      this.infoMap.textContent = "---";
      this.infoQuestions.textContent = "---";
      this.infoTime.textContent = "---";

      // We pass the start info up so Game.js can create room
      if (typeof onStart === 'function') {
        onStart(questions, timeInSec, mapName, playerName, 'multi');
      }
    };
  }

  // ─────────────────────────────────────────────────
  // LOBBY
  // ─────────────────────────────────────────────────


  /** Called by Multiplayer.js after join is confirmed */
  onHostChanged(isHost) {
    const lobbyContent = document.querySelector('.lobby-content');
    if (isHost) {
      this.lobbyStatus.textContent = '👑 KAMU ADALAH HOST';
      this.lobbyStatus.style.color = '#FFD700';
      if (lobbyContent) lobbyContent.classList.add('host-view');
      this.lobbyStartBtn.classList.remove('hidden');
      this.lobbyCancelBtn.classList.remove('hidden');
      this.lobbyLeaveBtn.classList.add('hidden');
    } else {
      this.lobbyStatus.textContent = '⏳ MENUNGGU HOST MEMULAI...';
      this.lobbyStatus.style.color = '#4CAF50';
      if (lobbyContent) lobbyContent.classList.remove('host-view');
      this.lobbyStartBtn.classList.add('hidden');
      this.lobbyCancelBtn.classList.add('hidden');
      this.lobbyLeaveBtn.classList.remove('hidden');
    }
  }

  onRoomJoined(roomCode, isHost, data = {}) {
    const urlCode = window.location.pathname.split('/')[2];
    const finalCode = (roomCode && roomCode !== "000000") ? roomCode : (urlCode || "ERROR");
    const gameStarted = data.gameStarted || false;
    
    console.log(`[UI] Room Joined -> Code: ${finalCode}, isHost: ${isHost}, GameStarted: ${gameStarted}`);

    // 1. Navigation & View Determination
    const lobbyPath = `/host/${finalCode}/lobby`;
    const hostGamePath = `/host/${finalCode}/progress`;
    const playerGamePath = `/game/${finalCode}`;
    
    const isAlreadyAtLobby = window.location.pathname === lobbyPath;
    const isAlreadyAtGame  = window.location.pathname === hostGamePath || window.location.pathname === playerGamePath;

    // Decide where to navigate - Always ensure we are at the right path
    if (gameStarted && !isAlreadyAtGame) {
        const targetPath = isHost ? hostGamePath : playerGamePath;
        this.navigateTo(targetPath, true);
    } else if (!gameStarted && !isAlreadyAtLobby) {
        this.navigateTo(lobbyPath, true);
    }

    // 2. UI Visibility based on Game State
    if (gameStarted) {
        // HIDDEN LOBBY, SHOW GAME HUD
        this.hideLobby();
        if (isHost) {
            this.hostHud.classList.remove('hidden');
            this.adminEndGameBtn.classList.remove('hidden');
        }
        
        // Ensure game initialization logic runs if needed
        if (this.game && typeof this.game.startMultiplayer === 'function' && !this.game.isRunning) {
            console.log("[UI] Game already started on server, restoring game view...");
            this.onHostChanged(isHost); // Ensure camera/ui knows our role
            this.game.startMultiplayer();
            this.game.gameLoop(); // CRITICAL: Start the rendering loop
        }
    } else {
        // SHOW LOBBY
        this.lobbyModal.classList.remove('hidden');
        if (isHost) {
            this.hostHud.classList.add('hidden');
        }
    }

    // 3. Update Text Content
    if (this.infoRoomCode) this.infoRoomCode.textContent = finalCode;
    
    const currentUrl = window.location.origin + lobbyPath;
    if (this.lobbyQrCode) this.lobbyQrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}`;
    if (this.lobbyInviteLink) this.lobbyInviteLink.textContent = currentUrl;

    if (isHost) {
        this.lobbyStatus.innerHTML = gameStarted ? '<span style="color:#4CAF50">GAME BERLANJUT...</span>' : '<span style="color:#FFD700">👑 KAMU ADALAH HOST</span>';
    } else {
        this.lobbyStatus.textContent = gameStarted ? "KEMBALI KE PERMAINAN" : "BERHASIL BERGABUNG";
        this.lobbyStatus.style.color = "#4CAF50";
    }
    
    // 4. Metadata
    if (this.infoMap) this.infoMap.textContent = data.mapName || 'map.tmx';
    if (this.infoQuestions) this.infoQuestions.textContent = data.maxQuestions || '5';
    if (this.infoTime) this.infoTime.textContent = (data.timeLimit || '5') + " Menit";

    this.onHostChanged(isHost);

    const copyBtn = document.getElementById('copy-code-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(finalCode);
        this.showNotification('Kode room disalin!', 'success');
      };
    }
  }

  updateLobbyList(players, hostId, mySessionId) {
    if (this.playerCount) this.playerCount.textContent = players.length;
    this.lobbyPlayersList.innerHTML = '';
    
    // Show/Hide empty message
    const emptyMsg = document.getElementById('lobby-empty-msg');
    if (emptyMsg) {
        if (players.length > 0) emptyMsg.classList.add('hidden');
        else emptyMsg.classList.remove('hidden');
    }

    // ── OPTIMIZATION: Check if HTML actually changed to avoid DOM thrashing ──
    const newListHTML = players.map(p => {
      const isMe = p.id === mySessionId;
      const isHost = p.id === hostId;
      const isOffline = p.isConnected === false;

      return `
        <li class="lobby-player-item ${isMe ? 'is-me' : ''} ${isHost ? 'is-host' : ''} ${isOffline ? 'is-offline' : ''}" 
            style="background: ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}; 
                   padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; 
                   align-items: center; color: #fff; font-size: 0.7rem; 
                   opacity: ${isOffline ? '0.5' : '1'}">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="user-avatar" style="width:24px; height:24px; background: ${isHost ? '#FFD700' : '#4CAF50'}"></div>
                <div style="display: flex; flex-direction: column;">
                    <span>${p.name}${isMe ? ' (You)' : ''}</span>
                    ${isOffline ? '<span style="font-size: 8px; color: #ffab00;">SEDANG REFRESH...</span>' : ''}
                </div>
                ${isHost ? '<span style="font-size: 8px; color: #FFD700;">[HOST]</span>' : ''}
            </div>
            <span class="lobby-player-ready" style="font-size: 0.8rem;">
                ${isOffline ? 
                  '<i data-lucide="loader-2" class="animate-spin" style="color:#ffab00; width:18px; height:18px;"></i>' : 
                  (p.isReady ? '<i data-lucide="check-circle-2" style="color:#4CAF50; width:18px; height:18px;"></i>' : '<i data-lucide="hourglass" style="color:rgba(255,255,255,0.4); width:18px; height:18px;"></i>')
                }
            </span>
        </li>
      `;
    }).join('');

    // Always refresh the DOM to ensure accuracy
    this.lobbyPlayersList.innerHTML = newListHTML;
    if (window.lucide) window.lucide.createIcons();

    // Auto-enable start button if at least 1 player is inside
    if (hostId === mySessionId) {
        if (players.length >= 1) {
            this.lobbyStartBtn.disabled = false;
            this.lobbyStartBtn.style.background = '#4CAF50';
            this.lobbyStartBtn.style.color = '#fff';
            this.lobbyStartBtn.style.cursor = 'pointer';
        } else {
            this.lobbyStartBtn.disabled = true;
            this.lobbyStartBtn.style.background = 'rgba(255,255,255,0.1)';
            this.lobbyStartBtn.style.color = 'rgba(255,255,255,0.3)';
            this.lobbyStartBtn.style.cursor = 'not-allowed';
        }
    }
    
    // Also update Host Monitoring if in Admin mode
    if (this.game.isAdminMode) {
        this.updateHostMonitoring(players);
    }
  }

  updateHostMonitoring(players) {
    const monitoringList = document.getElementById('host-players-monitoring');
    const monCount = document.getElementById('host-mon-count');
    if (!monitoringList) return;

    if (monCount) monCount.textContent = players.length;
    monitoringList.innerHTML = '';
    
    players.forEach(p => {
        const item = document.createElement('div');
        item.className = 'monitoring-item';
        item.innerHTML = `
            <div style="display:flex; align-items:center;">
                <div class="mon-indicator"></div>
                <div class="mon-name">${p.name}</div>
            </div>
            <div class="mon-score">${p.score || 0} PTS</div>
        `;
        monitoringList.appendChild(item);
    });
  }

  hideLobby() {
    this.lobbyModal.classList.add('hidden');
  }

  _setupLobbyEvents() {
    // HOST: Start Game
    if (this.lobbyStartBtn) {
      this.lobbyStartBtn.onclick = () => {
        console.log("[UI] Clicked Start Game button");
        if (this.game.multiplayer?.room) {
            this.game.multiplayer.room.send("host_start");
            this.lobbyStatus.textContent = "⏳ Memulai game...";
            this.lobbyStartBtn.classList.add('hidden'); // Prevent multiple clicks
        } else {
            console.error("[UI] Room not ready, cannot start game");
        }
      };
    }

    // HOST: Cancel Room
    if (this.lobbyCancelBtn) {
      this.lobbyCancelBtn.onclick = () => {
        this.game.multiplayer?.disconnect();
        this.navigateTo('/');
      };
    }

    // CLIENT: Leave button
    if (this.lobbyLeaveBtn) {
      this.lobbyLeaveBtn.onclick = () => {
        if (this.game.multiplayer) {
          this.game.multiplayer.disconnect(true); // Signal intentional exit
        }
        this.navigateTo('/');
      };
    }
  }

  // ─────────────────────────────────────────────────
  // COUNTDOWN
  // ─────────────────────────────────────────────────
  showPreGameCountdown(onComplete) {
    this.countdownOverlay.classList.remove('hidden');
    let count = 5;
    this.countdownNumber.textContent = count;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownNumber.textContent = count;
      } else if (count === 0) {
        this.countdownNumber.textContent = 'GO!';
        this.countdownNumber.style.color = '#4CAF50';
      } else {
        clearInterval(interval);
        this.countdownOverlay.classList.add('hidden');
        this.uiLayer.classList.remove('hidden');
        this.countdownNumber.style.color = '#4CAF50';

        const container = document.getElementById('game-container');
        container.classList.remove('anim-iris-out', 'anim-iris-in');
        void container.offsetWidth;
        container.classList.add('anim-iris-in');
        setTimeout(() => container.classList.remove('anim-iris-in'), 1200);

        onComplete();
      }
    }, 1000);
  }

  // ─────────────────────────────────────────────────
  // HUD
  // ─────────────────────────────────────────────────
  updateScore(score) {
    this.scoreElement.textContent = score;
  }

  updateTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    
    // Normal HUD
    const timerEl = document.getElementById('timer-value');
    if (timerEl) {
        timerEl.textContent = timeStr;
        timerEl.classList.remove('timer-warning', 'timer-critical');
        if (seconds <= 10) timerEl.classList.add('timer-critical');
        else if (seconds <= 30) timerEl.classList.add('timer-warning');
    }

    // Admin HUD
    if (this.hostTimerValue) {
        this.hostTimerValue.textContent = timeStr;
    }
  }

  // ─────────────────────────────────────────────────
  // QUESTION
  // ─────────────────────────────────────────────────
  /**
   * @param {object} questionData
   * @param {object} enemyData
   * @param {function(boolean, string)} onAnswer - (isCorrect, selectedOption)
   */
  showQuestion(questionData, enemyData, onAnswer) {
    if (typeof enemyData === 'function') {
      onAnswer = enemyData;
      enemyData = null;
    }

    // Update question counter if available
    if (this.questionCounter && this.game) {
      const currentQ = this.game.currentQuestionIndex || 0;
      const totalQ = this.game.maxQuestions || 10;
      this.questionCounter.textContent = `SOAL ${currentQ + 1} / ${totalQ}`;
    }
    
    // Hide virtual mobile controls so they don't block visibility 
    const mobileUI = document.getElementById('mobile-controls');
    if (mobileUI) mobileUI.style.display = 'none';

    this.questionText.textContent = questionData.question;
    this.optionsContainer.innerHTML = '';
    
    // Set actual enemy sprite
    const spriteEl = document.querySelector('.enemy-sprite');
    const nameEl = document.querySelector('.enemy-name');
    if (spriteEl) {
      spriteEl.innerHTML = ''; // Clear fallback or old img
      spriteEl.style.animation = 'none';
      spriteEl.style.backgroundImage = 'none';

      if (enemyData && enemyData.idleImage && enemyData.assets.idleFrames) {
        spriteEl.classList.add('has-character-sprite');
        
        const frames = enemyData.assets.idleFrames;
        const imgRawWidth = enemyData.idleImage.width || (96 * frames); // fallback
        const imgRawHeight = enemyData.idleImage.height || 64;
        
        const frameW = imgRawWidth / frames;
        const frameH = imgRawHeight;
        const SCALE = 4.5; 
        
        spriteEl.style.width = `${frameW}px`;
        spriteEl.style.height = `${frameH}px`;
        // Scale it up centrally using CSS transform so it doesn't break flex boundaries
        spriteEl.style.transform = 'scale(3.5)';
        spriteEl.style.overflow = 'hidden';
        spriteEl.style.position = 'relative';
        
        const img = document.createElement('img');
        img.src = enemyData.idleImage.src;
        img.style.height = '100%';
        img.style.width = 'auto';
        img.style.position = 'absolute';
        img.style.left = '0';
        img.style.top = '0';
        img.style.imageRendering = 'pixelated';
        
        img.animate(
          [
            { transform: `translateX(0px)` },
            { transform: `translateX(-${frameW * frames}px)` }
          ],
          {
            duration: frames * 150, 
            easing: `steps(${frames})`,
            iterations: Infinity
          }
        );
        
        spriteEl.appendChild(img);
      } else {
        spriteEl.classList.remove('has-character-sprite');
        spriteEl.style.width = '100px';
        spriteEl.style.height = '100px';
        spriteEl.style.animation = 'enemyIdle 1s ease-in-out infinite';
      }
    }
    if (nameEl) {
      nameEl.innerHTML = enemyData && enemyData.characterName ? enemyData.characterName.toUpperCase() : "MUSUH";
    }

    const buttons = [];
    const isMP = questionData.correctAnswer === '__SERVER__';

    questionData.options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = `[${index + 1}.] ${option}`;

      // ANTI-GHOST CLICK: Disable interaction for 400ms so the user's thumb 
      // lifting from the Action Button doesn't accidentally click an option!
      btn.style.pointerEvents = 'none';
      setTimeout(() => {
          btn.style.pointerEvents = 'auto';
      }, 400);

      btn.onclick = () => {
        const isCorrect = isMP ? true : option === questionData.correctAnswer;

        if (!isMP) {
          if (isCorrect) btn.classList.add('correct-answer');
          else btn.classList.add('wrong-answer');
        }

        const allBtns = this.optionsContainer.querySelectorAll('button');
        allBtns.forEach(b => b.style.pointerEvents = 'none');
        window.removeEventListener('keydown', this.keyHandler);

        setTimeout(() => {
          this.hideQuestion();
          onAnswer(isCorrect, option);
        }, isMP ? 0 : 600);
      };
      this.optionsContainer.appendChild(btn);
      buttons.push(btn);
    });

    this.keyHandler = (e) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
    };
    window.addEventListener('keydown', this.keyHandler);
    this.modal.classList.remove('hidden');
  }

  /**
   * Update question timer display - Removed as per user request
   */
  updateQuestionTimer(seconds) {
     // No-op
  }

  hideQuestion() {
    this.modal.classList.add('hidden');
    
    // Restore virtual mobile controls if they were initialized
    const mobileUI = document.getElementById('mobile-controls');
    if (mobileUI && mobileUI.getAttribute('data-initialized') === 'true') {
        mobileUI.style.display = '';
    }
  }

  // ─────────────────────────────────────────────────
  // GAME OVER
  // ─────────────────────────────────────────────────
  showGameOver(score, correctCount, timeRemaining, playerName) {
    this.hideQuestion();
    const container = document.getElementById('game-container');
    container.classList.remove('anim-iris-in', 'anim-iris-out');
    void container.offsetWidth;
    container.classList.add('anim-iris-out');

    setTimeout(() => {
      document.getElementById('game-over-player-name').textContent = playerName || 'PLAYER';
      
      // Calculate rank safely
      let rank = 1;
      if (this.game.multiplayer && this.game.multiplayer.isConnected) {
          this.game.multiplayer.remotePlayers.forEach(p => {
              if (p.score > score) rank++;
          });
      } else {
          // Simulated high scores for Single Player Ranking
          const simulatedScores = [100, 80, 60, 40, 20];
          rank = simulatedScores.filter(s => s > score).length + 1;
      }
      
      this.finalRank.textContent   = '#' + rank;
      this.finalScore.textContent  = score;
      this.finalCorrect.textContent= `${correctCount} / ${this.game.maxQuestions}`;
      
      const safeTime = Math.max(0, timeRemaining);
      const mins = Math.floor(safeTime / 60);
      const secs = safeTime % 60;
      this.finalTime.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      
      const mpScoreboard = document.getElementById('mp-scoreboard');
      if (mpScoreboard) mpScoreboard.classList.add('hidden');
      
      this.gameOverModal.classList.remove('hidden');
    }, 1000);
  }

  showMultiplayerGameOver(scores, mySessionId, reason = "Game Over", remainingTime = 0) {
    this.hideQuestion();
    const container = document.getElementById('game-container');
    container.classList.remove('anim-iris-in', 'anim-iris-out');
    void container.offsetWidth;
    container.classList.add('anim-iris-out');

    // Update reason display in UI if element exists
    const titleEl = document.getElementById('game-over-title');
    if (titleEl) titleEl.innerHTML = `<span style="display:block; font-size: 0.6em; color: #4CAF50;">${reason}</span> HASIL PERTANDINGAN`;

    setTimeout(() => {
      const me = scores.find(s => s.id === mySessionId) || scores[0];
      const myRank = scores.findIndex(s => s.id === mySessionId) + 1;

      document.getElementById('game-over-player-name').textContent = me?.name || 'PLAYER';
      this.finalRank.textContent   = '#' + myRank;
      this.finalScore.textContent  = me?.score || 0;
      this.finalCorrect.textContent= `${me?.correct || 0} / ${GAME_CONFIG.MAX_QUESTIONS}`;
      
      const safeTime = Math.max(0, remainingTime);
      const mins = Math.floor(safeTime / 60);
      const secs = safeTime % 60;
      this.finalTime.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

      const board = document.getElementById('mp-scoreboard');
      const list  = document.getElementById('mp-scoreboard-list');
      board.classList.remove('hidden');
      list.innerHTML = '';
      scores.forEach((s, i) => {
        const li = document.createElement('li');
        li.className = 'mp-scoreboard-item' + (s.id === mySessionId ? ' local' : '');
        li.innerHTML = `<span>#${i+1} ${s.name}</span><span>${s.score} pts</span>`;
        list.appendChild(li);
      });

      this.gameOverModal.classList.remove('hidden');
    }, 1000);
  }

  // ─────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────
  showNotification(message, type = 'info') {
    const colors = { success: '#4CAF50', error: '#f44336', info: '#2196F3' };
    const toast = document.createElement('div');
    toast.className = 'notif-toast';
    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ─────────────────────────────────────────────────
  // DEBUG MENU
  // ─────────────────────────────────────────────────
  _setupDebugMenu() {
    this.debugMenu.style.display = GAME_CONFIG.DEBUG_MODE ? 'block' : 'none';
    this.debugHeader.onclick = () => this.debugMenu.classList.toggle('expanded');
    this.addBotBtn.onclick = () => {
      this.game.addBot(this.botNameInput.value, parseInt(this.botScoreInput.value));
    };
    this.endGameBtn.onclick = () => this.game.gameOver();
    
    const toggleMobileBtn = document.getElementById('toggle-mobile-btn');
    if (toggleMobileBtn) {
      toggleMobileBtn.onclick = () => {
        this.game.forceShowMobileControls();
        toggleMobileBtn.textContent = '📱 MOBILE ON';
        toggleMobileBtn.style.background = '#4CAF50';
      };
    }
  }
}