/* ─────────────────────────────────────────
   SORA BRICKS — Breakout-style arcade game
───────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('bricks-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function getCSSVar(n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }

  // ── Settings ─────────────────────────────
  let bricksDifficulty = 'easy';

  const CONFIGS = {
    easy:   { ballSpeed: 3.5, paddleW: 90, rows: 4, ballSpeedUp: 0.0015 },
    medium: { ballSpeed: 4.5, paddleW: 70, rows: 5, ballSpeedUp: 0.0025 },
    hard:   { ballSpeed: 5.5, paddleW: 55, rows: 6, ballSpeedUp: 0.004  },
  };

  // ── Game state ────────────────────────────
  let running = false, paused = false, raf = null;
  let score = 0, lives = 3;

  const PAD_H  = 10, PAD_Y = H - 22;
  const BALL_R = 7;
  const BRICK_ROWS_MAX = 6, BRICK_COLS = 8;
  const BRICK_GAP = 5, BRICK_TOP = 36;
  const ROW_COLORS = ['#ef5350','#ff7043','#ffca28','#66bb6a','#42a5f5','#ab47bc'];
  const ROW_POINTS = [60, 50, 40, 30, 20, 10];

  let cfg, paddle, ball, bricks;
  let touchStartX = null, touchPaddleX = null;

  // ── Keyboard ──────────────────────────────
  const keys = {};
  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['ArrowLeft','ArrowRight'].includes(e.key) && running) e.preventDefault();
    if ((e.key === 'p' || e.key === 'P') && running) bricksTogglePause();
    if ((e.key === 'q' || e.key === 'Q') && running) bricksReset();
  });
  document.addEventListener('keyup',  e => { keys[e.key] = false; });

  window.bricksTogglePause = function () {
    if (!running) return;
    paused = !paused;
    const btn = document.getElementById('bricks-pause-btn');
    if (btn) btn.textContent = paused ? 'PLAY' : 'PAUSE';
  };

  // ── Brick builder ─────────────────────────
  function buildBricks(rows) {
    const brickW = (W - BRICK_GAP * (BRICK_COLS + 1)) / BRICK_COLS;
    const brickH = 14;
    const list = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        list.push({
          x: BRICK_GAP + c * (brickW + BRICK_GAP),
          y: BRICK_TOP + r * (brickH + BRICK_GAP),
          w: brickW, h: brickH,
          alive: true,
          color: ROW_COLORS[r] || ROW_COLORS[ROW_COLORS.length - 1],
          points: ROW_POINTS[r] || 10,
        });
      }
    }
    return list;
  }

  function bricksLeft() {
    return bricks.filter(b => b.alive).length;
  }

  // ── Init ──────────────────────────────────
  function gameInit() {
    cfg = CONFIGS[bricksDifficulty];
    score = 0; lives = 3;
    updateScoreDOM();

    paddle = { x: W / 2 - cfg.paddleW / 2, w: cfg.paddleW };

    const angle = (Math.random() * 0.4 + 0.3) * (Math.random() < 0.5 ? 1 : -1);
    ball = {
      x: W / 2, y: PAD_Y - BALL_R - 2,
      vx: cfg.ballSpeed * Math.sin(angle),
      vy: -cfg.ballSpeed * Math.cos(angle),
      speed: cfg.ballSpeed,
    };
    bricks = buildBricks(cfg.rows);
  }

  function updateScoreDOM() {
    document.getElementById('bricks-score').textContent = score;
    document.getElementById('bricks-lives').textContent = lives;
  }

  // ── Draw ──────────────────────────────────
  function draw() {
    const accent = getCSSVar('--accent-color') || '#3EA055';

    // BG
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    for (let i = 0; i < H; i += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, i, W, 2);
    }

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fill();
    });

    // Paddle
    ctx.shadowColor = accent;
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = accent;
    ctx.beginPath();
    ctx.roundRect(paddle.x, PAD_Y, paddle.w, PAD_H, 5);
    ctx.fill();

    // Ball
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  // ── Update ────────────────────────────────
  function update() {
    const PAD_SPEED = 5.5;
    if (keys['ArrowLeft'])  paddle.x = Math.max(0, paddle.x - PAD_SPEED);
    if (keys['ArrowRight']) paddle.x = Math.min(W - paddle.w, paddle.x + PAD_SPEED);

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounces
    if (ball.x - BALL_R <= 0)      { ball.x = BALL_R;     ball.vx *= -1; }
    if (ball.x + BALL_R >= W)      { ball.x = W - BALL_R; ball.vx *= -1; }
    if (ball.y - BALL_R <= 0)      { ball.y = BALL_R;     ball.vy *= -1; }

    // Paddle collision
    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= PAD_Y &&
      ball.y + BALL_R <= PAD_Y + PAD_H + 4 &&
      ball.x >= paddle.x - BALL_R &&
      ball.x <= paddle.x + paddle.w + BALL_R
    ) {
      // Angle based on hit position
      const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1 to 1
      const maxAngle = 1.1;
      const angle = rel * maxAngle;
      const spd = Math.hypot(ball.vx, ball.vy);
      ball.vx = spd * Math.sin(angle);
      ball.vy = -Math.abs(spd * Math.cos(angle));
      ball.y  = PAD_Y - BALL_R;
    }

    // Ball lost
    if (ball.y - BALL_R > H) {
      lives--;
      updateScoreDOM();
      if (lives <= 0) {
        endGame(false);
        return;
      }
      // Reset ball to paddle
      ball.x = paddle.x + paddle.w / 2;
      ball.y = PAD_Y - BALL_R - 2;
      const angle = (Math.random() * 0.4 + 0.3) * (Math.random() < 0.5 ? 1 : -1);
      ball.vx = ball.speed * Math.sin(angle);
      ball.vy = -ball.speed * Math.cos(angle);
    }

    // Brick collision (AABB)
    for (const b of bricks) {
      if (!b.alive) continue;
      if (
        ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
        ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h
      ) {
        b.alive = false;
        score += b.points;

        // Determine bounce axis
        const overlapLeft  = (ball.x + BALL_R) - b.x;
        const overlapRight = (b.x + b.w) - (ball.x - BALL_R);
        const overlapTop   = (ball.y + BALL_R) - b.y;
        const overlapBot   = (b.y + b.h) - (ball.y - BALL_R);
        const minH = Math.min(overlapLeft, overlapRight);
        const minV = Math.min(overlapTop,  overlapBot);
        if (minH < minV) ball.vx *= -1;
        else             ball.vy *= -1;

        // Gradually speed up
        ball.speed += cfg.ballSpeedUp;
        const spd = Math.hypot(ball.vx, ball.vy);
        ball.vx = ball.vx / spd * ball.speed;
        ball.vy = ball.vy / spd * ball.speed;

        updateScoreDOM();

        if (bricksLeft() === 0) {
          endGame(true);
          return;
        }
        break; // one brick per frame
      }
    }
  }

  function drawPauseOverlay() {
    const accent = getCSSVar('--accent-color') || '#3EA055';
    ctx.fillStyle = 'rgba(13,17,23,0.82)';
    ctx.fillRect(0, 0, W, H);
    const pw = 240, ph = 72, px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = '#0d1117';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 10);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.font = '700 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2 - 6);
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('P  resume  •  Q  quit', W / 2, H / 2 + 16);
  }

  function endGame(won) {
    running = false;
    cancelAnimationFrame(raf);
    draw(); // final frame
    const resultEl = document.getElementById('bricks-result');
    const textEl   = document.getElementById('bricks-result-text');
    textEl.textContent = won
      ? `You Win! 🎉  ${score} pts`
      : `Game Over 💔  ${score} pts`;
    resultEl.style.display = 'flex';
  }

  // ── Loop ──────────────────────────────────
  function loop() {
    if (!running) return;
    if (!paused) update();
    draw();
    if (paused) drawPauseOverlay();
    raf = requestAnimationFrame(loop);
  }

  // ── Touch paddle drag ─────────────────────
  canvas.addEventListener('touchstart', e => {
    if (!running) return;
    e.preventDefault();
    touchStartX   = e.touches[0].clientX;
    touchPaddleX  = paddle.x;
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (!running || touchStartX === null) return;
    e.preventDefault();
    const scaleX = W / canvas.getBoundingClientRect().width;
    const dx = (e.touches[0].clientX - touchStartX) * scaleX;
    paddle.x = Math.max(0, Math.min(W - paddle.w, touchPaddleX + dx));
  }, { passive: false });

  canvas.addEventListener('touchend', () => { touchStartX = null; });

  // ── Public API ────────────────────────────
  window.bricksSetDifficulty = function (val, btn) {
    bricksDifficulty = val;
    document.querySelectorAll('#bricks-difficulty-group .pong-toggle')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  window.bricksStart = function () {
    document.getElementById('bricks-settings').style.display  = 'none';
    document.getElementById('bricks-result').style.display    = 'none';
    document.getElementById('bricks-scorebar').style.display  = 'flex';
    canvas.style.display = 'block';

    const hint = document.getElementById('bricks-controls-hint');
    hint.textContent = '← → to move • P to pause • Q to quit • drag on mobile';
    hint.style.display = 'block';

    gameInit();
    running = true;
    loop();
  };

  window.bricksReset = function () {
    running = false;
    paused = false;
    cancelAnimationFrame(raf);
    canvas.style.display = 'none';
    document.getElementById('bricks-result').style.display   = 'none';
    document.getElementById('bricks-scorebar').style.display = 'none';
    document.getElementById('bricks-controls-hint').style.display = 'none';
    document.getElementById('bricks-settings').style.display = 'flex';
    const btn = document.getElementById('bricks-pause-btn');
    if (btn) btn.textContent = 'PAUSE';
  };

  canvas.style.display = 'none';
})();