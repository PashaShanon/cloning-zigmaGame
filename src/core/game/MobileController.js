
export class MobileController {
  constructor(game) {
    this.game = game;
    this.joystick = null;
  }

  init() {
    if (this.joystick) return; // Prevent multiple initializations
    console.log("[MobileController] Initializing Mobile Controls...");
    const joystickZone = document.getElementById('joystick-zone');
    const mobileControls = document.getElementById('mobile-controls');
    const actionBtn = document.getElementById('mobile-action-btn');

    if (!joystickZone || !mobileControls) return;

    mobileControls.setAttribute('data-initialized', 'true');

    // VERY ORIGINAL JOYSTICK
    const baseHtml = `
      <div id="joy-base" style="width:120px; height:120px; border-radius:50%; border:3px solid rgba(255,255,255,0.4); position:absolute; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.2); z-index:999; touch-action:none;">
         <div id="joy-knob" style="width:50px; height:50px; border-radius:50%; background:rgba(255,255,255,0.9); position:absolute; touch-action:none;"></div>
      </div>
    `;
    joystickZone.innerHTML = '';
    joystickZone.insertAdjacentHTML('beforeend', baseHtml);

    const base = document.getElementById('joy-base');
    const knob = document.getElementById('joy-knob');
    let joyId = null;
    let originX = 0, originY = 0;
    const maxDist = 50;
    
    const resetJoy = () => {
       joyId = null;
       base.style.display = 'none';
       if (this.game.player) {
         this.game.player.joystickVector.x = 0;
         this.game.player.joystickVector.y = 0;
         if (this.game.multiplayer && this.game.multiplayer.isConnected) {
            this.syncJoystickToKeys(0, 0);
         }
       }
    };

    joystickZone.addEventListener('touchstart', (e) => {
        if (!this.game.player || this.game.isAnswering) return;
        e.preventDefault(); // Prevent 2-finger scroll interference
        if (joyId !== null) return; // Ignore second finger on joystick space

        const touch = e.changedTouches[0];
        joyId = touch.identifier;
        originX = touch.clientX;
        originY = touch.clientY;
        
        const rect = joystickZone.getBoundingClientRect();
        const relX = originX - rect.left;
        const relY = originY - rect.top;
        
        base.style.left = `${relX - 60}px`;
        base.style.top = `${relY - 60}px`;
        base.style.display = 'flex';
        knob.style.transform = `translate(0px, 0px)`;
    }, {passive: false});

    joystickZone.addEventListener('touchmove', (e) => {
        if (joyId === null || !this.game.player || this.game.isAnswering) return;
        e.preventDefault(); // Stop scrolling
        
        let touch;
        for (let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joyId) touch = e.changedTouches[i];
        }
        if (!touch) return;

        const deltaX = touch.clientX - originX;
        const deltaY = touch.clientY - originY;
        const dist = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
        
        const force = Math.min(dist / maxDist, 1);
        const angle = Math.atan2(deltaY, deltaX); // natively maps Y-down visually
        
        // Move knob visuals safely within limits
        const knobX = Math.cos(angle) * force * maxDist;
        const knobY = Math.sin(angle) * force * maxDist;
        knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        // Vector output
        const vx = Math.cos(angle) * force;
        const vy = Math.sin(angle) * force;
        
        this.game.player.joystickVector.x = vx;
        this.game.player.joystickVector.y = vy;
        
        if (this.game.multiplayer && this.game.multiplayer.isConnected) {
            this.syncJoystickToKeys(vx, vy);
        }
    }, {passive: false});

    joystickZone.addEventListener('touchend', (e) => {
        e.preventDefault();
        for (let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joyId) resetJoy();
        }
    }, {passive: false});
    
    joystickZone.addEventListener('touchcancel', (e) => {
        for (let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joyId) resetJoy();
        }
    });

    if (actionBtn) {
      actionBtn.style.WebkitTapHighlightColor = "transparent";
      actionBtn.style.userSelect = "none";
      
      const fireAction = (e) => {
        e.preventDefault(); // Stop phantom clicks & tap-highlights
        if (this.game.nearbyEnemy && !this.game.isAnswering) {
          const enemy = this.game.nearbyEnemy;
          if (this.game.multiplayer && this.game.multiplayer.isConnected) {
            this.game.multiplayer.sendEnemyHit(enemy.id);
          } else {
            this.game.triggerLocalQuestion(enemy);
          }
        }
      };

      actionBtn.addEventListener('touchstart', fireAction, {passive: false});
      actionBtn.addEventListener('mousedown', fireAction); // Desktop Simulator Fallback
    }
  }

  syncJoystickToKeys(vx, vy) { 
    if (!this.game.player) return;
    
    // Convert analog vector to digital WASD for server compatibility
    const threshold = 0.2;
    const keysToUpdate = [
      { key: 'w', pressed: vy < -threshold },
      { key: 's', pressed: vy > threshold },
      { key: 'a', pressed: vx < -threshold },
      { key: 'd', pressed: vx > threshold }
    ];

    keysToUpdate.forEach(({ key, pressed }) => {
      if (this.game.player.keys[key] !== pressed) {
        this.game.player.keys[key] = pressed;
        if (this.game.multiplayer && this.game.multiplayer.isConnected) {
          this.game.multiplayer.room?.send("input", { key, pressed });
        }
      }
    });
  }

  forceShowMobileControls() {
    this.init();
    this.show();
  }

  show() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls && ('ontouchstart' in window || window.innerWidth < 1024)) {
       mobileControls.classList.remove('hidden');
    }
  }

  hide() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
       mobileControls.classList.add('hidden');
    }
  }
}

