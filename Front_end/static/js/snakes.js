/* ─────────────────────────────────────────
   SORA SNAKES — classic snake, themed UI
───────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('snakes-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function getCSSVar(n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }

  // ── Settings ─────────────────────────────
  let snakesDifficulty = 'easy';

  const CONFIGS = {
    easy:   { tickMs: 160, gridSize: 20 },
    medium: { tickMs: 120, gridSize: 20 },
    hard:   { tickMs:  80, gridSize: 20 },
  };

  // ── Game state ────────────────────────────
  let running = false, paused = false, raf = null, tickTimer = null;
  let snake, dir, nextDir, food, score;

  // ── Keyboard ──────────────────────────────
  const DIR_MAP = {
    ArrowUp:    { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    ArrowDown:  { x: 0, y:  1 }, s: { x: 0, y:  1 }, S: { x: 0, y:  1 },
    ArrowLeft:  { x:-1, y:  0 }, a: { x:-1, y:  0 }, A: { x:-1, y:  0 },
    ArrowRight: { x: 1, y:  0 }, d: { x: 1, y:  0 }, D: { x: 1, y:  0 },
  };

  document.addEventListener('keydown', e => {
    const d = DIR_MAP[e.key];
    if (d && running && !paused) {
      if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    }
    if ((e.key === 'p' || e.key === 'P') && running) snakesTogglePause();
    if ((e.key === 'q' || e.key === 'Q') && running) snakesReset();
  });

  // ── Mobile swipe ──────────────────────────
  let touchStartX = null, touchStartY = null;
  canvas.addEventListener('touchstart', e => {
    if (!running) return;
    if (paused) { snakesTogglePause(); return; }
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (!running || touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    touchStartX = touchStartY = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    let d;
    if (Math.abs(dx) > Math.abs(dy)) {
      d = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      d = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
  }, { passive: true });

  // ── Helpers ───────────────────────────────
  function getCfg() { return CONFIGS[snakesDifficulty]; }

  function cellCount() {
    const g = getCfg().gridSize;
    return { cols: Math.floor(W / g), rows: Math.floor(H / g) };
  }

  function randomFood(snakeArr) {
    const { cols, rows } = cellCount();
    const occupied = new Set(snakeArr.map(s => `${s.x},${s.y}`));
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (occupied.has(`${pos.x},${pos.y}`));
    return pos;
  }

  function updateScoreDOM() {
    document.getElementById('snakes-score').textContent = score;
  }

  // ── Init ──────────────────────────────────
  function gameInit() {
    const { cols, rows } = cellCount();
    const startX = Math.floor(cols / 2);
    const startY = Math.floor(rows / 2);
    snake = [
      { x: startX,     y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    dir     = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score   = 0;
    food    = randomFood(snake);
    updateScoreDOM();
  }

  // ── Draw ──────────────────────────────────
  function colorWithAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function draw() {
    const accent = getCSSVar('--accent-color') || '#3EA055';
    const g = getCfg().gridSize;

    // BG
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    for (let i = 0; i < H; i += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, i, W, 2);
    }

    // Grid dots
    const { cols, rows } = cellCount();
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        ctx.fillRect(c * g + g / 2 - 1, r * g + g / 2 - 1, 2, 2);
      }
    }

    // Food — pulsing red glow
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    ctx.fillStyle   = `rgba(220, 53, 69, ${0.85 + 0.15 * pulse})`;
    ctx.shadowColor = `rgba(220, 53, 69, ${0.6 + 0.4 * pulse})`;
    ctx.shadowBlur  = 10 + 6 * pulse;
    ctx.beginPath();
    ctx.roundRect(food.x * g + 2, food.y * g + 2, g - 4, g - 4, 4);
    ctx.fill();

    // Snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const alpha  = Math.max(0.35, 1 - (i / snake.length) * 0.65);
      ctx.fillStyle   = isHead ? accent : colorWithAlpha(accent, alpha);
      ctx.shadowColor = accent;
      ctx.shadowBlur  = isHead ? 14 : 5;
      ctx.beginPath();
      ctx.roundRect(seg.x * g + 1, seg.y * g + 1, g - 2, g - 2, isHead ? 5 : 3);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }

  function drawPauseOverlay() {
    const accent = getCSSVar('--accent-color') || '#3EA055';
    ctx.fillStyle = 'rgba(13,17,23,0.82)';
    ctx.fillRect(0, 0, W, H);
    const pw = 240, ph = 72, px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = '#0d1117';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.font = '700 22px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2 - 6);
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('P  resume  •  Q  quit', W / 2, H / 2 + 16);
  }

  // ── Tick (game logic, runs on interval) ───
  function tick() {
    if (!running || paused) return;

    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const { cols, rows } = cellCount();

    // Wall collision
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      endGame(); return;
    }
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      endGame(); return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      updateScoreDOM();
      food = randomFood(snake);
    } else {
      snake.pop();
    }
  }

  function endGame() {
    running = false;
    clearInterval(tickTimer);
    cancelAnimationFrame(raf);
    draw();
    document.getElementById('snakes-result-text').textContent = `Game Over 💀  ${score} pts`;
    document.getElementById('snakes-result').style.display = 'flex';
  }

  // ── Render loop (visuals only) ────────────
  function renderLoop() {
    if (!running) return;
    draw();
    if (paused) drawPauseOverlay();
    raf = requestAnimationFrame(renderLoop);
  }

  // ── Public API ────────────────────────────
  window.snakesSetDifficulty = function (val, btn) {
    snakesDifficulty = val;
    document.querySelectorAll('#snakes-difficulty-group .pong-toggle')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  window.snakesTogglePause = function () {
    if (!running) return;
    paused = !paused;
    const btn = document.getElementById('snakes-pause-btn');
    if (btn) btn.textContent = paused ? 'PLAY' : 'PAUSE';
  };

  window.snakesStart = function () {
    document.getElementById('snakes-settings').style.display = 'none';
    document.getElementById('snakes-result').style.display   = 'none';
    document.getElementById('snakes-scorebar').style.display = 'flex';
    canvas.style.display = 'block';

    const hint = document.getElementById('snakes-controls-hint');
    hint.textContent = 'Arrow keys / WASD to move  •  P to pause  •  Q to quit  •  swipe on mobile';
    hint.style.display = 'block';

    gameInit();
    running = true;
    paused  = false;

    clearInterval(tickTimer);
    tickTimer = setInterval(tick, getCfg().tickMs);
    renderLoop();
  };

  window.snakesReset = function () {
    running = false;
    paused  = false;
    clearInterval(tickTimer);
    cancelAnimationFrame(raf);
    canvas.style.display = 'none';
    document.getElementById('snakes-result').style.display   = 'none';
    document.getElementById('snakes-scorebar').style.display = 'none';
    document.getElementById('snakes-controls-hint').style.display = 'none';
    document.getElementById('snakes-settings').style.display = 'flex';
    const btn = document.getElementById('snakes-pause-btn');
    if (btn) btn.textContent = 'PAUSE';
  };

  canvas.style.display = 'none';
})();