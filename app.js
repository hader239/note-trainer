/* ═══════════════════════════════════════════
   Тренажёр нот — Чтение нот для скрипки
   ═══════════════════════════════════════════ */

// ── Ноты ──
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_RU = {
  'C': 'До', 'C#': 'До♯', 'D': 'Ре', 'D#': 'Ре♯', 'E': 'Ми',
  'F': 'Фа', 'F#': 'Фа♯', 'G': 'Соль', 'G#': 'Соль♯',
  'A': 'Ля', 'A#': 'Ля♯', 'B': 'Си'
};
const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function noteFrequency(note, octave) {
  const semitone = NOTE_NAMES.indexOf(note);
  const dist = (octave - 4) * 12 + (semitone - 9);
  return 440 * Math.pow(2, dist / 12);
}

function noteLabel(note, octave) {
  return `${NOTE_NAMES_RU[note] || note}${octave}`;
}

function noteNameRu(note) {
  return NOTE_NAMES_RU[note] || note;
}

// ═══════════════════════════════════════════
// Хранилище сессий (localStorage)
// ═══════════════════════════════════════════

const STORAGE_KEY = 'noteTrainerSessions';
const CURRENT_SESSION_KEY = 'noteTrainerCurrentSession';

class SessionTracker {
  constructor() {
    this.sessions = this._load();
    this.current = this._loadCurrent();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _loadCurrent() {
    try {
      const raw = localStorage.getItem(CURRENT_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
  }

  _saveCurrent() {
    if (this.current) {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(this.current));
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }

  hasActiveSession() {
    return this.current !== null;
  }

  finalizeIfActive() {
    if (this.current && this.current.total > 0) {
      this.sessions.push({ ...this.current });
      this._save();
    }
    this.current = null;
    this._saveCurrent();
  }

  startSession() {
    this.current = { date: new Date().toISOString(), total: 0, correct: 0 };
    this._saveCurrent();
  }

  recordAnswer(isCorrect) {
    if (!this.current) return;
    this.current.total++;
    if (isCorrect) this.current.correct++;
    this._saveCurrent();
  }

  endSession() {
    if (!this.current || this.current.total === 0) {
      this.current = null;
      this._saveCurrent();
      return;
    }
    this.sessions.push({ ...this.current });
    this._save();
    this.current = null;
    this._saveCurrent();
  }

  getSessions() {
    return [...this.sessions].reverse(); // newest first
  }

  getStats() {
    const count = this.sessions.length;
    const totalAnswers = this.sessions.reduce((s, x) => s + x.total, 0);
    const totalCorrect = this.sessions.reduce((s, x) => s + x.correct, 0);
    const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null;
    return { count, totalAnswers, accuracy };
  }
}

// ═══════════════════════════════════════════
// Настройки звука (localStorage)
// ═══════════════════════════════════════════

const SOUND_SETTINGS_KEY = 'noteTrainerSoundSettings';

const DEFAULTS = {
  volume: 70, vibrato: 4, brightness: 60, duration: 15,
  detune: 8, body1: 40, body2: 30, body3: 20, filterQ: 7, attack: 15
};

class SoundSettings {
  constructor() {
    this.settings = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SOUND_SETTINGS_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  save() {
    localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(this.settings));
  }

  get(key) { return this.settings[key]; }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  // Computed getters for the audio engine
  get volumeGain() { return this.settings.volume / 100; }
  get vibratoDepth() { return this.settings.vibrato; }
  get filterFreq() { return 800 + (this.settings.brightness / 100) * 7200; }
  get durationSec() { return this.settings.duration / 10; }
  get detuneHz() { return this.settings.detune / 10; }
  get bodyGain1() { return this.settings.body1 / 10; }
  get bodyGain2() { return this.settings.body2 / 10; }
  get bodyGain3() { return this.settings.body3 / 10; }
  get filterQVal() { return this.settings.filterQ / 10; }
  get attackSec() { return this.settings.attack / 100; }
}

// ═══════════════════════════════════════════
// Звуковой движок (имитация скрипки)
// ═══════════════════════════════════════════

class AudioEngine {
  constructor(soundSettings) {
    this.ctx = null;
    this.ss = soundSettings;
    this.violinWave = null;
    this.reverbBuffer = null;
  }

  ensureContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Build PeriodicWave and reverb buffer on first use
    if (!this.violinWave) {
      this._buildViolinWave();
    }
    if (!this.reverbBuffer) {
      this._buildReverbBuffer();
    }
    return this.ctx;
  }

  // Custom waveform based on measured violin harmonic amplitudes
  _buildViolinWave() {
    const n = 16; // number of harmonics
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    // DC offset = 0
    real[0] = 0; imag[0] = 0;
    // Measured violin harmonic amplitudes (from acoustic analysis)
    const amps = [
      1.0,   // 1st - fundamental
      0.85,  // 2nd - very strong in violin
      0.55,  // 3rd - warmth
      0.40,  // 4th
      0.30,  // 5th
      0.20,  // 6th - brightness region
      0.15,  // 7th
      0.10,  // 8th
      0.07,  // 9th - upper shimmer
      0.05,  // 10th
      0.04,  // 11th
      0.03,  // 12th
      0.02,  // 13th
      0.015, // 14th
      0.01,  // 15th
      0.008, // 16th
    ];
    for (let i = 0; i < amps.length; i++) {
      // Put amplitudes in imag (sine components) for sawtooth-like phase
      imag[i + 1] = amps[i];
    }
    this.violinWave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  // Algorithmic reverb: decaying filtered noise (~1.5s)
  _buildReverbBuffer() {
    const sr = this.ctx.sampleRate;
    const len = sr * 1.5; // 1.5 seconds
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        // Exponentially decaying white noise
        const t = i / sr;
        const decay = Math.exp(-t * 4.0); // fast decay
        data[i] = (Math.random() * 2 - 1) * decay * 0.4;
      }
    }
    this.reverbBuffer = buf;
  }

  playNote(note, octave) {
    const ctx = this.ensureContext();
    const freq = noteFrequency(note, octave);
    const now = ctx.currentTime;
    const dur = this.ss.durationSec;
    const vol = this.ss.volumeGain;
    const atk = this.ss.attackSec;

    // ── Master output gain with bow-like amplitude envelope ──
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(vol * 0.28, now + atk);
    master.gain.linearRampToValueAtTime(vol * 0.22, now + atk + 0.2);
    if (dur > 0.6) {
      master.gain.setValueAtTime(vol * 0.22, now + dur - 0.2);
    }
    master.gain.linearRampToValueAtTime(0.001, now + dur);
    master.connect(ctx.destination);

    // ── Reverb (wet path) ──
    const reverb = ctx.createConvolver();
    reverb.buffer = this.reverbBuffer;
    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.15, now); // subtle reverb
    reverb.connect(reverbGain).connect(master);

    // ── Dry path ──
    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.85, now);
    dryGain.connect(master);

    // ── Low-pass filter with envelope (brightness) ──
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    const baseCutoff = this.ss.filterFreq;
    lpf.frequency.setValueAtTime(baseCutoff * 0.4, now);
    lpf.frequency.linearRampToValueAtTime(baseCutoff, now + atk);
    lpf.frequency.linearRampToValueAtTime(baseCutoff * 0.7, now + atk + 0.3);
    lpf.Q.setValueAtTime(this.ss.filterQVal, now);
    // LPF feeds both dry and reverb
    lpf.connect(dryGain);
    lpf.connect(reverb);

    // ── Body resonance (peaking EQ at violin formant frequencies) ──
    const f1 = ctx.createBiquadFilter();
    f1.type = 'peaking';
    f1.frequency.setValueAtTime(450, now);  // B1- body mode
    f1.Q.setValueAtTime(3.5, now);
    f1.gain.setValueAtTime(this.ss.bodyGain1, now);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'peaking';
    f2.frequency.setValueAtTime(550, now);  // B1+ body mode
    f2.Q.setValueAtTime(3.0, now);
    f2.gain.setValueAtTime(this.ss.bodyGain2, now);

    const f3 = ctx.createBiquadFilter();
    f3.type = 'peaking';
    f3.frequency.setValueAtTime(2500, now); // bridge resonance
    f3.Q.setValueAtTime(2.0, now);
    f3.gain.setValueAtTime(this.ss.bodyGain3, now);

    // Chain: source → f1 → f2 → f3 → lpf
    f1.connect(f2).connect(f3).connect(lpf);

    // ── Vibrato LFO (delayed onset) ──
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.0, now);
    const vibDepth = this.ss.vibratoDepth * 0.5;
    lfoGain.gain.setValueAtTime(0, now);
    lfoGain.gain.linearRampToValueAtTime(0, now + 0.2);
    lfoGain.gain.linearRampToValueAtTime(vibDepth, now + 0.5);
    lfo.connect(lfoGain);
    lfo.start(now);
    lfo.stop(now + dur + 0.1);

    // ── Two detuned PeriodicWave oscillators ──
    const osc1 = ctx.createOscillator();
    osc1.setPeriodicWave(this.violinWave);
    osc1.frequency.setValueAtTime(freq, now);
    lfoGain.connect(osc1.frequency);

    const osc2 = ctx.createOscillator();
    osc2.setPeriodicWave(this.violinWave);
    osc2.frequency.setValueAtTime(freq + this.ss.detuneHz, now);
    lfoGain.connect(osc2.frequency);

    const mix1 = ctx.createGain();
    mix1.gain.setValueAtTime(0.5, now);
    const mix2 = ctx.createGain();
    mix2.gain.setValueAtTime(0.5, now);

    osc1.connect(mix1).connect(f1);
    osc2.connect(mix2).connect(f1);

    osc1.start(now);
    osc1.stop(now + dur);
    osc2.start(now);
    osc2.stop(now + dur);

    // ── Cleanup ──
    osc1.onended = () => {
      [osc1, osc2, lfo].forEach(o => o.disconnect());
      [mix1, mix2, lfoGain, f1, f2, f3, lpf, dryGain, reverb, reverbGain, master]
        .forEach(n => n.disconnect());
    };
  }
}

// ═══════════════════════════════════════════
// Рисование нотного стана
// ═══════════════════════════════════════════

class StaffRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  }

  _notePosition(note, octave) {
    const degrees = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
    const deg = degrees[note];
    if (deg === undefined) return null;
    return (octave - 4) * 7 + deg - 2;
  }

  draw(note, octave) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    ctx.clearRect(0, 0, w, h);

    const lineSpacing = h / 10;
    const centerY = h / 2;
    const bottomLineY = centerY + 2 * lineSpacing;

    ctx.strokeStyle = 'rgba(238, 238, 245, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const y = bottomLineY - i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    ctx.font = `${lineSpacing * 5.5}px serif`;
    ctx.fillStyle = 'rgba(238, 238, 245, 0.4)';
    ctx.textBaseline = 'middle';
    ctx.fillText('𝄞', 42, centerY + lineSpacing * 0.15);

    const pos = this._notePosition(note, octave);
    if (pos === null) return;

    const noteX = w * 0.58;
    const noteY = bottomLineY - pos * (lineSpacing / 2);

    ctx.strokeStyle = 'rgba(238, 238, 245, 0.3)';
    ctx.lineWidth = 1.5;
    const noteRadius = lineSpacing * 0.38;
    const ledgerHalf = noteRadius + 8;

    if (pos < 0) {
      for (let p = -2; p >= pos; p -= 2) {
        const ly = bottomLineY - p * (lineSpacing / 2);
        ctx.beginPath();
        ctx.moveTo(noteX - ledgerHalf, ly);
        ctx.lineTo(noteX + ledgerHalf, ly);
        ctx.stroke();
      }
    }

    if (pos > 8) {
      for (let p = 10; p <= pos; p += 2) {
        const ly = bottomLineY - p * (lineSpacing / 2);
        ctx.beginPath();
        ctx.moveTo(noteX - ledgerHalf, ly);
        ctx.lineTo(noteX + ledgerHalf, ly);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(noteX, noteY);
    ctx.rotate(-0.2);
    ctx.beginPath();
    ctx.ellipse(0, 0, noteRadius * 1.3, noteRadius, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    const stemUp = pos < 4;
    ctx.beginPath();
    if (stemUp) {
      ctx.moveTo(noteX + noteRadius * 1.2, noteY);
      ctx.lineTo(noteX + noteRadius * 1.2, noteY - lineSpacing * 3);
    } else {
      ctx.moveTo(noteX - noteRadius * 1.2, noteY);
      ctx.lineTo(noteX - noteRadius * 1.2, noteY + lineSpacing * 3);
    }
    ctx.stroke();
  }
}

// ═══════════════════════════════════════════
// Контроллер приложения
// ═══════════════════════════════════════════

class App {
  constructor() {
    this.soundSettings = new SoundSettings();
    this.audio = new AudioEngine(this.soundSettings);
    this.tracker = new SessionTracker();
    this.staffRenderer = null;

    this.target = null;
    this.prevKey = null;
    this.streak = 0;
    this.answered = false;

    // Violin 1st position: natural notes G3–B5
    this.noteRange = [];
    for (const oct of [3, 4, 5]) {
      for (const n of NATURAL_NOTES) {
        const semitone = NOTE_NAMES.indexOf(n) + oct * 12;
        const gStart = NOTE_NAMES.indexOf('G') + 3 * 12;
        const bEnd = NOTE_NAMES.indexOf('B') + 5 * 12;
        if (semitone >= gStart && semitone <= bEnd) {
          this.noteRange.push({ note: n, octave: oct });
        }
      }
    }

    this.bindElements();
    this.bindEvents();
    this.initSettings();

    // If page was reloaded mid-session, save it and show dashboard
    this.tracker.finalizeIfActive();
    this.renderDashboard();
  }

  bindElements() {
    // Screens
    this.dashboardScreen = document.getElementById('dashboard');
    this.practiceScreen = document.getElementById('practice');

    // Dashboard
    this.statSessions = document.getElementById('stat-sessions');
    this.statTotal = document.getElementById('stat-total');
    this.statAccuracy = document.getElementById('stat-accuracy');
    this.historyBody = document.getElementById('history-body');
    this.historyTable = document.getElementById('history-table');
    this.emptyState = document.getElementById('empty-state');
    this.startBtn = document.getElementById('start-btn');

    // Settings
    this.settingsToggle = document.getElementById('settings-toggle');
    this.settingsPanel = document.getElementById('settings-panel');
    this.volSlider = document.getElementById('vol-slider');
    this.volValue = document.getElementById('vol-value');
    this.vibratoSlider = document.getElementById('vibrato-slider');
    this.vibratoValue = document.getElementById('vibrato-value');
    this.brightSlider = document.getElementById('bright-slider');
    this.brightValue = document.getElementById('bright-value');
    this.durSlider = document.getElementById('dur-slider');
    this.durValue = document.getElementById('dur-value');
    this.detuneSlider = document.getElementById('detune-slider');
    this.detuneValue = document.getElementById('detune-value');
    this.body1Slider = document.getElementById('body1-slider');
    this.body1Value = document.getElementById('body1-value');
    this.body2Slider = document.getElementById('body2-slider');
    this.body2Value = document.getElementById('body2-value');
    this.body3Slider = document.getElementById('body3-slider');
    this.body3Value = document.getElementById('body3-value');
    this.filterQSlider = document.getElementById('filterq-slider');
    this.filterQValue = document.getElementById('filterq-value');
    this.attackSlider = document.getElementById('attack-slider');
    this.attackValue = document.getElementById('attack-value');
    this.testBtn = document.getElementById('test-btn');

    // Practice
    this.endBtn = document.getElementById('end-btn');
    this.canvas = document.getElementById('staff-canvas');
    this.playRefBtn = document.getElementById('play-ref-btn');
    this.noteGrid = document.getElementById('note-grid');
    this.streakEl = document.getElementById('streak');
    this.feedback = document.getElementById('feedback');
    this.feedbackIcon = document.getElementById('feedback-icon');
    this.feedbackText = document.getElementById('feedback-text');
    this.nextBtn = document.getElementById('next-btn');
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startPractice());
    this.endBtn.addEventListener('click', () => this.endPractice());
    this.playRefBtn.addEventListener('click', () => this.playReference());
    this.noteGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.note-btn');
      if (btn && !this.answered) this.checkAnswer(btn);
    });
    this.nextBtn.addEventListener('click', () => this.newRound());

    // Settings
    this.settingsToggle.addEventListener('click', () => {
      this.settingsPanel.classList.toggle('hidden');
    });

    this.volSlider.addEventListener('input', () => {
      this.soundSettings.set('volume', +this.volSlider.value);
      this.volValue.textContent = `${this.volSlider.value}%`;
    });
    this.vibratoSlider.addEventListener('input', () => {
      this.soundSettings.set('vibrato', +this.vibratoSlider.value);
      this.vibratoValue.textContent = this.vibratoSlider.value;
    });
    this.brightSlider.addEventListener('input', () => {
      this.soundSettings.set('brightness', +this.brightSlider.value);
      this.brightValue.textContent = `${this.brightSlider.value}%`;
    });
    this.durSlider.addEventListener('input', () => {
      this.soundSettings.set('duration', +this.durSlider.value);
      this.durValue.textContent = `${(this.durSlider.value / 10).toFixed(1)}с`;
    });
    this.detuneSlider.addEventListener('input', () => {
      this.soundSettings.set('detune', +this.detuneSlider.value);
      this.detuneValue.textContent = (this.detuneSlider.value / 10).toFixed(1);
    });
    this.body1Slider.addEventListener('input', () => {
      this.soundSettings.set('body1', +this.body1Slider.value);
      this.body1Value.textContent = (this.body1Slider.value / 10).toFixed(1);
    });
    this.body2Slider.addEventListener('input', () => {
      this.soundSettings.set('body2', +this.body2Slider.value);
      this.body2Value.textContent = (this.body2Slider.value / 10).toFixed(1);
    });
    this.body3Slider.addEventListener('input', () => {
      this.soundSettings.set('body3', +this.body3Slider.value);
      this.body3Value.textContent = (this.body3Slider.value / 10).toFixed(1);
    });
    this.filterQSlider.addEventListener('input', () => {
      this.soundSettings.set('filterQ', +this.filterQSlider.value);
      this.filterQValue.textContent = (this.filterQSlider.value / 10).toFixed(1);
    });
    this.attackSlider.addEventListener('input', () => {
      this.soundSettings.set('attack', +this.attackSlider.value);
      this.attackValue.textContent = `${this.attackSlider.value * 10}мс`;
    });
    this.testBtn.addEventListener('click', () => {
      this.audio.playNote('A', 4);
    });
  }

  initSettings() {
    const ss = this.soundSettings;
    this.volSlider.value = ss.get('volume');
    this.volValue.textContent = `${ss.get('volume')}%`;
    this.vibratoSlider.value = ss.get('vibrato');
    this.vibratoValue.textContent = ss.get('vibrato');
    this.brightSlider.value = ss.get('brightness');
    this.brightValue.textContent = `${ss.get('brightness')}%`;
    this.durSlider.value = ss.get('duration');
    this.durValue.textContent = `${(ss.get('duration') / 10).toFixed(1)}с`;
    this.detuneSlider.value = ss.get('detune');
    this.detuneValue.textContent = (ss.get('detune') / 10).toFixed(1);
    this.body1Slider.value = ss.get('body1');
    this.body1Value.textContent = (ss.get('body1') / 10).toFixed(1);
    this.body2Slider.value = ss.get('body2');
    this.body2Value.textContent = (ss.get('body2') / 10).toFixed(1);
    this.body3Slider.value = ss.get('body3');
    this.body3Value.textContent = (ss.get('body3') / 10).toFixed(1);
    this.filterQSlider.value = ss.get('filterQ');
    this.filterQValue.textContent = (ss.get('filterQ') / 10).toFixed(1);
    this.attackSlider.value = ss.get('attack');
    this.attackValue.textContent = `${ss.get('attack') * 10}мс`;
  }

  // ── Навигация ──

  showScreen(name) {
    this.dashboardScreen.classList.toggle('active', name === 'dashboard');
    this.practiceScreen.classList.toggle('active', name === 'practice');
  }

  // ── Дашборд ──

  renderDashboard() {
    const stats = this.tracker.getStats();
    this.statSessions.textContent = stats.count;
    this.statTotal.textContent = stats.totalAnswers;
    this.statAccuracy.textContent = stats.accuracy !== null ? `${stats.accuracy}%` : '—';

    const sessions = this.tracker.getSessions();
    this.historyBody.innerHTML = '';

    if (sessions.length === 0) {
      this.historyTable.classList.add('hidden');
      this.emptyState.classList.remove('hidden');
    } else {
      this.historyTable.classList.remove('hidden');
      this.emptyState.classList.add('hidden');

      sessions.forEach(s => {
        const accuracy = Math.round((s.correct / s.total) * 100);
        const date = new Date(s.date);
        const dateStr = date.toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${s.total}</td>
          <td>${s.correct}</td>
          <td><span class="accuracy-badge ${accuracy >= 80 ? 'good' : accuracy >= 50 ? 'ok' : 'low'}">${accuracy}%</span></td>
        `;
        this.historyBody.appendChild(tr);
      });
    }
  }

  // ── Тренировка ──

  startPractice() {
    this.tracker.startSession();
    this.streak = 0;
    this.streakEl.textContent = '0';
    this.prevKey = null;

    if (!this.staffRenderer) {
      this.staffRenderer = new StaffRenderer(this.canvas);
    }

    this.showScreen('practice');

    // Small delay to allow CSS transition before canvas draws
    requestAnimationFrame(() => {
      this.staffRenderer.resize();
      this.newRound();
    });
  }

  endPractice() {
    this.tracker.endSession();
    this.renderDashboard();
    this.showScreen('dashboard');
  }

  playReference() {
    if (!this.target) return;
    this.audio.playNote(this.target.note, this.target.octave);
  }

  newRound() {
    let entry, key;
    do {
      entry = this.noteRange[Math.floor(Math.random() * this.noteRange.length)];
      key = `${entry.note}${entry.octave}`;
    } while (key === this.prevKey);
    this.prevKey = key;
    this.target = { note: entry.note, octave: entry.octave };
    this.answered = false;

    this.noteGrid.querySelectorAll('.note-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong', 'reveal');
      btn.disabled = false;
    });

    this.feedback.classList.add('hidden');

    this.staffRenderer.resize();
    this.staffRenderer.draw(entry.note, entry.octave);
  }

  checkAnswer(btn) {
    this.answered = true;
    const chosen = btn.dataset.note;
    const correct = this.target.note;
    const isCorrect = chosen === correct;

    // Record in session
    this.tracker.recordAnswer(isCorrect);

    this.noteGrid.querySelectorAll('.note-btn').forEach(b => b.disabled = true);

    if (isCorrect) {
      btn.classList.add('correct');
      this.streak++;
      this.streakEl.textContent = this.streak;

      this.feedbackIcon.textContent = '🎉';
      this.feedbackText.innerHTML = `<strong>Верно!</strong> Это ${noteLabel(correct, this.target.octave)}.`;
    } else {
      btn.classList.add('wrong');
      this.streak = 0;
      this.streakEl.textContent = '0';

      this.noteGrid.querySelectorAll('.note-btn').forEach(b => {
        if (b.dataset.note === correct) b.classList.add('reveal');
      });

      this.feedbackIcon.textContent = '😕';
      this.feedbackText.innerHTML = `Это была <strong>${noteLabel(correct, this.target.octave)}</strong>, а не ${noteNameRu(chosen)}.`;
    }

    this.feedback.classList.remove('hidden');
  }
}

// ── Запуск ──
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
