/* ─────────────────────────────────────────
   SORA PONG — retro canvas, themed UI
───────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('pong-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function getCSSVar(n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }

  // ── Settings ────────────────────────────
  let pongMode  = 'ai';
  let pongLimit = 5;
  let pongDifficulty = 'medium'; // 'easy' | 'medium' | 'hard'

  // ── Game state ───────────────────────────
  let running = false, paused = false, raf = null;
  let wasVisibleAndRunning = false; // scroll-away resume tracking

  const PAD_W = 12, PAD_H = 64, PAD_SPEED = 4.5;
  const BALL_R = 7;

  let p1   = { y: H/2 - PAD_H/2, score: 0 };
  let p2   = { y: H/2 - PAD_H/2, score: 0 };
  let ball = {};

  // ── Keyboard ─────────────────────────────
  const keys = {};
  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['ArrowUp','ArrowDown'].includes(e.key) && running && !paused) e.preventDefault();
    if ((e.key === 'p' || e.key === 'P') && running) pongTogglePause();
    if ((e.key === 'q' || e.key === 'Q') && running) pongReset();
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  // ── Scroll-away / back detection ─────────
  const pongSection = document.getElementById('about_pong');
  const observer = new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting;
    if (!visible && running && !paused) {
      // scrolled away while game running — auto-pause
      paused = true;
      wasVisibleAndRunning = true;
      updatePauseBtn();
    } else if (visible && wasVisibleAndRunning) {
      // came back — show "tap to resume" state but don't auto-resume
      // the pause overlay already shows; user clicks canvas or pause btn
      wasVisibleAndRunning = false;
    }
  }, { threshold: 0.25 });
  observer.observe(pongSection);

  // click on canvas while paused = resume
  canvas.addEventListener('click', () => {
    if (running && paused) pongTogglePause();
  });

  // ── Ball ─────────────────────────────────
  function resetBall(dir) {
    const angle = (Math.random() * 0.5 - 0.25);
    const spd   = 4.2;
    ball = { x: W/2, y: H/2,
             vx: spd * dir * Math.cos(angle),
             vy: spd * Math.sin(angle) };
  }

  function pongInit() {
    p1.y = H/2 - PAD_H/2;
    p2.y = H/2 - PAD_H/2;
    p1.score = 0; p2.score = 0;
    updateScoreDOM();
    resetBall(1);
  }

  function updateScoreDOM() {
    document.getElementById('pong-score-p1').textContent = p1.score;
    document.getElementById('pong-score-p2').textContent = p2.score;
  }

  function updatePauseBtn() {
    const btn = document.getElementById('pong-pause-btn');
    if (btn) btn.textContent = paused ? 'PLAY' : 'PAUSE';
  }

  // ── Draw helpers ─────────────────────────
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  // ── Retro canvas draw ────────────────────
  function draw() {
    const accent = getCSSVar('--accent-color') || '#3EA055';

    // Dark retro BG
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Scanline effect
    for (let i = 0; i < H; i += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, i, W, 2);
    }

    // Faint grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
    }
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }

    // Center dashed line
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.setLineDash([]);

    // Paddle 1 — site green glow
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    roundRect(14, p1.y, PAD_W, PAD_H, 4);
    ctx.fill();

    // Paddle 2 — site purple glow
    ctx.fillStyle = '#af69ed';
    ctx.shadowColor = '#af69ed';
    ctx.shadowBlur = 18;
    roundRect(W - 14 - PAD_W, p2.y, PAD_W, PAD_H, 4);
    ctx.fill();

    // Ball — white glow
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI*2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  function drawPauseOverlay() {
    const accent = getCSSVar('--accent-color') || '#3EA055';
    // solid dark overlay — no blur
    ctx.fillStyle = 'rgba(13,17,23,0.82)';
    ctx.fillRect(0, 0, W, H);
    // pill
    const pw = 240, ph = 72, px = (W-pw)/2, py = (H-ph)/2;
    ctx.fillStyle = '#0d1117';
    roundRect(px, py, pw, ph, 10);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    roundRect(px, py, pw, ph, 10);
    ctx.stroke();
    // "Paused" — crisp, no shadow
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.font = '700 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W/2, H/2 - 6);
    // hint line
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('P  resume  •  Q  quit', W/2, H/2 + 16);
  }

  // ── AI ───────────────────────────────────
  function aiMove() {
    const center = p2.y + PAD_H / 2;

    // Difficulty tuning
    const cfg = {
      easy:   { speedMult: 0.48, jitter: 38, deadZone: 22, predict: false },
      medium: { speedMult: 0.80, jitter: 18, deadZone: 12, predict: true  },
      hard:   { speedMult: 1.00, jitter:  4, deadZone:  4, predict: true  },
    }[pongDifficulty] || { speedMult: 0.80, jitter: 18, deadZone: 12, predict: true };

    const spd = PAD_SPEED * cfg.speedMult;

    if (ball.vx > 0) {
      let target = ball.y;

      if (cfg.predict) {
        // Predict landing with wall bounces
        target = ball.y + (ball.vy * ((W - ball.x) / ball.vx));
        while (target < 0 || target > H) {
          if (target < 0) target = -target;
          if (target > H) target = H - (target - H);
        }
        target += ball.vy * 2;
      }

      // Imperfection — more jitter on easy
      target += Math.sin(Date.now() * 0.002) * cfg.jitter;

      if (center < target - cfg.deadZone) {
        p2.y = Math.min(H - PAD_H, p2.y + spd);
      } else if (center > target + cfg.deadZone) {
        p2.y = Math.max(0, p2.y - spd);
      }
    } else {
      // Return to center when idle
      if (center < H / 2 - 20) p2.y = Math.min(H - PAD_H, p2.y + spd * 0.4);
      else if (center > H / 2 + 20) p2.y = Math.max(0, p2.y - spd * 0.4);
    }
  }

  // ── Update ───────────────────────────────
  function update() {
    if (pongMode === 'ai') {
      if (keys['ArrowUp'])   p1.y = Math.max(0, p1.y-PAD_SPEED);
      if (keys['ArrowDown']) p1.y = Math.min(H-PAD_H, p1.y+PAD_SPEED);
      aiMove();
    } else {
      if (keys['w']||keys['W']) p1.y = Math.max(0, p1.y-PAD_SPEED);
      if (keys['s']||keys['S']) p1.y = Math.min(H-PAD_H, p1.y+PAD_SPEED);
      if (keys['ArrowUp'])   p2.y = Math.max(0, p2.y-PAD_SPEED);
      if (keys['ArrowDown']) p2.y = Math.min(H-PAD_H, p2.y+PAD_SPEED);
    }

    ball.x += ball.vx; ball.y += ball.vy;

    if (ball.y-BALL_R <= 0)  { ball.y = BALL_R;     ball.vy *= -1; }
    if (ball.y+BALL_R >= H)  { ball.y = H-BALL_R;   ball.vy *= -1; }

    const p1x = 14, p2x = W-14-PAD_W;

    if (ball.vx < 0 &&
        ball.x-BALL_R <= p1x+PAD_W && ball.x-BALL_R >= p1x-2 &&
        ball.y+BALL_R >= p1.y && ball.y-BALL_R <= p1.y+PAD_H) {
      ball.x = p1x+PAD_W+BALL_R;
      const hitPos = (ball.y-(p1.y+PAD_H/2))/(PAD_H/2);
      const spd    = Math.min(Math.hypot(ball.vx,ball.vy)*1.04, 15);
      ball.vx = spd*Math.cos(hitPos*0.9);
      ball.vy = spd*Math.sin(hitPos*0.9);
    }
    if (ball.vx > 0 &&
        ball.x+BALL_R >= p2x && ball.x+BALL_R <= p2x+PAD_W+2 &&
        ball.y+BALL_R >= p2.y && ball.y-BALL_R <= p2.y+PAD_H) {
      ball.x = p2x-BALL_R;
      const hitPos = (ball.y-(p2.y+PAD_H/2))/(PAD_H/2);
      const spd    = Math.min(Math.hypot(ball.vx,ball.vy)*1.04, 15);
      ball.vx = -spd*Math.cos(hitPos*0.9);
      ball.vy =  spd*Math.sin(hitPos*0.9);
    }

    if (ball.x < 0)  { p2.score++; updateScoreDOM(); checkWin('p2'); resetBall(1);  }
    if (ball.x > W)  { p1.score++; updateScoreDOM(); checkWin('p1'); resetBall(-1); }
  }

  function checkWin(scorer) {
    if (pongLimit === 0) return;
    const score = scorer==='p1' ? p1.score : p2.score;
    if (score >= pongLimit) {
      running = false; paused = false;
      cancelAnimationFrame(raf);
      const label = scorer==='p1'
        ? (pongMode==='ai' ? 'You Win! 🎉' : 'Player 1 Wins! 🎉')
        : (pongMode==='ai' ? 'AI Wins! 🤖' : 'Player 2 Wins! 🎉');
      document.getElementById('pong-result-text').textContent = label;
      document.getElementById('pong-result').style.display = 'flex';
    }
  }

  // ── Loop ─────────────────────────────────
  function loop() {
    if (!running) return;
    if (!paused) update();
    draw();
    if (paused) drawPauseOverlay();
    raf = requestAnimationFrame(loop);
  }

  // ── Mobile touch drag ────────────────────
  (function setupTouch() {
    let t1StartY=null, t2StartY=null, t1PadY=null, t2PadY=null;
    const touchSides = {}; // maps touch identifier → 'L' or 'R' (locked at touchstart)
    function side(tx) {
      return (tx - canvas.getBoundingClientRect().left) < canvas.getBoundingClientRect().width/2 ? 'L' : 'R';
    }
    canvas.addEventListener('touchstart', e => {
      if (!running) return;
      if (paused) { pongTogglePause(); return; }
      e.preventDefault();
      for (const t of e.changedTouches) {
        const s = side(t.clientX);
        touchSides[t.identifier] = s;
        if (s === 'L') { t1StartY=t.clientY; t1PadY=p1.y; }
        else           { t2StartY=t.clientY; t2PadY=p2.y; }
      }
    }, {passive:false});
    canvas.addEventListener('touchmove', e => {
      if (!running||paused) return;
      e.preventDefault();
      const scaleY = H / canvas.getBoundingClientRect().height;
      for (const t of e.changedTouches) {
        const lockedSide = touchSides[t.identifier];
        if (lockedSide === 'L' && t1StartY !== null) {
          p1.y = Math.max(0, Math.min(H-PAD_H, t1PadY + (t.clientY-t1StartY)*scaleY));
        } else if (lockedSide === 'R' && t2StartY !== null && pongMode === 'pvp') {
          p2.y = Math.max(0, Math.min(H-PAD_H, t2PadY + (t.clientY-t2StartY)*scaleY));
        }
      }
    }, {passive:false});
    canvas.addEventListener('touchend', e => {
      for (const t of e.changedTouches) {
        const s = touchSides[t.identifier];
        delete touchSides[t.identifier];
        if (s === 'L') { t1StartY=null; t1PadY=null; }
        else           { t2StartY=null; t2PadY=null; }
      }
    });
  })();

  // ── Public API ───────────────────────────
  window.pongSetMode = function(val, btn) {
    const diffRow = document.getElementById('pong-difficulty-row');
    if (val === 'ai') {
      if (diffRow.style.display === 'block') {
        // second tap on vs AI — collapse difficulty row
        diffRow.style.display = 'none';
      } else {
        diffRow.style.display = 'block';
      }
    } else {
      diffRow.style.display = 'none';
    }
    pongMode = val;
    document.querySelectorAll('#mode-group .pong-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
  window.pongSetDifficulty = function(val, btn) {
    pongDifficulty = val;
    document.querySelectorAll('#difficulty-group .pong-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
  window.pongSetLimit = function(val, btn) {
    document.querySelectorAll('#limit-group .pong-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const input = document.getElementById('pong-custom-limit');
    if (val === 'custom') {
      if (input.style.display === 'block') {
        // second tap — collapse back to default
        input.style.display = 'none';
        pongLimit = 5;
        document.querySelectorAll('#limit-group .pong-toggle').forEach(b => b.classList.remove('active'));
        document.querySelector('#limit-group .pong-toggle[data-val="5"]').classList.add('active');
      } else {
        input.style.display = 'block';
        pongLimit = parseInt(input.value) || 15;
        input.oninput = () => { pongLimit = parseInt(input.value) || 15; };
      }
    } else {
      pongLimit = parseInt(val);
      input.style.display = 'none';
    }
  };
  window.pongStart = function() {
    document.getElementById('pong-p1-label').textContent = pongMode==='ai' ? 'You' : 'P1';
    document.getElementById('pong-p2-label').textContent = pongMode==='ai' ? 'AI'  : 'P2';
    const hint = document.getElementById('pong-controls-hint');
    hint.textContent = pongMode==='ai'
      ? '↑ ↓ to move  •  P to pause  •  tap canvas on mobile'
      : 'P1: W/S  •  P2: ↑/↓  •  P to pause  •  drag on mobile';
    hint.classList.add('visible');
    document.getElementById('pong-settings').style.display = 'none';
    document.getElementById('pong-result').style.display = 'none';
    document.getElementById('pong-scorebar').classList.add('visible');
    canvas.style.display = 'block';
    paused = false;
    updatePauseBtn();
    pongInit();
    running = true;
    loop();
  };
  window.pongTogglePause = function() {
    if (!running) return;
    paused = !paused;
    updatePauseBtn();
  };
  window.pongReset = function() {
    running = false; paused = false;
    cancelAnimationFrame(raf);
    canvas.style.display = 'none';
    document.getElementById('pong-result').style.display = 'none';
    document.getElementById('pong-scorebar').classList.remove('visible');
    document.getElementById('pong-controls-hint').classList.remove('visible');
    document.getElementById('pong-settings').style.display = 'flex';
    updatePauseBtn();
  };

  canvas.style.display = 'none';
})();