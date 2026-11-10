// No. 063 — music and switch sounds. 96 BPM, 4 bars in D: Dmaj7 · Bm7 · Gmaj7 · A7sus4.
import {
  ac, lev, live, musBus, sfxBus, duck, master,
  gn, flt, pan, env, osc, noise, tone, noiseLoop, saturator, reverb, mtof, duckAt, pumpAt,
  type Music,
} from '../../engine/audio';
import { sst } from '../../engine/math';

const BPM = 96,
  SPB = 60 / BPM,
  S16 = SPB / 4;
const CHD = [[50, 54, 57, 61], [54, 57, 59, 62], [55, 59, 62, 66], [57, 62, 64, 67]],
  RT = [38, 35, 43, 45];
const MEL: Record<number, readonly number[]> = {};
for (const m of [[0, 78, 3], [4, 81, 2], [6, 78, 2], [8, 76, 4], [12, 74, 2], [14, 76, 2], [16, 78, 3], [20, 74, 2], [22, 71, 2], [24, 74, 4], [28, 78, 3], [32, 79, 3], [36, 83, 2], [38, 81, 2], [40, 79, 4], [44, 74, 2], [46, 79, 2], [48, 81, 3], [52, 79, 2], [54, 76, 2], [56, 74, 3], [59, 76, 2], [61, 69, 3]]) MEL[m[0]] = m;
const PENT = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88];

let windBus: GainNode, birdBus: GainNode, kalBus: GainNode, padBus: GainNode, tuneBus: GainNode, honkIn: GainNode;
let tuneO: OscillatorNode, tuneG: GainNode, brF: BiquadFilterNode, brG: GainNode;
let chimeNext = 0,
  birdNext = 0;
const A = (): AudioContext => ac as AudioContext;

// ── instruments
function kal(t: number, n: number, v: number) {
  const f = mtof(n + 12);
  tone('sine', f, t, 0.002, v, 0.6, kalBus);
  tone('sine', f * 5.9, t, 0.001, v * 0.22, 0.05, kalBus);
  const g = gn(kalBus, 0);
  env(g, t, 0.001, v * 0.25, 0.012);
  noise(t, 0.03, flt('bandpass', 3200, 1.5, g));
}
function kick(t: number, v: number) {
  const g = gn(musBus, 0);
  env(g, t, 0.002, v, 0.27);
  osc('sine', 140, t, 0.35, g).frequency.exponentialRampToValueAtTime(46, t + 0.11);
}
function rim(t: number, v: number) {
  tone('triangle', 820, t, 0.001, v, 0.035, musBus);
  const g = gn(musBus, 0);
  env(g, t, 0.001, v * 0.7, 0.05);
  noise(t, 0.08, flt('bandpass', 2400, 1.2, g));
}
function shaker(t: number, v: number, d: number) {
  const g = gn(musBus, 0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + d * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  noise(t, d + 0.03, flt('highpass', 5200, 0.7, g));
}
function clap(t: number, v: number) {
  const f = flt('bandpass', 1250, 1.1, musBus);
  for (let k = 0; k < 3; k++) {
    const g = gn(f, 0);
    env(g, t + k * 0.011, 0.001, v * (k === 2 ? 1 : 0.6), k === 2 ? 0.16 : 0.012);
    noise(t + k * 0.011, 0.2, g);
  }
}
function tamb(t: number, v: number) {
  const g = gn(musBus, 0);
  env(g, t, 0.001, v, 0.13);
  noise(t, 0.18, flt('highpass', 6500, 0.8, g));
  tone('square', 8200, t, 0.001, v * 0.05, 0.08, musBus);
}
function bass(t: number, n: number, v: number, d: number) {
  const f = mtof(n),
    g = gn(flt('lowpass', 420, 0.7, musBus), 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.012);
  g.gain.setValueAtTime(v * 0.8, t + d * 0.7);
  g.gain.linearRampToValueAtTime(0, t + d);
  osc('sine', f, t, d + 0.02, g);
  osc('triangle', f * 2, t, d + 0.02, gn(g, 0.35));
}
function sub(t: number, n: number, v: number, d: number) {
  const f = mtof(n),
    g = gn(musBus, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.01);
  g.gain.linearRampToValueAtTime(0, t + d);
  osc('sine', f, t, d + 0.02, g);
  osc('sine', f * 2, t, d + 0.02, gn(g, 0.3));
}
function pad(t: number, ch: readonly number[]) {
  const d = S16 * 16,
    g = gn(flt('lowpass', 1150, 0.5, padBus), 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 0.4);
  g.gain.setValueAtTime(1, t + d - 0.1);
  g.gain.linearRampToValueAtTime(0, t + d + 0.5);
  for (const n of ch) for (const dt of [-7, 7]) osc('sawtooth', mtof(n), t, d + 0.55, gn(g, 0.022)).detune.value = dt;
}
/** whistled tune: sine + breath noise, vibrato */
function tune(t: number, n: number, len: number) {
  const d = len * S16 * 0.92,
    f = mtof(n);
  tuneO.frequency.setValueAtTime(f, t);
  brF.frequency.setValueAtTime(f, t);
  for (const [prm, v] of [[tuneG.gain, 0.11], [brG.gain, 0.5]] as const) {
    prm.setValueAtTime(0, t);
    prm.linearRampToValueAtTime(v, t + 0.03);
    prm.linearRampToValueAtTime(v * 0.7, t + d - 0.04);
    prm.linearRampToValueAtTime(0, t + d);
  }
}

export const music: Music = {
  bpm: BPM,
  steps: 64,
  init() {
    const c = A();
    windBus = gn(duck, 0);
    birdBus = gn(duck, 0);
    kalBus = gn(musBus, 1);
    kalBus.connect(reverb(0.8, 3, gn(musBus, 0.42))); // short hollow reverb for the kalimba
    padBus = gn(musBus, 0);
    tuneBus = gn(musBus, 0);
    tuneG = gn(tuneBus, 0);
    tuneO = c.createOscillator();
    tuneO.type = 'sine';
    tuneO.frequency.value = 740;
    tuneO.connect(tuneG);
    tuneO.start();
    {
      const l = c.createOscillator();
      l.frequency.value = 5.2;
      const lg = c.createGain();
      lg.gain.value = 7;
      l.connect(lg);
      lg.connect(tuneO.frequency);
      l.start();
    }
    brG = gn(tuneBus, 0);
    brF = flt('bandpass', 740, 6, brG);
    noiseLoop(brF);
    // goose honk chain: soft saturation → pan toward the flock → straight to master
    honkIn = gn(saturator(2.2, pan(0.5, gn(master, 0.8))), 1);
    // winter wind: howling band-passed noise
    {
      const wg = gn(windBus, 0.2),
        wf = flt('bandpass', 520, 2.2, wg);
      noiseLoop(wf);
      const l = c.createOscillator();
      l.frequency.value = 0.11;
      const lf = c.createGain();
      lf.gain.value = 230;
      l.connect(lf);
      lf.connect(wf.frequency);
      const l2 = c.createOscillator();
      l2.frequency.value = 0.07;
      const lg = c.createGain();
      lg.gain.value = 0.1;
      l2.connect(lg);
      lg.connect(wg.gain);
      l.start();
      l2.start();
    }
    chimeNext = birdNext = c.currentTime + 0.4;
  },
  step(s, t) {
    const bar = s >> 4,
      st = s & 15,
      ch = CHD[bar],
      L1 = lev[1],
      L2 = lev[2],
      L4 = lev[4],
      lo = L2 * (1 - L4);
    if (L1 > 0.01 && !(st & 1)) {
      const k = st >> 1;
      kal(t, ch[[0, 2, 1, 3, 2, 3, 1, 2][k]] + (bar === 3 && k > 5 ? 12 : 0), L1 * (k & 1 ? 0.11 : 0.16));
      if (st === 0) kal(t, ch[0] - 12, L1 * 0.11);
    }
    if (lo > 0.01) {
      if (st === 0 || st === 10 || (st === 6 && bar & 1)) kick(t, lo * 0.75);
      if (st === 4 || st === 12) rim(t, lo * 0.3);
      if (!(st & 1)) shaker(t, lo * (st % 4 === 2 ? 0.13 : 0.08), 0.06);
      else shaker(t, lo * 0.04, 0.04);
      if (st === 0) bass(t, RT[bar], lo * 0.42, S16 * 5);
      if (st === 6) bass(t, RT[bar], lo * 0.32, S16 * 2);
      if (st === 10) bass(t, RT[bar] + 7, lo * 0.36, S16 * 3);
      if (st === 14 && bar === 3) bass(t, RT[bar] + 12, lo * 0.3, S16 * 2);
    }
    if (st === 0) pad(t, ch);
    const m = MEL[s];
    if (m) tune(t, m[1], m[2]);
    if (L4 > 0.01) {
      if (st % 4 === 0) {
        kick(t, L4 * 0.95);
        pumpAt(t, L4);
      }
      if (st === 4 || st === 12) clap(t, L4 * 0.38);
      if (st % 4 === 2) tamb(t, L4 * 0.2);
      else if (st & 1) shaker(t, L4 * 0.06, 0.04);
      if (st % 4 === 2) sub(t, RT[bar] + 12, L4 * 0.5, S16 * 1.7);
      if (st % 4 === 3) sub(t, RT[bar] + 12, L4 * 0.38, S16 * 0.9);
    }
  },
  tick(now) {
    if (chimeNext < now) chimeNext = now + 0.05; // ice chimes in the wind
    while (chimeNext < now + 0.2) {
      const f = mtof(PENT[5 + ((Math.random() * 7) | 0)] + 12);
      tone('sine', f, chimeNext, 0.002, 0.035, 1.1, pan(Math.random() * 1.6 - 0.8, windBus));
      tone('sine', f * 2.76, chimeNext, 0.002, 0.012, 0.3, windBus);
      chimeNext += 0.5 + Math.random() * 1.4;
    }
    if (birdNext < now) birdNext = now + 0.05; // spring birdsong
    while (birdNext < now + 0.2) {
      const k = 2 + ((Math.random() * 3) | 0),
        f0 = 2400 + Math.random() * 1500,
        d = pan(Math.random() * 1.6 - 0.8, birdBus);
      for (let j = 0; j < k; j++) {
        const tt = birdNext + j * 0.11,
          o = tone('sine', f0, tt, 0.01, 0.05, 0.07, d);
        o.frequency.exponentialRampToValueAtTime(f0 * 1.5, tt + 0.04);
        o.frequency.exponentialRampToValueAtTime(f0 * 1.15, tt + 0.09);
      }
      birdNext += 0.7 + Math.random() * 1.8;
    }
  },
  frame(p) {
    const ct = A().currentTime;
    windBus.gain.setTargetAtTime(lev[0] * 0.9, ct, 0.08);
    birdBus.gain.setTargetAtTime(sst(0.42, 0.7, p) * 0.8 * (1 - 0.5 * lev[4]), ct, 0.08);
    padBus.gain.setTargetAtTime(lev[3] * (1 - 0.3 * lev[4]), ct, 0.08);
    tuneBus.gain.setTargetAtTime(lev[3], ct, 0.08);
  },
  grab() {
    if (!live()) return;
    const t = A().currentTime;
    for (const q of [[2637, 0.14, 0.45], [7278, 0.06, 0.2], [11900, 0.025, 0.09]]) tone('sine', q[0], t, 0.002, q[1], q[2], sfxBus);
    tone('sine', 190, t, 0.006, 0.3, 0.11, sfxBus).frequency.exponentialRampToValueAtTime(440, t + 0.075);
  },
  release() {
    if (!live()) return;
    const t = A().currentTime;
    tone('sine', 430, t, 0.004, 0.32, 0.13, sfxBus).frequency.exponentialRampToValueAtTime(150, t + 0.1);
  },
};

export const sfx = {
  /** an icicle falls (pentatonic drop) or freezes back (soft, low) */
  drip(i: number, on: boolean) {
    if (!live()) return;
    const t = A().currentTime,
      f = mtof(PENT[i]);
    if (on) {
      tone('sine', f * 1.6, t, 0.002, 0.24, 0.32, sfxBus).frequency.exponentialRampToValueAtTime(f, t + 0.03);
      tone('sine', f * 2, t, 0.002, 0.06, 0.12, sfxBus);
    } else {
      tone('triangle', f * 0.5, t, 0.003, 0.06, 0.4, sfxBus);
      const g = gn(sfxBus, 0);
      env(g, t, 0.001, 0.07, 0.03);
      noise(t, 0.05, flt('highpass', 5000, 0.7, g));
    }
  },
  /** the stove latch's double click */
  latch() {
    if (!live()) return;
    const t = A().currentTime;
    for (const d of [0, 0.075]) {
      const g = gn(sfxBus, 0);
      env(g, t + d, 0.001, 0.34, 0.012);
      noise(t + d, 0.04, flt('highpass', 2600, 0.7, g));
      tone('sine', 150, t + d, 0.001, 0.18, 0.04, sfxBus);
    }
  },
  /** the waking bear's yawn (formant-filtered saw) */
  yawn() {
    if (!live()) return;
    const c = A(),
      t = c.currentTime,
      g = gn(sfxBus, 0),
      o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(170, t);
    o.frequency.linearRampToValueAtTime(330, t + 0.22);
    o.frequency.linearRampToValueAtTime(190, t + 0.6);
    o.connect(flt('bandpass', 700, 3, g));
    o.connect(flt('bandpass', 1150, 4, g));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.12);
    g.gain.setValueAtTime(0.5, t + 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.65);
    o.start(t);
    o.stop(t + 0.7);
  },
  /** the pond ice cracking */
  crack() {
    if (!live()) return;
    const t = A().currentTime;
    [0, 0.09, 0.21].forEach((d, k) => {
      const g = gn(sfxBus, 0);
      env(g, t + d, 0.001, k ? 0.2 : 0.4, 0.03);
      noise(t + d, 0.06, flt('bandpass', 2600 + k * 900, 1, g));
    });
    tone('sine', 150, t, 0.003, 0.4, 0.2, sfxBus).frequency.exponentialRampToValueAtTime(62, t + 0.16);
  },
  /** slide whistle + soft thump: the snowman's hat falls */
  slide() {
    if (!live()) return;
    const t = A().currentTime;
    tone('sine', 920, t, 0.01, 0.2, 0.36, sfxBus).frequency.exponentialRampToValueAtTime(260, t + 0.34);
    const g = gn(sfxBus, 0);
    env(g, t + 0.34, 0.004, 0.2, 0.18);
    const f = flt('lowpass', 2400, 0.7, g);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    noise(t + 0.34, 0.25, f);
  },
  /** riser + crash into the festival */
  riser() {
    if (!live()) return;
    const t = A().currentTime,
      g = gn(sfxBus, 0),
      f = flt('bandpass', 300, 3, g);
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(7000, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.48);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.54);
    noise(t, 0.6, f);
    tone('sawtooth', 180, t, 0.4, 0.07, 0.14, sfxBus).frequency.exponentialRampToValueAtTime(1400, t + 0.5);
    const cr = gn(sfxBus, 0);
    env(cr, t + 0.5, 0.002, 0.42, 1.3);
    noise(t + 0.5, 1.5, flt('highpass', 3600, 0.6, cr));
  },
  /** record brake when dragged back out of the festival */
  brake() {
    if (!live()) return;
    const t = A().currentTime,
      g = gn(flt('lowpass', 1300, 1, sfxBus), 0);
    osc('sawtooth', 330, t, 0.7, g).frequency.exponentialRampToValueAtTime(32, t + 0.6);
    g.gain.setValueAtTime(0.26, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.62);
    const n = gn(sfxBus, 0);
    env(n, t, 0.004, 0.2, 0.3);
    const f = flt('bandpass', 1800, 2, n);
    f.frequency.exponentialRampToValueAtTime(260, t + 0.4);
    noise(t, 0.5, f);
  },
  /** the geese land on the pond: splash + two quacks */
  land() {
    if (!live()) return;
    const c = A(),
      t = c.currentTime,
      g = gn(sfxBus, 0);
    env(g, t, 0.005, 0.4, 0.4);
    const f = flt('lowpass', 3000, 0.7, g);
    f.frequency.exponentialRampToValueAtTime(400, t + 0.4);
    noise(t, 0.5, f);
    for (const d of [0.18, 0.34]) {
      const q = gn(sfxBus, 0);
      env(q, t + d, 0.006, 0.4, 0.09);
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(560, t + d);
      o.frequency.exponentialRampToValueAtTime(430, t + d + 0.1);
      o.connect(flt('bandpass', 1500, 3, q));
      o.start(t + d);
      o.stop(t + d + 0.14);
    }
  },
  /** three nasal “ha-onk” calls 0.27 s apart, panned toward the flock */
  honk() {
    if (!live()) return;
    const c = A(),
      t0 = c.currentTime + 0.01;
    for (let k = 0; k < 3; k++) {
      const t = t0 + k * 0.27,
        g = gn(honkIn, 0),
        o = c.createOscillator(),
        l = c.createOscillator(),
        lg = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(410, t + 0.035);
      o.frequency.exponentialRampToValueAtTime(330, t + 0.19);
      o.connect(flt('bandpass', 780, 3, g));
      o.connect(flt('bandpass', 1550, 4, g));
      o.connect(flt('lowpass', 420, 0.7, gn(g, 0.5)));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1.5, t + 0.02);
      g.gain.setValueAtTime(1.3, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      l.frequency.value = 58;
      lg.gain.value = 0.45;
      l.connect(lg);
      lg.connect(g.gain);
      o.start(t);
      l.start(t);
      o.stop(t + 0.25);
      l.stop(t + 0.25);
      duckAt(t, 0.12); // music ducks to ~45 %
    }
  },
};
