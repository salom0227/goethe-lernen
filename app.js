// ── STATE ──
const state = {
  allWords: [],
  currentLevel: 'A1',
  currentSession: [],
  fcIndex: 0,
  fcFlipped: false,
  fcKnown: 0,
  fcUnknown: 0,
  quizLevel: 'A1',
  quizCount: 20,
  quizDir: 'de-uz',
  quizQuestions: [],
  quizIdx: 0,
  quizScore: 0,
  quizCorrect: 0,
  quizWrong: 0,
  quizStartTime: 0,
  quizTimer: null,
  quizTimeLeft: 15,
  favorites: new Set(),
  learned: new Set(),
  unknown: new Set(),
  quizHistory: [],
  streak: 0,
  wordsPage: 0,
  wordsPerPage: 40,
  wordsFilter: 'ALL',
  wordsSearch: ''
};

const TIPS = [
  "💡 Har kuni 20 ta so'z o'rganish bir oyda 600 so'z demak!",
  "💡 So'zlarni takrorlash eng yaxshi yodlash usuli.",
  "💡 Kontekstda o'qish so'zlarni tezroq eslab qolishga yordam beradi.",
  "💡 Flashcard usuli Ebbinghaus unutish egri chizig'iga qarshi eng samarali.",
  "💡 A1 darajasini o'zlashtirish uchun ~700 so'z yetarli.",
  "💡 Nemischa so'zlarni artikli bilan birga yodlang: der/die/das.",
  "💡 Kuniga 15 daqiqa muntazam mashq 1 soatlik kamdan-kam mashqdan yaxshi."
];

// ── INIT ──
window.addEventListener('load', async () => {
  loadProgress();
  await loadWords();
  updateSplash(100, "Tayyor!");
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    document.getElementById('splash').style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.getElementById('splash').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      initHome();
    }, 500);
  }, 600);
});

function updateSplash(pct, txt) {
  document.getElementById('splashBar').style.width = pct + '%';
  document.getElementById('splashText').textContent = txt;
}

async function loadWords() {
  updateSplash(30, "So'zlar yuklanmoqda…");
  try {
    const data = window.GOETHE_WORDS || [];
    state.allWords = data.filter(w => w.de && w.uz && w.de.length > 0 && w.uz.length > 0);
    updateSplash(80, `${state.allWords.length} so'z topildi`);
  } catch(e) {
    console.error(e);
    updateSplash(100, "Xatolik yuz berdi!");
  }
}

// ── PROGRESS PERSISTENCE ──
function saveProgress() {
  localStorage.setItem('gl_favorites', JSON.stringify([...state.favorites]));
  localStorage.setItem('gl_learned', JSON.stringify([...state.learned]));
  localStorage.setItem('gl_unknown', JSON.stringify([...state.unknown]));
  localStorage.setItem('gl_streak', state.streak);
  localStorage.setItem('gl_history', JSON.stringify(state.quizHistory.slice(-20)));
}

function loadProgress() {
  try {
    const fav = localStorage.getItem('gl_favorites');
    const lrn = localStorage.getItem('gl_learned');
    const unk = localStorage.getItem('gl_unknown');
    if(fav) state.favorites = new Set(JSON.parse(fav));
    if(lrn) state.learned = new Set(JSON.parse(lrn));
    if(unk) state.unknown = new Set(JSON.parse(unk));
    state.streak = parseInt(localStorage.getItem('gl_streak') || '0');
    const hist = localStorage.getItem('gl_history');
    if(hist) state.quizHistory = JSON.parse(hist);
  } catch(e) {}
}

// ── HOME ──
function initHome() {
  const h = new Date().getHours();
  const greet = h < 12 ? "Xayrli tong! ☀️" : h < 18 ? "Xayrli kun! 🌤️" : "Xayrli kech! 🌙";
  document.getElementById('homeGreeting').textContent = greet;
  updateHomeStats();
  document.getElementById('tipText').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
}

function updateHomeStats() {
  const words = state.allWords;
  const a1 = words.filter(w => w.level === 'A1');
  const a2 = words.filter(w => w.level === 'A2');
  const b1 = words.filter(w => w.level === 'B1');

  document.getElementById('statTotal').textContent = words.length;
  document.getElementById('statLearned').textContent = state.learned.size;
  document.getElementById('statStreak').textContent = state.streak;

  document.getElementById('countA1').textContent = a1.length + ' so\'z';
  document.getElementById('countA2').textContent = a2.length + ' so\'z';
  document.getElementById('countB1').textContent = b1.length + ' so\'z';
  document.getElementById('countAll').textContent = words.length + ' so\'z';

  const learnedA1 = a1.filter(w => state.learned.has(w.de)).length;
  const learnedA2 = a2.filter(w => state.learned.has(w.de)).length;
  const learnedB1 = b1.filter(w => state.learned.has(w.de)).length;
  const learnedAll = state.learned.size;

  setFill('fillA1', a1.length > 0 ? learnedA1/a1.length*100 : 0);
  setFill('fillA2', a2.length > 0 ? learnedA2/a2.length*100 : 0);
  setFill('fillB1', b1.length > 0 ? learnedB1/b1.length*100 : 0);
  setFill('fillAll', words.length > 0 ? learnedAll/words.length*100 : 0);
}

function setFill(id, pct) {
  const el = document.getElementById(id);
  if(el) el.style.width = Math.min(pct, 100) + '%';
}

// ── TAB SWITCHING ──
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  document.getElementById('nav' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');

  if(tab === 'home') { updateHomeStats(); }
  if(tab === 'topics') { renderTopics(); }
  if(tab === 'words') { renderWordsList(); }
  if(tab === 'stats') { renderStats(); }
}

function renderTopics() {
  const container = document.getElementById('topicsContainer');
  container.innerHTML = '';
  
  const topics = {};
  state.allWords.forEach(w => {
    const t = w.topic || 'Boshqa';
    if(!topics[t]) topics[t] = { count: 0, learned: 0 };
    topics[t].count++;
    if(state.learned.has(w.de)) topics[t].learned++;
  });

  const sortedTopics = Object.keys(topics).sort((a,b) => {
    if(a === 'Boshqa') return 1;
    if(b === 'Boshqa') return -1;
    return a.localeCompare(b);
  });

  sortedTopics.forEach(t => {
    const data = topics[t];
    const pct = Math.round(data.learned / data.count * 100);
    const card = document.createElement('div');
    card.className = 'level-card';
    card.onclick = () => startTopic(t);
    card.innerHTML = `
      <div class="lvl-badge badge-all">${t}</div>
      <div class="lvl-name">${t} mavzusi</div>
      <div class="lvl-count">${data.count} so'z</div>
      <div class="lvl-progress-bar"><div class="lvl-fill fill-all" style="width:${pct}%"></div></div>
    `;
    container.appendChild(card);
  });
}

function startTopic(topic) {
  state.currentLevel = 'TOPIC:' + topic;
  switchTab('flashcard');
  startFlashcardSession();
}

// ── LEVEL SELECT ──
function startLevel(level) {
  state.currentLevel = level;
  switchTab('flashcard');
  startFlashcardSession();
}

function quickFlashcard() { switchTab('flashcard'); startFlashcardSession(); }
function quickQuiz() { switchTab('quiz'); }
function reviewFavorites() {
  state.currentLevel = 'FAV';
  switchTab('flashcard');
  startFlashcardSession();
}
function reviewUnknown() {
  state.currentLevel = 'UNKNOWN';
  switchTab('flashcard');
  startFlashcardSession();
}

// ── FLASHCARD ──
function getSessionWords(level) {
  let pool;
  if(level.startsWith('TOPIC:')) {
    const topic = level.split('TOPIC:')[1];
    pool = state.allWords.filter(w => w.topic === topic);
  }
  else if(level === 'FAV') pool = state.allWords.filter(w => state.favorites.has(w.de));
  else if(level === 'UNKNOWN') pool = state.allWords.filter(w => state.unknown.has(w.de));
  else if(level === 'ALL') pool = [...state.allWords];
  else pool = state.allWords.filter(w => w.level === level);
  return shuffle([...pool]);
}

function startFlashcardSession() {
  const words = getSessionWords(state.currentLevel);
  state.currentSession = words;
  state.fcIndex = 0;
  state.fcKnown = 0;
  state.fcUnknown = 0;
  state.fcFlipped = false;

  document.getElementById('fcResult').classList.add('hidden');
  document.getElementById('fcScene').style.display = '';
  document.getElementById('fcActions').style.display = 'none';
  document.getElementById('fcFlipHint').style.display = '';

  const level = state.currentLevel.startsWith('TOPIC:') 
    ? state.currentLevel.split('TOPIC:')[1] 
    : state.currentLevel === 'FAV' ? '⭐' : state.currentLevel === 'UNKNOWN' ? '🔄' : state.currentLevel;
  document.getElementById('fcLevelBadge').textContent = level;

  if(words.length === 0) {
    document.getElementById('fcWord').textContent = 'So\'z topilmadi';
    document.getElementById('fcTranslation').textContent = '—';
    return;
  }
  showFlashcard();
}

function showFlashcard() {
  const word = state.currentSession[state.fcIndex];
  if(!word) { endFlashcardSession(); return; }

  // Reset flip
  const card = document.getElementById('fcCard');
  card.classList.remove('flipped');
  state.fcFlipped = false;

  document.getElementById('fcActions').style.display = 'none';
  document.getElementById('fcFlipHint').style.display = '';

  document.getElementById('fcWord').textContent = word.de;
  document.getElementById('fcTranslation').textContent = word.uz;
  document.getElementById('fcWordSmall').textContent = word.de;

  const total = state.currentSession.length;
  const pct = total > 0 ? (state.fcIndex / total) * 100 : 0;
  document.getElementById('fcProgressFill').style.width = pct + '%';
  document.getElementById('fcProgressText').textContent = `${state.fcIndex} / ${total}`;

  const favBtn = document.getElementById('favBtn');
  favBtn.textContent = state.favorites.has(word.de) ? '★' : '☆';
  favBtn.style.color = state.favorites.has(word.de) ? '#eab308' : '';
}

function flipCard() {
  if(state.fcIndex >= state.currentSession.length) return;
  const card = document.getElementById('fcCard');
  state.fcFlipped = !state.fcFlipped;
  card.classList.toggle('flipped', state.fcFlipped);

  if(state.fcFlipped) {
    document.getElementById('fcFlipHint').style.display = 'none';
    document.getElementById('fcActions').style.display = '';
  }
}

function markCard(knew) {
  const word = state.currentSession[state.fcIndex];
  if(knew) {
    state.fcKnown++;
    state.learned.add(word.de);
    state.unknown.delete(word.de);
  } else {
    state.fcUnknown++;
    state.unknown.add(word.de);
  }
  saveProgress();
  state.fcIndex++;
  if(state.fcIndex >= state.currentSession.length) {
    endFlashcardSession();
  } else {
    showFlashcard();
  }
}

function endFlashcardSession() {
  document.getElementById('fcScene').style.display = 'none';
  document.getElementById('fcActions').style.display = 'none';
  document.getElementById('fcFlipHint').style.display = 'none';
  document.getElementById('fcResult').classList.remove('hidden');

  const total = state.fcKnown + state.fcUnknown;
  const acc = total > 0 ? Math.round(state.fcKnown / total * 100) : 0;
  document.getElementById('rsKnown').textContent = state.fcKnown;
  document.getElementById('rsUnknown').textContent = state.fcUnknown;
  document.getElementById('rsAccuracy').textContent = acc + '%';

  if(acc >= 70) { state.streak++; saveProgress(); }
}

function restartFlashcard() {
  startFlashcardSession();
}

function toggleFavorite() {
  const word = state.currentSession[state.fcIndex];
  if(!word) return;
  if(state.favorites.has(word.de)) state.favorites.delete(word.de);
  else state.favorites.add(word.de);
  saveProgress();
  const favBtn = document.getElementById('favBtn');
  favBtn.textContent = state.favorites.has(word.de) ? '★' : '☆';
  favBtn.style.color = state.favorites.has(word.de) ? '#eab308' : '';
}

// ── QUIZ ──
let quizSettings = { level: 'A1', count: 20, dir: 'de-uz' };

function setQuizLevel(btn, level) {
  quizSettings.level = level;
  document.querySelectorAll('[data-level]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function setQuizCount(btn, count) {
  quizSettings.count = count;
  btn.closest('.setup-options').querySelectorAll('.so-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function setQuizDir(btn, dir) {
  quizSettings.dir = dir;
  btn.closest('.setup-options').querySelectorAll('.so-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function startQuiz() {
  const pool = quizSettings.level === 'ALL'
    ? [...state.allWords]
    : state.allWords.filter(w => w.level === quizSettings.level);

  if(pool.length < 4) { alert("Kamida 4 ta so\'z kerak!"); return; }

  const shuffled = shuffle([...pool]);
  state.quizQuestions = shuffled.slice(0, Math.min(quizSettings.count, shuffled.length));
  state.quizIdx = 0;
  state.quizScore = 0;
  state.quizCorrect = 0;
  state.quizWrong = 0;
  state.quizStartTime = Date.now();

  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('quizResult').classList.add('hidden');
  document.getElementById('quizQuestion').classList.remove('hidden');
  document.getElementById('quizLevelBadge').textContent = quizSettings.level;

  showQuizQuestion();
}

function showQuizQuestion() {
  if(state.quizIdx >= state.quizQuestions.length) { endQuiz(); return; }

  const q = state.quizQuestions[state.quizIdx];
  const total = state.quizQuestions.length;

  document.getElementById('quizProgressText').textContent = `Savol ${state.quizIdx + 1} / ${total}`;
  document.getElementById('quizScoreBadge').textContent = state.quizScore + ' pts';

  // Direction
  let dir = quizSettings.dir;
  if(dir === 'mixed') dir = Math.random() > 0.5 ? 'de-uz' : 'uz-de';
  q._dir = dir;

  const isDeToUz = dir === 'de-uz';
  document.getElementById('quizQLang').textContent = isDeToUz ? '🇩🇪 Nemischa' : '🇺🇿 O\'zbekcha';
  document.getElementById('quizQWord').textContent = isDeToUz ? q.de : q.uz;

  // Generate options (1 correct + 3 wrong)
  const pool = quizSettings.level === 'ALL'
    ? state.allWords
    : state.allWords.filter(w => w.level === quizSettings.level);
  const wrong = shuffle(pool.filter(w => w.de !== q.de)).slice(0, 3);
  const options = shuffle([q, ...wrong]);

  const container = document.getElementById('quizOptions');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn';
    btn.textContent = isDeToUz ? opt.uz : opt.de;
    btn.dataset.de = opt.de;
    btn.onclick = () => answerQuiz(btn, opt.de === q.de, q, isDeToUz);
    container.appendChild(btn);
  });

  // Timer
  clearInterval(state.quizTimer);
  state.quizTimeLeft = 15;
  updateTimerUI(state.quizTimeLeft);
  state.quizTimer = setInterval(() => {
    state.quizTimeLeft--;
    updateTimerUI(state.quizTimeLeft);
    if(state.quizTimeLeft <= 0) {
      clearInterval(state.quizTimer);
      timeoutQuiz(q);
    }
  }, 1000);
}


function updateTimerUI(t) {
  const pct = (t / 15) * 100;
  document.getElementById('quizTimerFill').style.width = pct + '%';
  document.getElementById('quizTimerText').textContent = t + 's';
  const fill = document.getElementById('quizTimerFill');
  if(t <= 5) fill.style.background = 'linear-gradient(90deg, var(--red), var(--yellow))';
  else fill.style.background = 'linear-gradient(90deg, var(--green), var(--yellow))';
}

function answerQuiz(btn, isCorrect, q, isDeToUz) {
  clearInterval(state.quizTimer);
  const opts = document.querySelectorAll('.quiz-opt-btn');
  opts.forEach(b => {
    b.onclick = null;
    if((isDeToUz && b.textContent === q.uz) || (!isDeToUz && b.textContent === q.de)) {
      b.classList.add('correct');
    }
  });

  if(isCorrect) {
    btn.classList.add('correct');
    state.quizCorrect++;
    const pts = Math.max(10, state.quizTimeLeft * 7);
    state.quizScore += pts;
    state.learned.add(q.de);
  } else {
    btn.classList.add('wrong');
    state.quizWrong++;
    state.unknown.add(q.de);
  }

  document.getElementById('quizScoreBadge').textContent = state.quizScore + ' pts';
  saveProgress();

  setTimeout(() => {
    state.quizIdx++;
    showQuizQuestion();
  }, 1200);
}

function timeoutQuiz(q) {
  state.quizWrong++;
  state.unknown.add(q.de);
  saveProgress();
  const isDeToUz = (q._dir || 'de-uz') === 'de-uz';
  const opts = document.querySelectorAll('.quiz-opt-btn');
  opts.forEach(b => {
    b.onclick = null;
    if((isDeToUz && b.textContent === q.uz) || (!isDeToUz && b.textContent === q.de)) {
      b.classList.add('correct');
    }
  });
  setTimeout(() => {
    state.quizIdx++;
    showQuizQuestion();
  }, 1200);
}

function endQuiz() {
  clearInterval(state.quizTimer);
  document.getElementById('quizQuestion').classList.add('hidden');
  document.getElementById('quizResult').classList.remove('hidden');

  const total = state.quizCorrect + state.quizWrong;
  const acc = total > 0 ? Math.round(state.quizCorrect / total * 100) : 0;
  const elapsed = Math.round((Date.now() - state.quizStartTime) / 1000);

  let emoji = '😊', title = 'Yaxshi!';
  if(acc >= 90) { emoji = '🏆'; title = 'Ajoyib!'; }
  else if(acc >= 70) { emoji = '🎉'; title = 'Zo\'r!'; }
  else if(acc >= 50) { emoji = '👍'; title = 'Yaxshi!'; }
  else { emoji = '💪'; title = 'Davom eting!'; }

  document.getElementById('qrEmoji').textContent = emoji;
  document.getElementById('qrTitle').textContent = title;
  document.getElementById('qrScore').textContent = `${state.quizCorrect} / ${total}`;
  document.getElementById('qrAccuracy').textContent = acc + '% to\'g\'ri';
  document.getElementById('qrsCorrect').textContent = state.quizCorrect;
  document.getElementById('qrsWrong').textContent = state.quizWrong;
  document.getElementById('qrsTime').textContent = elapsed + 's';

  // Save to history
  state.quizHistory.push({
    level: quizSettings.level,
    score: state.quizCorrect,
    total: total,
    acc: acc,
    date: new Date().toLocaleDateString('uz-UZ')
  });
  if(acc >= 70) state.streak++;
  saveProgress();
}

function restartQuiz() {
  document.getElementById('quizResult').classList.add('hidden');
  document.getElementById('quizSetup').style.display = '';
}

// ── WORDS LIST ──
function renderWordsList() {
  state.wordsPage = 0;
  const container = document.getElementById('wordsList');
  container.innerHTML = '';
  appendWords();
}

function getFilteredWords() {
  let pool;
  if(state.wordsFilter === 'FAV') pool = state.allWords.filter(w => state.favorites.has(w.de));
  else if(state.wordsFilter === 'ALL') pool = [...state.allWords];
  else pool = state.allWords.filter(w => w.level === state.wordsFilter);

  const q = state.wordsSearch.toLowerCase().trim();
  if(q) pool = pool.filter(w => w.de.toLowerCase().includes(q) || w.uz.toLowerCase().includes(q));
  return pool;
}

function appendWords() {
  const pool = getFilteredWords();
  const start = state.wordsPage * state.wordsPerPage;
  const end = start + state.wordsPerPage;
  const slice = pool.slice(start, end);

  const container = document.getElementById('wordsList');
  slice.forEach(w => {
    const el = document.createElement('div');
    el.className = 'word-item';
    const isFav = state.favorites.has(w.de);
    const lvlColor = w.level === 'A1' ? 'badge-a1' : w.level === 'A2' ? 'badge-a2' : 'badge-b1';
    el.innerHTML = `
      <span class="wi-badge ${lvlColor}">${w.level}</span>
      <span class="wi-de">${w.de}</span>
      <span class="wi-uz">${w.uz}</span>
      <span class="wi-fav" onclick="toggleWordFav(event,'${escHtml(w.de)}')">${isFav ? '★' : '☆'}</span>
    `;
    container.appendChild(el);
  });

  state.wordsPage++;
  const loadMore = document.getElementById('wordsLoadMore');
  loadMore.style.display = end < pool.length ? '' : 'none';
}

function loadMoreWords() { appendWords(); }

function filterWords() {
  state.wordsSearch = document.getElementById('wordsSearch').value;
  renderWordsList();
}

function filterLevel(btn, level) {
  state.wordsFilter = level;
  state.wordsSearch = '';
  document.getElementById('wordsSearch').value = '';
  document.querySelectorAll('.wf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderWordsList();
}

function toggleWordFav(e, de) {
  e.stopPropagation();
  if(state.favorites.has(de)) state.favorites.delete(de);
  else state.favorites.add(de);
  saveProgress();
  renderWordsList();
}

function escHtml(str) {
  return str.replace(/'/g, "\\'");
}

// ── STATS ──
function renderStats() {
  const total = state.allWords.length;
  const a1 = state.allWords.filter(w => w.level === 'A1');
  const a2 = state.allWords.filter(w => w.level === 'A2');
  const b1 = state.allWords.filter(w => w.level === 'B1');

  document.getElementById('soTotal').textContent = total;
  document.getElementById('soLearned').textContent = state.learned.size;
  document.getElementById('soFav').textContent = state.favorites.size;

  const la1 = a1.filter(w => state.learned.has(w.de)).length;
  const la2 = a2.filter(w => state.learned.has(w.de)).length;
  const lb1 = b1.filter(w => state.learned.has(w.de)).length;

  setPct('lpcA1Pct', 'lpcA1Fill', 'lpcA1Count', la1, a1.length);
  setPct('lpcA2Pct', 'lpcA2Fill', 'lpcA2Count', la2, a2.length);
  setPct('lpcB1Pct', 'lpcB1Fill', 'lpcB1Count', lb1, b1.length);

  // Recent quizzes
  const rqEl = document.getElementById('recentQuizzes');
  if(state.quizHistory.length === 0) {
    rqEl.innerHTML = '<div class="empty-state">Hali test o\'tkazilmagan</div>';
  } else {
    rqEl.innerHTML = state.quizHistory.slice(-5).reverse().map(h => `
      <div class="rq-item">
        <div class="rq-info"><strong>${h.level}</strong> • ${h.date}</div>
        <div class="rq-score">${h.score}/${h.total} (${h.acc}%)</div>
      </div>
    `).join('');
  }
}

function setPct(pctId, fillId, countId, learned, total) {
  const pct = total > 0 ? Math.round(learned / total * 100) : 0;
  document.getElementById(pctId).textContent = pct + '%';
  document.getElementById(fillId).style.width = pct + '%';
  document.getElementById(countId).textContent = `${learned} / ${total} so'z o'rganilgan`;
}

function resetProgress() {
  if(!confirm('Barcha progress o\'chiriladi. Davom etasizmi?')) return;
  state.favorites.clear();
  state.learned.clear();
  state.unknown.clear();
  state.streak = 0;
  state.quizHistory = [];
  saveProgress();
  renderStats();
  updateHomeStats();
}

// ── UTILS ──
function shuffle(arr) {
  for(let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
