// Shared Web Audio plumbing: master chain, music bus behind a low-pass that opens with the switch,
// a ducking stage, a pump stage for sidechain, an effects bus ~5 dB over the music,
// the drag "rub", one lookahead clock with light swing, and small synthesis helpers.
import { sst } from './math';

/** A study's music and switch sounds. */
export interface Music {
  bpm: number;
  /** steps per loop (16ths) */
  steps: number;
  /** build the study's own buses and voices (runs once, after the core) */
  init(): void;
  /** schedule one 16th note */
  step(s: number, t: number): void;
  /** extra lookahead work: ambience scheduled independently of the beat */
  tick?(now: number): void;
  /** per-frame parameter updates (ambient bus levels etc.) */
  frame?(p: number): void;
  grab(): void;
  release(): void;
}

export let ac: AudioContext | null = null;
/** two seconds of white noise */
export let NB: AudioBuffer;
export let master: GainNode, duck: GainNode, pump: GainNode, musBus: GainNode, sfxBus: GainNode;
let lpf: BiquadFilterNode, rubG: GainNode, rubF: BiquadFilterNode;

/** Layer levels 0..4, set from the switch position every frame. */
export const lev = [1, 0, 0, 0, 0];

let music: Music;
let songT0 = 0,
  nextT = 0,
  step = 0,
  S16 = 0.15,
  SPB = 0.6;
let soundOn = false;

const ctx = (): AudioContext => ac as AudioContext;
export const live = (): boolean => !!ac && soundOn && ac.state === 'running';

export const gn = (dest: AudioNode, v: number): GainNode => {
  const g = ctx().createGain();
  g.gain.value = v;
  g.connect(dest);
  return g;
};
export const flt = (type: BiquadFilterType, f: number, q: number, dest: AudioNode): BiquadFilterNode => {
  const b = ctx().createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.connect(dest);
  return b;
};
export const pan = (v: number, dest: AudioNode): AudioNode => {
  const c = ctx();
  if (!c.createStereoPanner) return dest;
  const n = c.createStereoPanner();
  n.pan.value = v;
  n.connect(dest);
  return n;
};
export function env(g: GainNode, t: number, a: number, pk: number, d: number): void {
  pk = Math.max(pk, 0.0002);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pk, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
export function osc(type: OscillatorType, f: number, t: number, dur: number, dest: AudioNode): OscillatorNode {
  const o = ctx().createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.connect(dest);
  o.start(t);
  o.stop(t + dur);
  return o;
}
export function noise(t: number, dur: number, dest: AudioNode): AudioBufferSourceNode {
  const s = ctx().createBufferSource();
  s.buffer = NB;
  s.loop = true;
  s.connect(dest);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur);
  return s;
}
export function tone(type: OscillatorType, f: number, t: number, a: number, pk: number, d: number, dest: AudioNode): OscillatorNode {
  const g = gn(dest, 0);
  env(g, t, a, pk, d);
  return osc(type, f, t, a + d + 0.05, g);
}
/** A looping noise source feeding `dest`, started now. */
export function noiseLoop(dest: AudioNode): AudioBufferSourceNode {
  const s = ctx().createBufferSource();
  s.buffer = NB;
  s.loop = true;
  s.connect(dest);
  s.start();
  return s;
}
/** A soft-clipping waveshaper. */
export function saturator(drive: number, dest: AudioNode): WaveShaperNode {
  const sh = ctx().createWaveShaper(),
    cu = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) cu[i] = Math.tanh((i / 511.5 - 1) * drive);
  sh.curve = cu;
  sh.connect(dest);
  return sh;
}
/** A short exponentially decaying stereo noise impulse response. */
export function reverb(seconds: number, power: number, dest: AudioNode): ConvolverNode {
  const c = ctx(),
    n = Math.floor(c.sampleRate * seconds),
    ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, power);
  }
  const cv = c.createConvolver();
  cv.buffer = ir;
  cv.connect(dest);
  return cv;
}
export const mtof = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

function initAudio(): boolean {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  try {
    ac = new AC();
  } catch {
    ac = null;
    return false;
  }
  const c = ac;
  master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -9;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  comp.connect(master);
  const musLvl = gn(comp, 0.5);
  duck = gn(musLvl, 1);
  pump = gn(duck, 1);
  lpf = flt('lowpass', 900, 0.5, pump);
  musBus = gn(lpf, 1);
  sfxBus = gn(comp, 0.9); // ≈5 dB over the music bus
  NB = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = NB.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  rubG = gn(sfxBus, 0);
  rubF = flt('bandpass', 600, 1.3, rubG);
  noiseLoop(rubF);
  music.init();
  songT0 = c.currentTime + 0.08;
  nextT = songT0;
  step = 0;
  setInterval(sched, 25);
  return true;
}

function sched(): void {
  if (!ac || ac.state !== 'running') return;
  const now = ac.currentTime;
  if (nextT < now - 0.3) {
    const k = Math.ceil((now - nextT) / S16);
    nextT += k * S16;
    step = (step + k) % music.steps;
  }
  while (nextT < now + 0.12) {
    music.step(step, nextT + (step & 1 ? S16 * 0.13 : 0));
    nextT += S16;
    step = (step + 1) % music.steps;
  }
  music.tick?.(now);
}

export function setupAudio(m: Music): void {
  music = m;
  SPB = 60 / m.bpm;
  S16 = SPB / 4;
}
/** Start (or resume) audio. Must be called from a user gesture. */
export function startAudio(): void {
  if (!ac && !initAudio()) return;
  if (ac && ac.state !== 'running') ac.resume().catch(() => {});
  setSound(true);
}
export function setSound(on: boolean): void {
  soundOn = on;
  if (ac) master.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, 0.04);
}
export const soundIsOn = (): boolean => !!ac && soundOn;
export function suspend(hidden: boolean): void {
  if (!ac) return;
  if (hidden) ac.suspend();
  else if (soundOn) ac.resume().catch(() => {});
}
/** Beats since the song started (falls back to the animation clock while silent). */
export const beatNow = (T: number): number => (ac && ac.state === 'running' ? Math.max(0, (ac.currentTime - songT0) / SPB) : T / SPB);

/** Per-frame: layer levels, the low-pass that opens with the switch, the drag rub. */
export function audioFrame(p: number, speed: number): void {
  lev[0] = 1 - sst(0.12, 0.42, p);
  lev[1] = sst(0.08, 0.2, p) * (1 - 0.55 * sst(0.86, 0.95, p));
  lev[2] = sst(0.34, 0.44, p);
  lev[3] = sst(0.56, 0.68, p);
  lev[4] = sst(0.84, 0.9, p);
  if (!ac) return;
  const ct = ac.currentTime;
  lpf.frequency.setTargetAtTime(Math.min(18000, 900 * Math.pow(2, p * 5.2)), ct, 0.06);
  rubG.gain.setTargetAtTime(Math.min(0.2, speed * 0.1), ct, 0.03);
  rubF.frequency.setTargetAtTime(500 + Math.min(3200, speed * 1300), ct, 0.03);
  music.frame?.(p);
}

/** Duck the music bus to ~45 % around time t (door knocks, honks). */
export function duckAt(t: number, release: number = 0.11): void {
  duck.gain.setTargetAtTime(0.45, t, 0.008);
  duck.gain.setTargetAtTime(1, t + release, 0.12);
}
/** Sidechain-style pump on the music bus at time t. */
export function pumpAt(t: number, depth: number): void {
  pump.gain.setValueAtTime(1 - 0.55 * depth, t);
  pump.gain.linearRampToValueAtTime(1, t + 0.27);
}
