/**
 * Tiny WebAudio sounds — no downloads, no licences, one mute switch.
 * Everything is synthesised on the fly: stamps, ticks, a gong, fanfares.
 */

import type { Answer } from '@shared/types';

let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem('insider.muted') === '1';
} catch {
  /* ignore */
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem('insider.muted', value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, gain = 0.12, type: OscillatorType = 'triangle'): void {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  env.gain.setValueAtTime(0.0001, ac.currentTime + start);
  env.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(env).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

/** A short burst of filtered noise: paper, stamps, cards. */
function noise(start: number, duration: number, gain = 0.12, freq = 1800): void {
  const ac = audio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const env = ac.createGain();
  env.gain.value = gain;
  src.connect(filter).connect(env).connect(ac.destination);
  src.start(ac.currentTime + start);
}

export const sfx = {
  tap: () => tone(520, 0, 0.06, 0.05, 'square'),
  select: () => tone(760, 0, 0.08, 0.07),
  send: () => {
    tone(620, 0, 0.06, 0.06);
    tone(880, 0.05, 0.08, 0.06);
  },
  /** A rubber stamp coming down, pitched by the answer. */
  stamp: (answer: Answer) => {
    noise(0, 0.09, 0.22, 900);
    const f = answer === 'yes' ? 660 : answer === 'no' ? 247 : answer === 'correct' ? 880 : 440;
    tone(f, 0.02, 0.14, 0.08, answer === 'no' ? 'sawtooth' : 'triangle');
  },
  flip: () => noise(0, 0.12, 0.16, 2600),
  whoosh: () => noise(0, 0.35, 0.12, 700),
  tick: () => tone(1320, 0, 0.03, 0.05, 'square'),
  tock: () => tone(990, 0, 0.03, 0.05, 'square'),
  /** Somebody found the keyword. */
  gong: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.35, 0.1));
    tone(131, 0, 1.1, 0.12, 'sine');
  },
  wrong: () => {
    tone(196, 0, 0.12, 0.07, 'sawtooth');
    tone(165, 0.1, 0.16, 0.07, 'sawtooth');
  },
  eyesClose: () => {
    tone(392, 0, 0.3, 0.07, 'sine');
    tone(294, 0.2, 0.45, 0.07, 'sine');
  },
  eyesOpen: () => {
    tone(294, 0, 0.18, 0.08, 'sine');
    tone(392, 0.14, 0.18, 0.08, 'sine');
    tone(587, 0.28, 0.3, 0.08, 'sine');
  },
  drum: () => {
    for (let i = 0; i < 6; i++) noise(i * 0.09, 0.07, 0.12 + i * 0.02, 180);
  },
  reveal: () => {
    noise(0, 0.1, 0.2, 400);
    tone(880, 0.05, 0.25, 0.08);
  },
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.32, 0.11));
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.14, 0.3, 0.09));
  },
  join: () => {
    tone(587, 0, 0.08, 0.06);
    tone(784, 0.07, 0.12, 0.06);
  },
  chat: () => tone(990, 0, 0.06, 0.045, 'sine'),
  error: () => tone(160, 0, 0.16, 0.08, 'sawtooth'),
};
