/**
 * UHC Soft Sound System
 * All sounds are generated via Web Audio API — zero external files.
 * Sounds are gentle, short, and non-intrusive.
 * 
 * Respects user preference: sounds can be disabled via localStorage key "uhc_sounds_off"
 */

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browsers require user gesture first)
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

export function isSoundEnabled() {
  return localStorage.getItem("uhc_sounds_off") !== "true";
}

export function setSoundEnabled(val) {
  if (val) {
    localStorage.removeItem("uhc_sounds_off");
  } else {
    localStorage.setItem("uhc_sounds_off", "true");
  }
}

/**
 * Low-level: play a tone with a given waveform + envelope
 * @param {object} opts
 */
function playTone({
  frequency = 440,
  type = "sine",
  gainPeak = 0.18,
  attackTime = 0.01,
  decayTime = 0.08,
  sustainLevel = 0.0,
  releaseTime = 0.15,
  startTime = 0,        // seconds from now
  duration = 0.25,      // total note duration
  detune = 0,
}) {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime + startTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (detune) osc.detune.setValueAtTime(detune, now);

  // ADSR envelope
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + attackTime);
  gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
  gain.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

// ─────────────────────────────────────────────
// Named sounds
// ─────────────────────────────────────────────

/** Soft ascending chime — used for success / toast success */
export function playSuccess() {
  playTone({ frequency: 523.25, gainPeak: 0.14, attackTime: 0.01, decayTime: 0.06, duration: 0.22, startTime: 0 });    // C5
  playTone({ frequency: 659.25, gainPeak: 0.12, attackTime: 0.01, decayTime: 0.06, duration: 0.22, startTime: 0.12 }); // E5
  playTone({ frequency: 783.99, gainPeak: 0.10, attackTime: 0.01, decayTime: 0.08, duration: 0.28, startTime: 0.22 }); // G5
}

/** Soft low thud — used for errors */
export function playError() {
  playTone({ frequency: 220, type: "triangle", gainPeak: 0.16, attackTime: 0.005, decayTime: 0.12, duration: 0.25, startTime: 0 });
  playTone({ frequency: 174.61, type: "triangle", gainPeak: 0.12, attackTime: 0.005, decayTime: 0.10, duration: 0.22, startTime: 0.14 });
}

/** Soft two-tone warning ping */
export function playWarning() {
  playTone({ frequency: 587.33, type: "sine", gainPeak: 0.13, attackTime: 0.008, decayTime: 0.07, duration: 0.2, startTime: 0 });    // D5
  playTone({ frequency: 493.88, type: "sine", gainPeak: 0.11, attackTime: 0.008, decayTime: 0.07, duration: 0.2, startTime: 0.15 }); // B4
}

/** Soft single neutral ping — used for info / generic notification */
export function playInfo() {
  playTone({ frequency: 698.46, type: "sine", gainPeak: 0.11, attackTime: 0.01, decayTime: 0.05, duration: 0.22, startTime: 0 }); // F5
}

/** Gentle click — used for selecting an answer option */
export function playSelect() {
  playTone({ frequency: 880, type: "sine", gainPeak: 0.07, attackTime: 0.005, decayTime: 0.04, duration: 0.10, startTime: 0 });
}

/** Correct answer — soft triumphant arpeggio */
export function playCorrect() {
  playTone({ frequency: 523.25, gainPeak: 0.13, attackTime: 0.008, decayTime: 0.06, duration: 0.18, startTime: 0 });     // C5
  playTone({ frequency: 659.25, gainPeak: 0.12, attackTime: 0.008, decayTime: 0.06, duration: 0.18, startTime: 0.10 });  // E5
  playTone({ frequency: 1046.5, gainPeak: 0.09, attackTime: 0.008, decayTime: 0.10, duration: 0.26, startTime: 0.19 }); // C6
}

/** Wrong answer — soft descending pair */
export function playWrong() {
  playTone({ frequency: 392, type: "triangle", gainPeak: 0.13, attackTime: 0.008, decayTime: 0.08, duration: 0.22, startTime: 0 });   // G4
  playTone({ frequency: 311.13, type: "triangle", gainPeak: 0.11, attackTime: 0.008, decayTime: 0.09, duration: 0.22, startTime: 0.16 }); // Eb4
}

/** Quiz finish — gentle fanfare */
export function playFinish() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    playTone({ frequency: f, gainPeak: 0.12 - i * 0.01, attackTime: 0.01, decayTime: 0.07, duration: 0.2, startTime: i * 0.13 });
  });
}

/** Soft refresh/data-reload whoosh */
export function playRefresh() {
  // Ascending sweep
  const ctx = getCtx();
  if (!ctx || !isSoundEnabled()) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.10, now + 0.05);
  gain.gain.linearRampToValueAtTime(0, now + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}

/** Soft navigation/page transition tick */
export function playNavigate() {
  playTone({ frequency: 660, type: "sine", gainPeak: 0.08, attackTime: 0.005, decayTime: 0.04, duration: 0.12, startTime: 0 });
}

/** Streak milestone — sparkle burst */
export function playStreak() {
  [880, 1108.73, 1318.51, 1760].forEach((f, i) => {
    playTone({ frequency: f, gainPeak: 0.08 - i * 0.01, attackTime: 0.005, decayTime: 0.05, duration: 0.14, startTime: i * 0.07 });
  });
}

/** Timer warning — low gentle pulse */
export function playTimerWarn() {
  playTone({ frequency: 330, type: "triangle", gainPeak: 0.10, attackTime: 0.005, decayTime: 0.05, duration: 0.14, startTime: 0 });
}

/**
 * Helper: play sound based on toast type
 * @param {'success'|'error'|'warning'|'info'} type
 */
export function playToastSound(type) {
  switch (type) {
    case "success": return playSuccess();
    case "error":   return playError();
    case "warning": return playWarning();
    default:        return playInfo();
  }
}
