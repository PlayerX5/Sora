/* ─────────────────────────────────────────
   SORA BUDDY — emotional support chat widget
   Talks to Flask /api/buddy → NVIDIA gpt-oss-120b
───────────────────────────────────────── */
(function () {
  'use strict';

  // ── Greeting lines (randomised on open) ──────────────────────
  const GREETINGS = [
    "hey 👋 I'm Buddy. whatever's on your mind — I'm here.",
    "oh hey, you opened this. that already takes something. what's up?",
    "hey you. rough day, good day, weird day? tell me.",
    "hi 🌙 no judgement here. just us. what's going on?",
    "hey — I'm glad you're here. seriously. talk to me.",
  ];

  // ── State ─────────────────────────────────────────────────────
  const history = [];
  let isOpen = false;
  let isTyping = false;
  let greeted = false;

  // ── DOM refs ──────────────────────────────────────────────────
  const trigger    = document.getElementById('buddy-trigger');
  const win        = document.getElementById('buddy-window');
  const closeBtn   = document.getElementById('buddy-close-btn');
  const messagesEl = document.getElementById('buddy-messages');
  const inputEl    = document.getElementById('buddy-input');
  const sendBtn    = document.getElementById('buddy-send-btn');
  const typingEl   = document.getElementById('buddy-typing');
  const unreadDot  = document.getElementById('buddy-unread-dot');

  // ── Open / Close ──────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    unreadDot.style.display = 'none';
    inputEl.focus();
    if (!greeted) {
      greeted = true;
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setTimeout(() => appendMessage('bot', greeting), 420);
    }
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
  }

  trigger.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── Append message ────────────────────────────────────────────
  function appendMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `buddy-msg ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'buddy-msg-bubble';
    bubble.textContent = text;

    const time = document.createElement('div');
    time.className = 'buddy-msg-time';
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ── Show / hide typing indicator ──────────────────────────────
  function showTyping() {
    typingEl.style.display = 'block';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    typingEl.style.display = 'none';
  }

  // ── Send message ──────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isTyping) return;

    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    inputEl.value = '';
    inputEl.style.height = 'auto';
    sendBtn.disabled = true;
    isTyping = true;

    // Small human-like delay before typing indicator
    await new Promise(r => setTimeout(r, 350 + Math.random() * 300));
    showTyping();

    try {
      // ── Call OUR backend — no API key here, ever ──────────────
      const response = await fetch('/api/buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const reply = data.reply || "hey sorry, lost my train of thought for a sec. say that again?";

      history.push({ role: 'assistant', content: reply });

      // Simulate reading time before reply appears
      const readDelay = Math.min(reply.length * 18, 1800);
      await new Promise(r => setTimeout(r, readDelay));

      hideTyping();
      appendMessage('bot', reply);

      // Unread dot if chat is closed
      if (!isOpen) {
        unreadDot.style.display = 'block';
      }

    } catch (err) {
      console.error('Buddy fetch error:', err);
      hideTyping();
      appendMessage('bot', "ugh, something went sideways on my end. give it another shot?");
    }

    isTyping = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  // ── Input handlers ────────────────────────────────────────────
  sendBtn.addEventListener('click', sendMessage);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  // Show unread dot after a moment to draw attention
  setTimeout(() => {
    if (!isOpen) unreadDot.style.display = 'block';
  }, 4000);

})();