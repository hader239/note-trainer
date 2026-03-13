/* ═══════════════════════════════════════════
   Тренажёр нот — Главное приложение
   ═══════════════════════════════════════════ */

// ── Ноты (равномерная темперация, Ля4 = 440 Гц) ──
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_RU = {
  'C': 'До', 'C#': 'До♯',
  'D': 'Ре', 'D#': 'Ре♯',
  'E': 'Ми',
  'F': 'Фа', 'F#': 'Фа♯',
  'G': 'Соль', 'G#': 'Соль♯',
  'A': 'Ля', 'A#': 'Ля♯',
  'B': 'Си'
};

// Natural notes only (for staff mode — no sharps)
const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function noteFrequency(note, octave) {
  const semitone = NOTE_NAMES.indexOf(note);
  const dist = (octave - 4) * 12 + (semitone - 9);
  return 440 * Math.pow(2, dist / 12);
}

function frequencyToNote(freq) {
  const semitoneFromA4 = 12 * Math.log2(freq / 440);
  const rounded = Math.round(semitoneFromA4);
  const cents = Math.round((semitoneFromA4 - rounded) * 100);
  const noteIndex = (((rounded % 12) + 12 + 9) % 12);
  const octave = 4 + Math.floor((rounded + 9) / 12);
  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

function noteLabel(note, octave) {
  return `${NOTE_NAMES_RU[note] || note}${octave}`;
}

function noteNameRu(note) {
  return NOTE_NAMES_RU[note] || note;
}

// ═══════════════════════════════════════════
// Звуковой движок
// ═══════════════════════════════════════════

class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playNote(note, octave, duration = 1.2) {
    const ctx = this.ensureContext();
    const freq = noteFrequency(note, octave);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc2.connect(gain2).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);

    osc.onended = () => {
      osc.disconnect();
      osc2.disconnect();
      gain.disconnect();
      gain2.disconnect();
    };
  }
}

// ═══════════════════════════════════════════
// Детектор высоты тона (автокорреляция)
// ═══════════════════════════════════════════

class PitchDetector {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.running = false;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.source.connect(this.analyser);
    this.running = true;
  }

  stop() {
    this.running = false;
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  detect() {
    if (!this.analyser) return null;

    const bufLen = this.analyser.fftSize;
    const buf = new Float32Array(bufLen);
    this.analyser.getFloatTimeDomainData(buf);

    let rms = 0;
    for (let i = 0; i < bufLen; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / bufLen);
    if (rms < 0.01) return null;

    const sampleRate = this.ctx.sampleRate;
    const minPeriod = Math.floor(sampleRate / 1200);
    const maxPeriod = Math.floor(sampleRate / 60);

    let bestCorr = 0;
    let bestPeriod = 0;

    for (let period = minPeriod; period < maxPeriod && period < bufLen / 2; period++) {
      let corr = 0;
      for (let i = 0; i < bufLen / 2; i++) {
        corr += buf[i] * buf[i + period];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestPeriod = period;
      }
    }

    if (bestPeriod === 0) return null;

    const prev = this._autoCorr(buf, bestPeriod - 1);
    const curr = this._autoCorr(buf, bestPeriod);
    const next = this._autoCorr(buf, bestPeriod + 1);
    const shift = (prev - next) / (2 * (prev - 2 * curr + next));
    const refinedPeriod = bestPeriod + (isFinite(shift) ? shift : 0);

    const freq = sampleRate / refinedPeriod;
    if (freq < 60 || freq > 1200) return null;

    const info = frequencyToNote(freq);
    return { frequency: freq, ...info };
  }

  _autoCorr(buf, period) {
    let corr = 0;
    const half = Math.floor(buf.length / 2);
    for (let i = 0; i < half; i++) {
      corr += buf[i] * buf[i + period];
    }
    return corr;
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

  // Get Y position for a note. We map note positions on the treble clef:
  // Each staff line/space is half a lineSpacing apart.
  // Bottom line (E4) = position 0, each step up = +1
  // Positions (from bottom): E4=0, F4=1, G4=2, A4=3, B4=4, C5=5, D5=6, E5=7, F5=8
  // Below staff: D4=-1, C4=-2, B3=-3, A3=-4, G3=-5
  // Above staff: G5=9, A5=10, B5=11, C6=12

  _notePosition(note, octave) {
    // Scale degree from C (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
    const degrees = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
    const deg = degrees[note];
    if (deg === undefined) return null;
    // E4 is our reference = position 0
    // E4 has octave=4, degree=2
    const refPos = 0; // E4
    const pos = (octave - 4) * 7 + deg - 2; // relative to E4
    return pos;
  }

  draw(note, octave) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    ctx.clearRect(0, 0, w, h);

    const lineSpacing = h / 8;
    // Staff lines: bottom line = E4 (position 0)
    // We center 5 lines vertically. Bottom line at y = centerY + 2*lineSpacing
    const centerY = h / 2;
    const bottomLineY = centerY + 2 * lineSpacing;

    // Draw 5 staff lines
    ctx.strokeStyle = 'rgba(238, 238, 245, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const y = bottomLineY - i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    // Draw treble clef symbol
    ctx.font = `${lineSpacing * 5.5}px serif`;
    ctx.fillStyle = 'rgba(238, 238, 245, 0.4)';
    ctx.textBaseline = 'middle';
    ctx.fillText('𝄞', 42, centerY + lineSpacing * 0.15);

    // Draw the note
    const pos = this._notePosition(note, octave);
    if (pos === null) return;

    const noteX = w * 0.58;
    const noteY = bottomLineY - pos * (lineSpacing / 2);

    // Ledger lines (below or above the staff)
    ctx.strokeStyle = 'rgba(238, 238, 245, 0.3)';
    ctx.lineWidth = 1.5;
    const noteRadius = lineSpacing * 0.38;
    const ledgerHalf = noteRadius + 8;

    // Below staff: position < 0 means below bottom line E4
    // Ledger lines at positions -2 (C4), -4 (A3), etc. (even positions = on a line)
    if (pos < 0) {
      for (let p = -2; p >= pos; p -= 2) {
        const ly = bottomLineY - p * (lineSpacing / 2);
        ctx.beginPath();
        ctx.moveTo(noteX - ledgerHalf, ly);
        ctx.lineTo(noteX + ledgerHalf, ly);
        ctx.stroke();
      }
    }

    // Above staff: top line is position 8 (F5)
    if (pos > 8) {
      for (let p = 10; p <= pos; p += 2) {
        const ly = bottomLineY - p * (lineSpacing / 2);
        ctx.beginPath();
        ctx.moveTo(noteX - ledgerHalf, ly);
        ctx.lineTo(noteX + ledgerHalf, ly);
        ctx.stroke();
      }
    }

    // Also handle the middle-C ledger line: C4 is at position -2
    // Already handled by the loop above.

    // Draw note head (filled ellipse)
    ctx.save();
    ctx.translate(noteX, noteY);
    ctx.rotate(-0.2); // slight tilt for natural look
    ctx.beginPath();
    ctx.ellipse(0, 0, noteRadius * 1.3, noteRadius, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    // Draw stem
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    const stemUp = pos < 4; // stem goes up if note is below middle of staff
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
    this.audio = new AudioEngine();
    this.pitchDetector = null;
    this.currentScreen = 'landing';

    // Sing mode state
    this.singTarget = null;
    this.singPrevKey = null;
    this.singListening = false;
    this.singAnimFrame = null;
    this.singReadings = [];

    // Identify mode state
    this.identifyTarget = null;
    this.identifyPrevKey = null;
    this.identifyStreak = 0;
    this.identifyAnswered = false;

    // Staff mode state
    this.staffTarget = null;
    this.staffPrevKey = null;
    this.staffStreak = 0;
    this.staffAnswered = false;
    this.staffRenderer = null;

    // Note range for exercises: [G3, B5]
    // Build chromatic range G3–B5 for sing & identify modes
    this.chromaticRange = [];
    const startSemitone = NOTE_NAMES.indexOf('G') + 3 * 12; // G3
    const endSemitone = NOTE_NAMES.indexOf('B') + 5 * 12;   // B5
    for (let s = startSemitone; s <= endSemitone; s++) {
      const note = NOTE_NAMES[s % 12];
      const octave = Math.floor(s / 12);
      this.chromaticRange.push({ note, octave });
    }

    // Build natural-note range G3–B5 for staff mode
    this.staffRange = this.chromaticRange.filter(
      entry => !entry.note.includes('#')
    );

    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.screens = {
      landing: document.getElementById('landing'),
      sing: document.getElementById('sing-mode'),
      identify: document.getElementById('identify-mode'),
      staff: document.getElementById('staff-mode'),
    };

    // Sing mode
    this.singTargetEl = document.getElementById('sing-target');
    this.singPlayRefBtn = document.getElementById('sing-play-ref');
    this.singStartBtn = document.getElementById('sing-start-btn');
    this.meterNeedle = document.getElementById('meter-needle');
    this.detectedNoteEl = document.getElementById('detected-note');
    this.detectedCentsEl = document.getElementById('detected-cents');
    this.singFeedback = document.getElementById('sing-feedback');
    this.singFeedbackIcon = document.getElementById('sing-feedback-icon');
    this.singFeedbackText = document.getElementById('sing-feedback-text');
    this.singNextBtn = document.getElementById('sing-next-btn');

    // Identify mode
    this.identifyPlayBtn = document.getElementById('identify-play-btn');
    this.playHint = document.getElementById('play-hint');
    this.noteGrid = document.getElementById('note-grid');
    this.streakEl = document.getElementById('streak');
    this.identifyFeedback = document.getElementById('identify-feedback');
    this.identifyFeedbackIcon = document.getElementById('identify-feedback-icon');
    this.identifyFeedbackText = document.getElementById('identify-feedback-text');
    this.identifyNextBtn = document.getElementById('identify-next-btn');

    // Staff mode
    this.staffCanvas = document.getElementById('staff-canvas');
    this.staffNoteGrid = document.getElementById('staff-note-grid');
    this.staffStreakEl = document.getElementById('staff-streak');
    this.staffFeedback = document.getElementById('staff-feedback');
    this.staffFeedbackIcon = document.getElementById('staff-feedback-icon');
    this.staffFeedbackText = document.getElementById('staff-feedback-text');
    this.staffNextBtn = document.getElementById('staff-next-btn');
  }

  bindEvents() {
    // Navigation
    document.getElementById('btn-mode-sing').addEventListener('click', () => this.showScreen('sing'));
    document.getElementById('btn-mode-identify').addEventListener('click', () => this.showScreen('identify'));
    document.getElementById('btn-mode-staff').addEventListener('click', () => this.showScreen('staff'));
    document.getElementById('sing-back').addEventListener('click', () => this.showScreen('landing'));
    document.getElementById('identify-back').addEventListener('click', () => this.showScreen('landing'));
    document.getElementById('staff-back').addEventListener('click', () => this.showScreen('landing'));

    // Sing mode
    this.singPlayRefBtn.addEventListener('click', () => this.playSingReference());
    this.singStartBtn.addEventListener('click', () => this.toggleSingListening());
    this.singNextBtn.addEventListener('click', () => this.newSingRound());

    // Identify mode
    this.identifyPlayBtn.addEventListener('click', () => this.playIdentifyNote());
    this.noteGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.note-btn');
      if (btn && !this.identifyAnswered) this.checkIdentifyAnswer(btn);
    });
    this.identifyNextBtn.addEventListener('click', () => this.newIdentifyRound());

    // Staff mode
    this.staffNoteGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.note-btn');
      if (btn && !this.staffAnswered) this.checkStaffAnswer(btn);
    });
    this.staffNextBtn.addEventListener('click', () => this.newStaffRound());
  }

  // ── Навигация ──

  showScreen(name) {
    if (this.singListening) this.stopSingListening();

    Object.entries(this.screens).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });

    this.currentScreen = name;

    if (name === 'sing') this.newSingRound();
    if (name === 'identify') this.newIdentifyRound();
    if (name === 'staff') {
      if (!this.staffRenderer) {
        this.staffRenderer = new StaffRenderer(this.staffCanvas);
      } else {
        this.staffRenderer.resize();
      }
      this.newStaffRound();
    }
  }

  // ═══════════════════════════════════════════
  // Режим 1: Спой ноту
  // ═══════════════════════════════════════════

  newSingRound() {
    let entry, key;
    do {
      entry = this.chromaticRange[Math.floor(Math.random() * this.chromaticRange.length)];
      key = `${entry.note}${entry.octave}`;
    } while (key === this.singPrevKey);
    this.singPrevKey = key;
    this.singTarget = { note: entry.note, octave: entry.octave };

    this.singTargetEl.textContent = noteLabel(entry.note, entry.octave);
    this.singTargetEl.style.animation = 'none';
    void this.singTargetEl.offsetWidth;
    this.singTargetEl.style.animation = '';

    this.singFeedback.classList.add('hidden');
    this.singStartBtn.classList.remove('listening');
    this.singStartBtn.querySelector('.btn-label').textContent = 'Начать запись';
    this.meterNeedle.classList.add('hidden-needle');
    this.detectedNoteEl.textContent = '—';
    this.detectedCentsEl.textContent = '—';
    this.singReadings = [];
  }

  playSingReference() {
    if (!this.singTarget) return;
    this.audio.playNote(this.singTarget.note, this.singTarget.octave);
  }

  async toggleSingListening() {
    if (this.singListening) {
      this.stopSingListening();
      return;
    }

    try {
      const ctx = this.audio.ensureContext();
      this.pitchDetector = new PitchDetector(ctx);
      await this.pitchDetector.start();

      this.singListening = true;
      this.singStartBtn.classList.add('listening');
      this.singStartBtn.querySelector('.btn-label').textContent = 'Остановить';
      this.meterNeedle.classList.remove('hidden-needle');
      this.singReadings = [];

      this.singLoop();

      this.singTimeout = setTimeout(() => {
        if (this.singListening) this.stopSingListening();
      }, 5000);
    } catch (err) {
      console.error('Ошибка микрофона:', err);
      this.detectedNoteEl.textContent = 'Нет доступа к микрофону';
      this.singListening = false;
      this.singStartBtn.classList.remove('listening');
      this.singStartBtn.querySelector('.btn-label').textContent = 'Начать запись';
    }
  }

  singLoop() {
    if (!this.singListening) return;

    if (this.audio.ctx && this.audio.ctx.state === 'suspended') {
      this.audio.ctx.resume();
    }

    const result = this.pitchDetector.detect();
    if (result) {
      this.updatePitchMeter(result);
      this.singReadings.push(result);
    }

    this.singAnimFrame = requestAnimationFrame(() => this.singLoop());
  }

  updatePitchMeter(result) {
    const targetFreq = noteFrequency(this.singTarget.note, this.singTarget.octave);
    const centsOff = 1200 * Math.log2(result.frequency / targetFreq);
    const clampedCents = Math.max(-50, Math.min(50, centsOff));

    const pct = 50 + (clampedCents / 50) * 45;
    this.meterNeedle.style.left = `${pct}%`;

    this.detectedNoteEl.textContent = noteLabel(result.note, result.octave);

    const absCents = Math.abs(Math.round(centsOff));
    if (centsOff > 2) {
      this.detectedCentsEl.textContent = `+${absCents}¢ выше`;
    } else if (centsOff < -2) {
      this.detectedCentsEl.textContent = `−${absCents}¢ ниже`;
    } else {
      this.detectedCentsEl.textContent = '✓ Точно!';
    }
  }

  stopSingListening() {
    this.singListening = false;
    if (this.singTimeout) clearTimeout(this.singTimeout);
    if (this.singAnimFrame) cancelAnimationFrame(this.singAnimFrame);
    if (this.pitchDetector) {
      this.pitchDetector.stop();
      this.pitchDetector = null;
    }

    this.singStartBtn.classList.remove('listening');
    this.singStartBtn.querySelector('.btn-label').textContent = 'Начать запись';

    this.showSingFeedback();
  }

  showSingFeedback() {
    if (this.singReadings.length === 0) {
      this.singFeedbackIcon.textContent = '🤷';
      this.singFeedbackText.innerHTML = "Не удалось определить высоту тона.<br>Попробуй петь громче или ближе к микрофону!";
      this.singFeedback.classList.remove('hidden');
      return;
    }

    const targetFreq = noteFrequency(this.singTarget.note, this.singTarget.octave);

    const centsList = this.singReadings.map(r => 1200 * Math.log2(r.frequency / targetFreq));
    const avgCents = centsList.reduce((a, b) => a + b, 0) / centsList.length;
    const absCents = Math.abs(Math.round(avgCents));

    let icon, text;
    if (absCents <= 10) {
      icon = '🎯';
      text = `<strong>Отлично!</strong> Отклонение всего ${absCents}¢ — почти идеально!`;
    } else if (absCents <= 25) {
      icon = '👍';
      text = `<strong>Хорошо!</strong> Среднее отклонение ${absCents}¢ ${avgCents > 0 ? 'выше' : 'ниже'}.`;
    } else if (absCents <= 50) {
      icon = '😬';
      text = `<strong>Почти.</strong> Отклонение ${absCents}¢ ${avgCents > 0 ? 'выше' : 'ниже'}. Продолжай тренироваться!`;
    } else {
      icon = '💪';
      const semitonesOff = Math.round(avgCents / 100);
      text = `Отклонение примерно ${Math.abs(semitonesOff)} полутон${this._pluralSemitone(Math.abs(semitonesOff))} ${avgCents > 0 ? 'выше' : 'ниже'}. Послушай ноту для калибровки!`;
    }

    this.singFeedbackIcon.textContent = icon;
    this.singFeedbackText.innerHTML = text;
    this.singFeedback.classList.remove('hidden');
  }

  _pluralSemitone(n) {
    if (n === 1) return '';
    if (n >= 2 && n <= 4) return 'а';
    return 'ов';
  }

  // ═══════════════════════════════════════════
  // Режим 2: Угадай ноту
  // ═══════════════════════════════════════════

  newIdentifyRound() {
    let entry, key;
    do {
      entry = this.chromaticRange[Math.floor(Math.random() * this.chromaticRange.length)];
      key = `${entry.note}${entry.octave}`;
    } while (key === this.identifyPrevKey);
    this.identifyPrevKey = key;
    this.identifyTarget = { note: entry.note, octave: entry.octave };
    this.identifyAnswered = false;

    this.noteGrid.querySelectorAll('.note-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong', 'reveal');
      btn.disabled = false;
    });

    this.identifyFeedback.classList.add('hidden');
    this.playHint.textContent = 'Нажми, чтобы услышать ноту';
    this.identifyPlayBtn.classList.remove('playing');
  }

  playIdentifyNote() {
    if (!this.identifyTarget) return;
    this.audio.playNote(this.identifyTarget.note, this.identifyTarget.octave);
    this.identifyPlayBtn.classList.remove('playing');
    void this.identifyPlayBtn.offsetWidth;
    this.identifyPlayBtn.classList.add('playing');
    this.playHint.textContent = 'Играет… слушай внимательно!';
    setTimeout(() => {
      this.playHint.textContent = 'Нажми ещё раз, чтобы переслушать';
    }, 1500);
  }

  checkIdentifyAnswer(btn) {
    this.identifyAnswered = true;
    const chosen = btn.dataset.note;
    const correct = this.identifyTarget.note;
    const isCorrect = chosen === correct;

    this.noteGrid.querySelectorAll('.note-btn').forEach(b => b.disabled = true);

    if (isCorrect) {
      btn.classList.add('correct');
      this.identifyStreak++;
      this.streakEl.textContent = this.identifyStreak;

      this.identifyFeedbackIcon.textContent = '🎉';
      this.identifyFeedbackText.innerHTML = `<strong>Верно!</strong> Это была ${noteLabel(correct, this.identifyTarget.octave)}.`;
    } else {
      btn.classList.add('wrong');
      this.identifyStreak = 0;
      this.streakEl.textContent = '0';

      this.noteGrid.querySelectorAll('.note-btn').forEach(b => {
        if (b.dataset.note === correct) b.classList.add('reveal');
      });

      this.identifyFeedbackIcon.textContent = '😕';
      this.identifyFeedbackText.innerHTML = `Это была <strong>${noteLabel(correct, this.identifyTarget.octave)}</strong>, а не ${noteNameRu(chosen)}.`;
    }

    this.identifyFeedback.classList.remove('hidden');
  }

  // ═══════════════════════════════════════════
  // Режим 3: Чтение нот
  // ═══════════════════════════════════════════

  newStaffRound() {
    let entry, key;
    do {
      entry = this.staffRange[Math.floor(Math.random() * this.staffRange.length)];
      key = `${entry.note}${entry.octave}`;
    } while (key === this.staffPrevKey);
    this.staffPrevKey = key;
    this.staffTarget = { note: entry.note, octave: entry.octave };
    this.staffAnswered = false;

    // Reset buttons
    this.staffNoteGrid.querySelectorAll('.note-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong', 'reveal');
      btn.disabled = false;
    });

    this.staffFeedback.classList.add('hidden');

    // Draw on canvas
    this.staffRenderer.resize();
    this.staffRenderer.draw(entry.note, entry.octave);
  }

  checkStaffAnswer(btn) {
    this.staffAnswered = true;
    const chosen = btn.dataset.note;
    const correct = this.staffTarget.note;
    const isCorrect = chosen === correct;

    this.staffNoteGrid.querySelectorAll('.note-btn').forEach(b => b.disabled = true);

    if (isCorrect) {
      btn.classList.add('correct');
      this.staffStreak++;
      this.staffStreakEl.textContent = this.staffStreak;

      this.staffFeedbackIcon.textContent = '🎉';
      this.staffFeedbackText.innerHTML = `<strong>Верно!</strong> Это ${noteLabel(correct, this.staffTarget.octave)}.`;
    } else {
      btn.classList.add('wrong');
      this.staffStreak = 0;
      this.staffStreakEl.textContent = '0';

      this.staffNoteGrid.querySelectorAll('.note-btn').forEach(b => {
        if (b.dataset.note === correct) b.classList.add('reveal');
      });

      this.staffFeedbackIcon.textContent = '😕';
      this.staffFeedbackText.innerHTML = `Это была <strong>${noteLabel(correct, this.staffTarget.octave)}</strong>, а не ${noteNameRu(chosen)}.`;
    }

    this.staffFeedback.classList.remove('hidden');
  }
}

// ── Запуск ──
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
