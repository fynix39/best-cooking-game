// Tiny WebAudio sound effects, synthesised at run time — no audio files, no
// network. Everything is guarded: in a headless browser or before the first
// user gesture there may be no audio context, and the game must play anyway.
let context = null;
let muted = false;
let sizzleGain = null;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (sizzleGain) sizzleGain.gain.value = 0;
  return muted;
}

/** Create the context on the first user gesture; safe to call any time. */
export function ensureAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume().catch(() => {});
    return;
  }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
  } catch {
    context = null;
  }
}

function tone(freq, seconds, type, volume, when = 0) {
  if (!context || muted) return;
  try {
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

function noiseBurst(seconds, volume, filterFreq) {
  if (!context || muted) return;
  try {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
  } catch {
    // Ignore.
  }
}

export function sfxPickup() {
  tone(620, 0.09, 'sine', 0.16);
  tone(930, 0.1, 'sine', 0.12, 0.05);
}

export function sfxChop() {
  noiseBurst(0.05, 0.22, 2400);
}

export function sfxPlace() {
  tone(420, 0.07, 'triangle', 0.14);
}

export function sfxServe() {
  tone(880, 0.12, 'sine', 0.18);
  tone(1174, 0.16, 'sine', 0.18, 0.09);
  tone(1568, 0.22, 'sine', 0.14, 0.18);
}

export function sfxError() {
  tone(160, 0.16, 'square', 0.1);
  tone(120, 0.2, 'square', 0.1, 0.1);
}

export function sfxExpire() {
  tone(300, 0.25, 'sawtooth', 0.08);
  tone(200, 0.35, 'sawtooth', 0.08, 0.16);
}

export function sfxLevelUp() {
  tone(523, 0.1, 'sine', 0.16);
  tone(659, 0.1, 'sine', 0.16, 0.08);
  tone(784, 0.18, 'sine', 0.16, 0.16);
}

export function sfxTick() {
  tone(1050, 0.04, 'square', 0.05);
}

/** Keep the grill sizzle audible while at least one patty cooks. */
export function setSizzle(on) {
  if (!context || muted) {
    if (sizzleGain) sizzleGain.gain.value = 0;
    return;
  }
  try {
    if (!sizzleGain) {
      const length = context.sampleRate;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3800;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start();
      sizzleGain = gain;
    }
    sizzleGain.gain.setTargetAtTime(on ? 0.035 : 0, context.currentTime, 0.1);
  } catch {
    // Ignore.
  }
}
