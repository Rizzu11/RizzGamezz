/* ═══════════════════════════════════════════════════════════════
   MY LITTLE ADVENTURE ❤️ — script.js  (v3)
   - Tour guide narrator (Mumut)
   - 12 questions, smart rotation (no repeats until all used)
   - Love affirmation + bouquet on final screen
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ───────────────────────────────────────────────────────────────
   1. AUDIO MANAGER
   Uses a plain <audio> element for background music (reliable
   autoplay/loop across all browsers & file:// protocol) and
   Web Audio API for SFX. Mute state persists in sessionStorage.
──────────────────────────────────────────────────────────────── */
const AudioManager = (() => {
  /* ── Background music via <audio> element ── */
  const bgEl = document.createElement('audio');
  bgEl.src    = 'assets/audio/background.mp3';
  bgEl.loop   = true;
  bgEl.volume = 1;
  bgEl.preload = 'auto';
  document.body.appendChild(bgEl);

  /* ── SFX via Web Audio API ── */
  let ctx     = null;
  let sfxGain = null;
  const sfxBufs = {};
  let sfxReady  = false;

  /* ── Mute state ── */
  let muted = false;

  /* ── Mute button reference (injected into DOM on init) ── */
  let muteBtn = null;

  /* Called on first user gesture — starts BG music & inits SFX */
  function unlock() {
    /* Start background music */
    bgEl.play().catch(() => { /* blocked by browser — user hasn't interacted yet */ });

    /* Init Web Audio for SFX */
    if (sfxReady) return;
    try {
      ctx      = new (window.AudioContext || window.webkitAudioContext)();
      sfxGain  = ctx.createGain();
      sfxGain.gain.value = 0.65;
      sfxGain.connect(ctx.destination);
      sfxReady = true;
      loadSFX();
    } catch (e) { /* silent fallback */ }
  }

  async function loadSFX() {
    const files = {
      click:   'assets/audio/click.wav',
      correct: 'assets/audio/correct.wav',
      wrong:   'assets/audio/wrong.wav',
      reward:  'assets/audio/reward.wav',
    };
    for (const [k, path] of Object.entries(files)) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        sfxBufs[k] = await ctx.decodeAudioData(await res.arrayBuffer());
      } catch (e) { /* missing file — skip */ }
    }
  }

  function playSFX(key) {
    if (muted || !sfxReady || !ctx || !sfxBufs[key]) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = sfxBufs[key];
      src.connect(sfxGain);
      src.start(0);
    } catch (e) { /* ignore */ }
  }

  /* Toggle mute for both BG and SFX */
  function toggleMute() {
    muted       = !muted;
    bgEl.muted  = muted;
    updateMuteBtn();
  }

  function updateMuteBtn() {
    if (!muteBtn) return;
    muteBtn.textContent   = muted ? '🔇' : '🎵';
    muteBtn.title         = muted ? 'Nyalakan musik' : 'Matikan musik';
    muteBtn.setAttribute('aria-label', muted ? 'Nyalakan musik' : 'Matikan musik');
    muteBtn.classList.toggle('muted', muted);
  }

  /* Create & inject the mute button into the game wrapper */
  function createMuteBtn() {
    muteBtn = document.createElement('button');
    muteBtn.id        = 'muteBtn';
    muteBtn.className = 'mute-btn';
    muteBtn.textContent = '🎵';
    muteBtn.title       = 'Matikan musik';
    muteBtn.setAttribute('aria-label', 'Matikan musik');
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMute();
    });
    document.getElementById('gameWrapper').appendChild(muteBtn);
  }

  /* Resume BG if tab becomes visible again */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !muted) bgEl.play().catch(() => {});
  });

  return { unlock, playSFX, createMuteBtn };
})();


/* ───────────────────────────────────────────────────────────────
   2. PARTICLE SYSTEM
──────────────────────────────────────────────────────────────── */
const ParticleSystem = (() => {
  const canvas = document.getElementById('particleCanvas');
  const ctx    = canvas.getContext('2d');
  const EMOJIS = ['💕','✨','⭐','💖','🌸','💫','🌟'];
  let particles = [], animId = null, running = false;

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

  function spawn() {
    particles.push({ x: Math.random()*canvas.width, y: canvas.height+20,
      vx:(Math.random()-0.5)*0.8, vy:-(0.5+Math.random()*1.2),
      size:10+Math.random()*14, opacity:0.6+Math.random()*0.4,
      life:1, decay:0.003+Math.random()*0.004,
      emoji:EMOJIS[Math.floor(Math.random()*EMOJIS.length)],
      rot:(Math.random()-0.5)*0.04, angle:0 });
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (Math.random()<0.08) spawn();
    particles = particles.filter(p=>p.life>0);
    for (const p of particles) {
      p.x+=p.vx; p.y+=p.vy; p.life-=p.decay; p.angle+=p.rot;
      ctx.save(); ctx.globalAlpha=p.life*p.opacity; ctx.font=`${p.size}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.translate(p.x,p.y); ctx.rotate(p.angle); ctx.fillText(p.emoji,0,0); ctx.restore();
    }
    animId = requestAnimationFrame(tick);
  }

  function start() { if (running) return; running=true; resize(); tick(); }
  function stop()  { running=false; if(animId){cancelAnimationFrame(animId);animId=null;} ctx.clearRect(0,0,canvas.width,canvas.height); particles=[]; }

  function burst(x, y, count) {
    count = count||22;
    for (let i=0;i<count;i++) particles.push({
      x, y, vx:(Math.random()-0.5)*6, vy:-(1.5+Math.random()*5),
      size:14+Math.random()*18, opacity:1, life:1, decay:0.013+Math.random()*0.01,
      emoji:EMOJIS[Math.floor(Math.random()*EMOJIS.length)],
      rot:(Math.random()-0.5)*0.12, angle:0 });
  }

  window.addEventListener('resize', resize, { passive:true });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  return { start, stop, burst };
})();


/* ───────────────────────────────────────────────────────────────
   3. TYPING ENGINE
──────────────────────────────────────────────────────────────── */
const TypingEngine = (() => {
  let timer = null;

  function type(el, text, speed, onDone) {
    speed = speed || 28;
    stop();
    el.textContent = '';
    el.classList.add('typing');
    const chars = [...text];
    let i = 0;
    function next() {
      if (i >= chars.length) { el.classList.remove('typing'); if (onDone) onDone(); return; }
      el.textContent += chars[i];
      const ch = chars[i]; i++;
      let d = speed;
      if (ch==='.'||ch==='!'||ch==='?'||ch==='\n') d = speed*8;
      else if (ch===','||ch===';') d = speed*4;
      else if (ch===' ')          d = speed*0.5;
      timer = setTimeout(next, d);
    }
    next();
  }

  function skip(el, text) { stop(); el.classList.remove('typing'); el.textContent = text; }
  function stop() { if (timer) { clearTimeout(timer); timer=null; } }

  return { type, skip, stop };
})();


/* ───────────────────────────────────────────────────────────────
   4. SCREEN MANAGER
──────────────────────────────────────────────────────────────── */
const ScreenManager = (() => {
  const overlay = document.getElementById('transitionOverlay');
  let current = 'screenTitle';

  function goTo(id, onReady) {
    if (id === current) { if (onReady) onReady(); return; }
    const nextEl = document.getElementById(id);
    if (!nextEl) { console.warn('Screen not found:', id); return; }

    overlay.classList.add('fade-in');
    overlay.classList.remove('fade-out');

    setTimeout(() => {
      const prevEl = document.getElementById(current);
      if (prevEl) { prevEl.classList.remove('active'); prevEl.style.opacity='0'; prevEl.style.pointerEvents='none'; }
      nextEl.style.opacity='1'; nextEl.style.pointerEvents='all'; nextEl.classList.add('active');
      current = id;
      if (onReady) onReady();
      setTimeout(() => { overlay.classList.remove('fade-in'); overlay.classList.add('fade-out'); }, 60);
    }, 500);
  }

  return { goTo };
})();


/* ───────────────────────────────────────────────────────────────
   5. QUESTION BANK
   12 questions total. Smart rotation: pick 3 per game without
   repeating until the whole bank is exhausted, then reset.
──────────────────────────────────────────────────────────────── */
const QUESTION_BANK = [
  { emoji:'🐘', text:'Hewan apakah yang punya belalai panjang dan telinga lebar?',
    choices:['Jerapah','Gajah','Harimau','Kuda nil'], answer:1 },
  { emoji:'🌈', text:'Warna apa yang dihasilkan dari campuran merah dan kuning?',
    choices:['Ungu','Hijau','Jingga','Biru'], answer:2 },
  { emoji:'🍌', text:'Buah berwarna kuning yang jadi makanan favorit monyet?',
    choices:['Apel','Mangga','Jeruk','Pisang'], answer:3 },
  { emoji:'🏝️', text:'Berapa kira-kira jumlah pulau di Indonesia?',
    choices:['Lebih dari 17.000','Sekitar 5.000','Tepat 1.000','Sekitar 300'], answer:0 },
  { emoji:'🎨', text:'Warna langit yang cerah di siang hari adalah...',
    choices:['Merah','Hijau','Biru','Kuning'], answer:2 },
  { emoji:'🦋', text:'Serangga cantik bersayap warna-warni yang terbang di taman?',
    choices:['Capung','Lebah','Kupu-kupu','Lalat'], answer:2 },
  { emoji:'🍎', text:'Buah merah yang jatuh menginspirasi Newton tentang gravitasi?',
    choices:['Stroberi','Apel','Semangka','Delima'], answer:1 },
  { emoji:'⭐', text:'Berapa jumlah bintang di bendera Merah Putih Indonesia?',
    choices:['Tidak ada','Satu','Lima','Tiga'], answer:0 },
  { emoji:'🌙', text:'Bentuk bulan saat terlihat penuh di langit malam disebut?',
    choices:['Bulan Sabit','Bulan Separuh','Bulan Purnama','Bulan Baru'], answer:2 },
  { emoji:'🐝', text:'Serangga kecil yang menghasilkan madu dan tinggal di sarang?',
    choices:['Semut','Lebah','Kecoa','Belalang'], answer:1 },
  { emoji:'🌺', text:'Bunga nasional Indonesia yang berwarna merah putih adalah?',
    choices:['Mawar','Melati','Anggrek Bulan','Rafflesia'], answer:2 },
  { emoji:'🎵', text:'Lagu kebangsaan Indonesia adalah...',
    choices:['Garuda Pancasila','Tanah Airku','Indonesia Raya','Bagimu Negeri'], answer:2 },
];

/* Rotation state lives outside Game so it persists across restarts */
let _questionDeck  = [];   /* remaining unused questions this rotation */
let _usedThisGame  = [];   /* indices used in current game (prevent in-run repeats) */

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

/**
 * Pick 3 questions for a new game.
 * - Never repeats a question within one game session.
 * - Works through the full bank before re-shuffling.
 */
function pickQuestions() {
  /* If the deck is empty or has fewer than 3 left, refill it */
  if (_questionDeck.length < 3) {
    _questionDeck = shuffleArray(QUESTION_BANK.map((_, i) => i));
  }

  /* Draw 3 from the front of the deck */
  const picked = [];
  const remaining = [];

  for (const idx of _questionDeck) {
    if (picked.length < 3) {
      picked.push(QUESTION_BANK[idx]);
    } else {
      remaining.push(idx);
    }
  }
  _questionDeck = remaining;

  return picked;
}


/* ───────────────────────────────────────────────────────────────
   6. DIALOGUE SCRIPTS
   Narrator character: "Mumut" — warm tour guide persona
──────────────────────────────────────────────────────────────── */
const SCRIPTS = {
  namePrompt: 'Halo cantik ❤️\n\nSebelum kita mulai petualangan...\nboleh tahu siapa namanya?',

  /* Tour guide introduction on name screen speaker label */
  tourGuide: '🌸 Mumut 🌸',

  intro: [
    { speaker:'🌸 Mumut 🌸',
      text:'Halo {name}~! 😊✨\n\nAku Mumut, pemandu taman ajaib ini!\nHari ini aku akan temenin kamu jalan-jalan ke Taman Rahasia ❤️' },
    { speaker:'🌸 Mumut 🌸',
      text:'Taman ini menyimpan hadiah spesial...\ntapi kamu harus melewati 3 tantangan dulu ya! 🎯\n\nTenang aja, Mumut pasti nemenin kamu sampai selesai ✨' },
    { speaker:'🌸 Mumut 🌸',
      text:'Oke {name}, yuk kita masuk!\nGerbang ajaibnya sudah terbuka untuk kamu~ 🌸\n\nPegang tanganku ya! ❤️' },
  ],

  enter: [
    { speaker:'🌸 Mumut 🌸',
      text:'Waaah... selamat datang di Taman Rahasia {name}! ✨\n\nIndah banget kan? Mumut selalu suka tempat ini 🌿' },
    { speaker:'🌸 Mumut 🌸',
      text:'Lihat itu! Ada bunga-bunga cantik, kunang-kunang ajaib,\ndan air mancur yang berkilau seperti bintang 🌟\n\nPersis kayak kamu, {name}~ ❤️' },
    { speaker:'🌸 Mumut 🌸',
      text:'Nah, di tengah taman ada Pos Tantangan-nya!\nMumut akan kasih 3 pertanyaan ya...\n\nJawab yang terbaik, hadiah sudah menunggu! 🎁💪' },
  ],

  /* Before each question — tour guide hype lines (randomly picked) */
  quizIntro: [
    'Oke {name}, ini pertanyaan berikutnya ya!\nMumut yakin kamu pasti bisa~ 💪❤️',
    'Nah, giliran pertanyaan selanjutnya nih!\nPikir baik-baik ya {name}~ ✨',
    'Mumut lihat kamu makin semangat nih!\nYuk jawab yang ini juga 🌸',
  ],

  correct:   '🥰 Waaaah betul banget {name}!!\n\nMumut seneng bangettt lihat kamu pinter kayak gini ❤️🥹\n\nLanjut ke tantangan berikutnya ya~ ✨',
  incorrect: '💕 Hmm, jawabannya sebenarnya:\n"{answer}"\n\nTapi Mumut tahu kamu sudah berusaha!\nKarena kamu cantik dan imut, lanjut aja yuk 🥹❤️✨',

  ending: [
    { speaker:'🌸 Mumut 🌸',
      text:'YEAYYY {name}!! 🎉🎉🎉\n\nKamu berhasil menyelesaikan semua tantangan Taman Rahasia!\nMumut bangga banget sama kamu ❤️' },
    { speaker:'🌸 Mumut 🌸',
      text:'Kamu memang luar biasa cantik, pintar, imut,\ndan gemesh banget 🥹💕\n\nNah sekarang saatnya milih hadiah spesialmu! 🎁✨' },
  ],

  rewardPrompt: 'Pilih salah satu peti misterinya, {name}! 🎁\nCuma boleh buka satu ya~',
  rewardMsg:    'Horeee ❤️\n\nKamu bisa tukarin ke Hariz yaa 🥹✨',

  /* Prize pool — randomly shuffled to chests each game */
  prizes: [
    { icon:'🥟', value:'Dimsum Mentai\nIsi 8' },
    { icon:'🍦', value:'Aiskrimmm 🍦' },
    { icon:'🗺️', value:'Kupon Jalan-Jalan\nBerdua ❤️' },
  ],

  /* Love affirmations — shown one by one on final screen */
  affirmations: [
    'Kamu adalah orang yang paling berharga di dunia ini ❤️',
    'Senyummu itu bisa bikin hari siapapun jadi lebih cerah ✨',
    'Kamu layak mendapatkan semua kebahagiaan yang ada 🌸',
    'Mumut (dan seseorang yang spesial) sangat menyayangimu 💕',
    'Ingat ya {name}, kamu selalu dicintai dan dibanggakan 🥹❤️',
  ],
};

function fill(tpl, name, extra) {
  return tpl
    .replace(/{name}/g,  name  || 'Sayang')
    .replace(/{answer}/g, extra || '');
}


/* ───────────────────────────────────────────────────────────────
   7. GAME STATE MACHINE
──────────────────────────────────────────────────────────────── */
const Game = (() => {
  let playerName   = '';
  let questions    = [];
  let qIndex       = 0;
  let introIdx     = 0;
  let enterIdx     = 0;
  let endingIdx    = 0;
  let typingBusy   = false;
  let chestPicked  = false;
  let affirmIdx    = 0;
  let affirmTimer  = null;

  const $ = id => document.getElementById(id);

  /* ═══════════════════════════════════
     INIT
  ════════════════════════════════════ */
  function init() {
    document.body.classList.add('loading');
    document.addEventListener('pointerdown', AudioManager.unlock, { once:true });

    /* Create mute button */
    AudioManager.createMuteBtn();

    const inp = $('playerNameInput');
    if (inp) inp.addEventListener('keydown', e => { if (e.key==='Enter') submitName(); });

    $('introNextBtn') .addEventListener('click', nextIntroLine);
    $('enterNextBtn') .addEventListener('click', nextEnterLine);
    $('endingNextBtn').addEventListener('click', nextEndingLine);
    $('feedbackNextBtn').addEventListener('click', advanceQuiz);

    setTimeout(() => {
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');
      ParticleSystem.start();
    }, 150);
  }

  /* ═══════════════════════════════════
     SCREEN 1 → 2
  ════════════════════════════════════ */
  function goToNameScreen() {
    AudioManager.playSFX('click');
    ScreenManager.goTo('screenNameInput', () => {
      const el = $('nameDialogueText');
      const spk = $('nameDialogueSpeaker');
      if (spk) spk.textContent = SCRIPTS.tourGuide;
      if (el)  TypingEngine.type(el, SCRIPTS.namePrompt, 28);
    });
  }

  /* ═══════════════════════════════════
     SCREEN 2 — submit name
  ════════════════════════════════════ */
  function submitName() {
    const inp = $('playerNameInput');
    const raw = inp ? inp.value.trim() : '';
    if (!raw) {
      if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); inp.focus(); }
      return;
    }
    playerName = raw.replace(/\b\w/g, c => c.toUpperCase());
    questions  = pickQuestions();
    qIndex     = 0;

    AudioManager.playSFX('click');
    ScreenManager.goTo('screenIntro', () => { introIdx=0; showIntroLine(); });
  }

  /* ═══════════════════════════════════
     SCREEN 3 — intro dialogue
  ════════════════════════════════════ */
  function showIntroLine() {
    const s = SCRIPTS.intro[introIdx];
    if (!s) return;
    $('introSpeaker').textContent = s.speaker;
    $('introNextBtn').classList.remove('visible');
    typingBusy = true;
    TypingEngine.type($('introText'), fill(s.text, playerName), 28, () => {
      typingBusy = false; $('introNextBtn').classList.add('visible');
    });
  }

  function nextIntroLine() {
    const s = SCRIPTS.intro[introIdx];
    if (typingBusy) {
      TypingEngine.skip($('introText'), fill(s.text, playerName));
      typingBusy = false; $('introNextBtn').classList.add('visible'); return;
    }
    AudioManager.playSFX('click');
    introIdx++;
    if (introIdx < SCRIPTS.intro.length) {
      showIntroLine();
    } else {
      ScreenManager.goTo('screenEnter', () => { enterIdx=0; showEnterLine(); });
    }
  }

  /* ═══════════════════════════════════
     SCREEN 4 — entering garden
  ════════════════════════════════════ */
  function showEnterLine() {
    const s = SCRIPTS.enter[enterIdx];
    if (!s) return;
    $('enterSpeaker').textContent = s.speaker;
    $('enterNextBtn').classList.remove('visible');
    typingBusy = true;
    TypingEngine.type($('enterText'), fill(s.text, playerName), 28, () => {
      typingBusy = false; $('enterNextBtn').classList.add('visible');
    });
  }

  function nextEnterLine() {
    const s = SCRIPTS.enter[enterIdx];
    if (typingBusy) {
      TypingEngine.skip($('enterText'), fill(s.text, playerName));
      typingBusy = false; $('enterNextBtn').classList.add('visible'); return;
    }
    AudioManager.playSFX('click');
    enterIdx++;
    if (enterIdx < SCRIPTS.enter.length) {
      showEnterLine();
    } else {
      ScreenManager.goTo('screenQuiz', () => { renderQuestion(); });
    }
  }

  /* ═══════════════════════════════════
     SCREEN 5 — quiz
  ════════════════════════════════════ */
  function renderQuestion() {
    const q = questions[qIndex];
    if (!q) { finishQuiz(); return; }

    /* Progress dots */
    for (let i=0;i<3;i++) {
      const dot = $(`dot${i}`);
      if (!dot) continue;
      dot.classList.toggle('done', i < qIndex);
      dot.textContent = i < qIndex ? '★' : '✦';
    }

    $('quizEmoji').textContent        = q.emoji;
    $('quizQuestionText').textContent = q.text;

    /* Build answer buttons */
    const answersEl = $('quizAnswers');
    answersEl.innerHTML = '';
    ['A','B','C','D'].forEach((letter, idx) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.innerHTML = `<span class="answer-letter">${letter}</span>${q.choices[idx]}`;
      btn.addEventListener('click', () => handleAnswer(idx, q, btn));
      answersEl.appendChild(btn);
    });

    $('feedbackOverlay').classList.remove('visible');
  }

  function handleAnswer(chosen, question, clickedBtn) {
    document.querySelectorAll('.answer-btn').forEach(b => { b.style.pointerEvents='none'; });
    const correct = chosen === question.answer;
    clickedBtn.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) document.querySelectorAll('.answer-btn')[question.answer].classList.add('correct');
    AudioManager.playSFX(correct ? 'correct' : 'wrong');
    setTimeout(() => showFeedback(correct, question.choices[question.answer]), 480);
  }

  function showFeedback(correct, correctAnswer) {
    $('feedbackIcon').textContent = correct ? '🥰' : '💕';
    $('feedbackText').textContent = fill(
      correct ? SCRIPTS.correct : SCRIPTS.incorrect,
      playerName, correctAnswer
    );
    $('feedbackOverlay').classList.add('visible');
  }

  function advanceQuiz() {
    AudioManager.playSFX('click');
    const dot = $(`dot${qIndex}`);
    if (dot) { dot.classList.add('done'); dot.textContent='★'; }
    qIndex++;
    if (qIndex < questions.length) {
      $('feedbackOverlay').classList.remove('visible');
      setTimeout(renderQuestion, 280);
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    ScreenManager.goTo('screenEnding', () => { endingIdx=0; showEndingLine(); });
  }

  /* ═══════════════════════════════════
     SCREEN 6 — ending dialogue
  ════════════════════════════════════ */
  function showEndingLine() {
    const s = SCRIPTS.ending[endingIdx];
    if (!s) return;
    $('endingSpeaker').textContent = s.speaker;
    $('endingNextBtn').classList.remove('visible');
    typingBusy = true;
    TypingEngine.type($('endingText'), fill(s.text, playerName), 28, () => {
      typingBusy = false; $('endingNextBtn').classList.add('visible');
    });
  }

  function nextEndingLine() {
    const s = SCRIPTS.ending[endingIdx];
    if (typingBusy) {
      TypingEngine.skip($('endingText'), fill(s.text, playerName));
      typingBusy = false; $('endingNextBtn').classList.add('visible'); return;
    }
    AudioManager.playSFX('click');
    endingIdx++;
    if (endingIdx < SCRIPTS.ending.length) {
      showEndingLine();
    } else {
      ScreenManager.goTo('screenReward', () => { setupReward(); });
    }
  }

  /* ═══════════════════════════════════
     SCREEN 7 — treasure chests (3 mystery chests, prizes randomised)
  ════════════════════════════════════ */

  /* Holds shuffled prize assignment for this game: index 0 = chest1, etc. */
  let chestPrizeMap = [];

  function setupReward() {
    chestPicked  = false;
    chestPrizeMap = shuffleArray([...SCRIPTS.prizes]); /* random prize → random chest */

    [1, 2, 3].forEach(n => {
      const btn = $(`chest${n}Btn`);
      if (btn) btn.classList.remove('locked', 'opening');
      restoreChestSVG(n);
    });

    $('couponOverlay').classList.remove('visible');
    $('rewardPromptText').textContent = fill(SCRIPTS.rewardPrompt, playerName);
  }

  function restoreChestSVG(num) {
    const svg = $(`chest${num}Svg`);
    if (!svg) return;
    /* Three distinct colour schemes per chest slot */
    const s = [
      { body:'#8d5524', dark:'#6d4019', lid:'#a0522d', shine:'#cd853f', trim:'#ffc107', brk:'#ffa000', lock:'#ffd54f', ring:'#ffc107', q:'#ffe082' },
      { body:'#7b3f20', dark:'#5c2e15', lid:'#8b4513', shine:'#b8600a', trim:'#e91e63', brk:'#c2185b', lock:'#f48fb1', ring:'#e91e63', q:'#fff' },
      { body:'#4a2a6e', dark:'#321a50', lid:'#5e3587', shine:'#7b47a3', trim:'#ce93d8', brk:'#ab47bc', lock:'#e1bee7', ring:'#ce93d8', q:'#ffe082' },
    ][num - 1];
    svg.innerHTML = `
      <rect x="4"  y="32" width="72" height="34" rx="4" fill="${s.body}"/>
      <rect x="4"  y="32" width="72" height="6"  fill="${s.dark}"/>
      <rect x="4"  y="8"  width="72" height="26" rx="4" fill="${s.lid}"/>
      <rect x="4"  y="8"  width="72" height="6"  rx="2" fill="${s.shine}"/>
      <rect x="2"  y="6"  width="76" height="6"  rx="2" fill="${s.trim}"/>
      <rect x="2"  y="30" width="76" height="8"  rx="2" fill="${s.trim}"/>
      <rect x="4"  y="8"  width="10" height="54" rx="2" fill="${s.brk}"  opacity="0.5"/>
      <rect x="66" y="8"  width="10" height="54" rx="2" fill="${s.brk}"  opacity="0.5"/>
      <rect x="33" y="28" width="14" height="14" rx="3" fill="${s.lock}"/>
      <rect x="36" y="24" width="8"  height="8"  rx="4" fill="none" stroke="${s.ring}" stroke-width="3"/>
      <rect x="12" y="12" width="16" height="4"  rx="2" fill="#fff" opacity="0.2"/>
      <text x="40" y="57" font-family="'Press Start 2P',monospace" font-size="16"
            fill="${s.q}" text-anchor="middle" opacity="0.9">?</text>
    `;
  }

  function openChest(num) {
    if (chestPicked) return;
    chestPicked = true;
    AudioManager.playSFX('click');

    const chosenBtn = $(`chest${num}Btn`);
    /* Lock the other two */
    [1, 2, 3].filter(n => n !== num).forEach(n => {
      setTimeout(() => { const b = $(`chest${n}Btn`); if (b) b.classList.add('locked'); }, 220);
    });

    chosenBtn.classList.add('opening');
    setTimeout(() => openChestSVG(num), 420);

    const r = chosenBtn.getBoundingClientRect();
    ParticleSystem.burst(r.left + r.width / 2, r.top + r.height / 2, 24);
    AudioManager.playSFX('reward');
    setTimeout(() => showCoupon(num), 920);
  }

  function openChestSVG(num) {
    const svg = $(`chest${num}Svg`);
    if (!svg) return;
    svg.innerHTML = `
      <rect x="4"  y="38" width="72" height="28" rx="4" fill="#8d5524"/>
      <rect x="4"  y="38" width="72" height="6"  fill="#6d4019"/>
      <rect x="2"  y="36" width="76" height="8"  rx="2" fill="#ffc107"/>
      <rect x="4"  y="36" width="10" height="30" rx="2" fill="#ffa000" opacity="0.5"/>
      <rect x="66" y="36" width="10" height="30" rx="2" fill="#ffa000" opacity="0.5"/>
      <rect x="4"  y="4"  width="72" height="24" rx="4" fill="#a0522d" transform="rotate(-35 40 34)"/>
      <rect x="2"  y="2"  width="76" height="6"  rx="2" fill="#ffc107" transform="rotate(-35 40 34)"/>
      <ellipse cx="40" cy="38" rx="28" ry="10" fill="#fff9c4" opacity="0.6"/>
      <text x="40" y="35" font-size="18" text-anchor="middle">✨</text>
      <rect x="28" y="20" width="6" height="6" rx="1" fill="#ffe082"/>
      <rect x="40" y="16" width="8" height="8" rx="2" fill="#f48fb1"/>
      <rect x="52" y="20" width="6" height="6" rx="1" fill="#90caf9"/>
      <rect x="33" y="42" width="14" height="12" rx="3" fill="#ffd54f"/>
    `;
  }

  function showCoupon(num) {
    const data = chestPrizeMap[num - 1]; /* 0-based map */
    if (!data) return;
    $('couponIcon').textContent    = data.icon;
    $('couponValue').textContent   = data.value;
    $('couponMessage').textContent = SCRIPTS.rewardMsg;
    $('couponOverlay').classList.add('visible');
  }

  /* ═══════════════════════════════════
     SCREEN 8 — final: love affirmations + bouquet
  ════════════════════════════════════ */
  function finishGame() {
    AudioManager.playSFX('click');
    ScreenManager.goTo('screenFinal', () => {
      /* Set the name title */
      $('finalTitle').textContent = `Untuk ${playerName} ❤️`;

      /* Start cycling affirmations */
      affirmIdx = 0;
      showAffirmation();

      /* Particle burst */
      setTimeout(() => {
        ParticleSystem.burst(window.innerWidth/2, window.innerHeight/2, 32);
      }, 400);
    });
  }

  function showAffirmation() {
    if (affirmTimer) clearInterval(affirmTimer);

    const msgEl    = $('finalMessage');
    const bouquetEl= $('finalBouquet');
    const all      = SCRIPTS.affirmations;

    /* Type current affirmation */
    const text = fill(all[affirmIdx], playerName);
    TypingEngine.type(msgEl, text, 32, () => {
      /* After typing, wait 2.5s then fade to next */
      affirmTimer = setTimeout(() => {
        msgEl.style.opacity = '0';
        setTimeout(() => {
          affirmIdx = (affirmIdx + 1) % all.length;
          msgEl.style.opacity = '1';
          showAffirmation();
        }, 500);
      }, 2500);
    });

    /* Show bouquet on last affirmation */
    if (bouquetEl) {
      if (affirmIdx === all.length - 1) {
        bouquetEl.style.display = 'block';
        setTimeout(() => bouquetEl.classList.add('bouquet-in'), 50);
      } else {
        bouquetEl.classList.remove('bouquet-in');
        bouquetEl.style.display = 'none';
      }
    }
  }

  /* ═══════════════════════════════════
     RESTART
  ════════════════════════════════════ */
  function restart() {
    /* Stop affirmation cycling */
    if (affirmTimer) { clearInterval(affirmTimer); clearTimeout(affirmTimer); affirmTimer=null; }

    /* Reset game state (but NOT _questionDeck — rotation persists) */
    playerName = ''; questions=[]; qIndex=0;
    introIdx=0; enterIdx=0; endingIdx=0;
    typingBusy=false; chestPicked=false; affirmIdx=0;
    chestPrizeMap = [];

    const inp = $('playerNameInput');
    if (inp) inp.value='';

    /* Reset final screen */
    const msgEl = $('finalMessage');
    if (msgEl) { msgEl.textContent=''; msgEl.style.opacity='1'; }
    const bq = $('finalBouquet');
    if (bq) { bq.classList.remove('bouquet-in'); bq.style.display='none'; }

    AudioManager.playSFX('click');
    ScreenManager.goTo('screenTitle');
  }

  return {
    init,
    goToNameScreen,
    submitName,
    nextIntroLine,
    nextEnterLine,
    nextEndingLine,
    advanceQuiz,
    openChest,
    finishGame,
    restart,
  };
})();

const gameState = Game;


/* ───────────────────────────────────────────────────────────────
   8. KEYBOARD SHORTCUTS
──────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== ' ' && e.key !== 'Enter') return;
  const btn = ['introNextBtn','enterNextBtn','endingNextBtn']
    .map(id => document.getElementById(id))
    .find(el => el && el.classList.contains('visible'));
  if (btn) { e.preventDefault(); btn.click(); }
});

document.addEventListener('touchmove', e => {
  if (!e.target.closest('.pixel-input')) e.preventDefault();
}, { passive:false });


/* ───────────────────────────────────────────────────────────────
   9. BOOTSTRAP
──────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => Game.init());
