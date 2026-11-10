// No. 062 — music and switch sounds. 100 BPM, 4 bars in F: Fmaj7 · Am7 · Dm7 · B♭maj7.
import {
  ac, lev, live, musBus, sfxBus, duck, master,
  gn, flt, pan, env, osc, noise, tone, noiseLoop, saturator, reverb, mtof, duckAt, pumpAt,
  type Music,
} from '../../engine/audio';

const BPM = 100,
  SPB = 60 / BPM,
  S16 = SPB / 4;
const CHD = [[53, 57, 60, 64], [57, 60, 64, 67], [57, 60, 62, 65], [58, 62, 65, 69]],
  RT = [41, 45, 38, 34];
const MEL: Record<number, readonly number[]> = {};
for (const m of [[0, 72, 3], [4, 69, 2], [6, 72, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2], [16, 76, 3], [20, 79, 2], [22, 76, 2], [24, 72, 4], [28, 69, 3], [32, 77, 3], [36, 76, 2], [38, 74, 2], [40, 69, 4], [44, 72, 2], [46, 74, 2], [48, 74, 3], [52, 77, 2], [54, 81, 2], [56, 79, 3], [59, 77, 2], [61, 72, 3]]) MEL[m[0]] = m;
const PENT = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91];

let ambBus: GainNode, mbBus: GainNode, padBus: GainNode, tuneBus: GainNode, knockIn: GainNode, tuneO: OscillatorNode, tuneG: GainNode;
const crk: { g: GainNode; next: number; v: number }[] = [];
const A = (): AudioContext => ac as AudioContext;

// ── instruments
function mbox(t: number, n: number, v: number) {
  const f = mtof(n + 12);
  tone('sine', f, t, 0.003, v, 0.95, mbBus);
  tone('sine', f * 2.76, t, 0.002, v * 0.28, 0.28, mbBus);
  tone('sine', f * 5.4, t, 0.002, v * 0.12, 0.1, mbBus);
}
function kick(t: number, v: number) {
  const g = gn(musBus, 0);
  env(g, t, 0.002, v, 0.27);
  osc('sine', 150, t, 0.35, g).frequency.exponentialRampToValueAtTime(48, t + 0.11);
}
function snare(t: number, v: number) {
  const g = gn(musBus, 0);
  env(g, t, 0.001, v, 0.16);
  noise(t, 0.22, flt('bandpass', 1900, 0.7, g));
  tone('triangle', 195, t, 0.001, v * 0.8, 0.1, musBus).frequency.exponentialRampToValueAtTime(150, t + 0.08);
}
function hat(t: number, v: number, d: number) {
  const g = gn(musBus, 0);
  env(g, t, 0.001, v, d);
  noise(t, d + 0.05, flt('highpass', 7200, 0.7, g));
}
function clap(t: number, v: number) {
  const f = flt('bandpass', 1250, 1.1, musBus);
  for (let k = 0; k < 3; k++) {
    const g = gn(f, 0);
    env(g, t + k * 0.011, 0.001, v * (k === 2 ? 1 : 0.6), k === 2 ? 0.16 : 0.012);
    noise(t + k * 0.011, 0.2, g);
  }
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
function tune(t: number, n: number, len: number) {
  const d = len * S16 * 0.92,
    g = tuneG.gain;
  tuneO.frequency.setValueAtTime(mtof(n), t);
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(0.07, t + 0.015);
  g.linearRampToValueAtTime(0.045, t + d - 0.03);
  g.linearRampToValueAtTime(0, t + d);
}

export const music: Music = {
  bpm: BPM,
  steps: 64,
  init() {
    const c = A();
    ambBus = gn(duck, 0);
    mbBus = gn(musBus, 1);
    mbBus.connect(reverb(0.75, 3.2, gn(musBus, 0.4))); // short room reverb for the music box
    padBus = gn(musBus, 0);
    tuneBus = gn(musBus, 0);
    // square-wave tune with vibrato
    tuneG = gn(flt('lowpass', 2300, 0.6, tuneBus), 0);
    tuneO = c.createOscillator();
    tuneO.type = 'square';
    tuneO.frequency.value = 523;
    tuneO.connect(tuneG);
    tuneO.start();
    {
      const l = c.createOscillator();
      l.frequency.value = 5.6;
      const lg = c.createGain();
      lg.gain.value = 4.5;
      l.connect(lg);
      lg.connect(tuneO.frequency);
      l.start();
    }
    // door knock chain: soft saturation → pan toward the door → straight to master
    knockIn = gn(saturator(2, pan(0.55, gn(master, 0.95))), 1);
    // crickets: AM-chirped sine trains
    for (let k = 0; k < 3; k++) {
      const o = c.createOscillator();
      o.frequency.value = 4150 + k * 370;
      const g = c.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(pan([-0.6, 0.5, 0][k], ambBus));
      o.start();
      crk.push({ g, next: c.currentTime + 0.3 + k * 0.37, v: [0.05, 0.04, 0.03][k] });
    }
    // soft wind
    {
      const wg = gn(ambBus, 0.11),
        wf = flt('lowpass', 420, 0.8, wg);
      noiseLoop(wf);
      const l = c.createOscillator();
      l.frequency.value = 0.13;
      const lg = c.createGain();
      lg.gain.value = 0.06;
      l.connect(lg);
      lg.connect(wg.gain);
      const lf = c.createGain();
      lf.gain.value = 160;
      l.connect(lf);
      lf.connect(wf.frequency);
      l.start();
    }
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
      mbox(t, ch[[0, 1, 2, 3, 2, 1, 2, 3][k]] + (bar === 3 && k > 5 ? 12 : 0), L1 * (k & 1 ? 0.1 : 0.15));
      if (st === 0) mbox(t, ch[0] - 12, L1 * 0.1);
    }
    if (lo > 0.01) {
      if (st === 0 || st === 10 || (st === 7 && bar & 1)) kick(t, lo * 0.8);
      if (st === 4 || st === 12) snare(t, lo * 0.32);
      if (!(st & 1)) hat(t, lo * (st % 4 === 2 ? 0.16 : 0.09), 0.04);
      else if (st % 4 === 3) hat(t, lo * 0.05, 0.03);
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
      if (st % 4 === 2) hat(t, L4 * 0.2, 0.2);
      else if (st & 1) hat(t, L4 * 0.07, 0.03);
      if (st % 4 === 2) sub(t, RT[bar] + 12, L4 * 0.5, S16 * 1.7);
      if (st % 4 === 3) sub(t, RT[bar] + 12, L4 * 0.38, S16 * 0.9);
    }
  },
  tick(now) {
    for (const c of crk) {
      if (c.next < now) c.next = now + 0.05;
      while (c.next < now + 0.2) {
        const n = 3 + ((Math.random() * 2) | 0);
        for (let j = 0; j < n; j++) {
          const tt = c.next + j * 0.043;
          c.g.gain.setValueAtTime(0, tt);
          c.g.gain.linearRampToValueAtTime(c.v, tt + 0.008);
          c.g.gain.linearRampToValueAtTime(0, tt + 0.03);
        }
        c.next += 0.5 + Math.random() * 0.55 + (Math.random() < 0.15 ? 1.2 : 0);
      }
    }
  },
  frame() {
    const ct = A().currentTime;
    ambBus.gain.setTargetAtTime(lev[0] * 0.85, ct, 0.08);
    padBus.gain.setTargetAtTime(lev[3] * (1 - 0.3 * lev[4]), ct, 0.08);
    tuneBus.gain.setTargetAtTime(lev[3], ct, 0.08);
  },
  grab() {
    if (!live()) return;
    const t = A().currentTime;
    for (const q of [[2093, 0.15, 0.5], [5777, 0.06, 0.22], [11302, 0.025, 0.1]]) tone('sine', q[0], t, 0.002, q[1], q[2], sfxBus);
    tone('sine', 190, t, 0.006, 0.3, 0.11, sfxBus).frequency.exponentialRampToValueAtTime(440, t + 0.075);
  },
  release() {
    if (!live()) return;
    const t = A().currentTime;
    tone('sine', 430, t, 0.004, 0.32, 0.13, sfxBus).frequency.exponentialRampToValueAtTime(150, t + 0.1);
  },
};

export const sfx = {
  /** a bulb lights (pentatonic pluck) or goes out (soft, low) */
  pluck(i: number, on: boolean) {
    if (!live()) return;
    const t = A().currentTime,
      f = mtof(PENT[i]) * (on ? 1 : 0.5);
    tone('triangle', f, t, 0.002, on ? 0.2 : 0.07, on ? 0.42 : 0.5, sfxBus);
    if (on) tone('sine', f * 2, t, 0.002, 0.07, 0.16, sfxBus);
  },
  /** the lamp's double click */
  lamp() {
    if (!live()) return;
    const t = A().currentTime;
    for (const d of [0, 0.075]) {
      const g = gn(sfxBus, 0);
      env(g, t + d, 0.001, 0.34, 0.012);
      noise(t + d, 0.04, flt('highpass', 2600, 0.7, g));
      tone('sine', 150, t + d, 0.001, 0.18, 0.04, sfxBus);
    }
  },
  /** the waking cat's “mrrp” (formant-filtered saw) */
  mrrp() {
    if (!live()) return;
    const c = A(),
      t = c.currentTime,
      tr = gn(sfxBus, 0.62),
      g = gn(tr, 0),
      o = c.createOscillator(),
      l = c.createOscillator(),
      lg = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(300, t);
    o.frequency.linearRampToValueAtTime(545, t + 0.22);
    o.frequency.linearRampToValueAtTime(470, t + 0.36);
    o.connect(flt('bandpass', 900, 4, g));
    o.connect(flt('bandpass', 2100, 5, g));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.04);
    g.gain.setValueAtTime(0.55, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.38);
    l.frequency.value = 27;
    lg.gain.value = 0.36;
    l.connect(lg);
    lg.connect(tr.gain);
    o.start(t);
    l.start(t);
    o.stop(t + 0.42);
    l.stop(t + 0.42);
  },
  /** riser + crash into the party */
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
  /** record brake when dragged back out of the beat */
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
  /** the puppy's yip */
  yip() {
    if (!live()) return;
    const t = A().currentTime;
    [0, 0.17].forEach((d, k) => {
      const g = gn(flt('bandpass', 1650, 1.6, sfxBus), 0);
      env(g, t + d, 0.006, k ? 0.5 : 0.42, 0.1);
      const o = osc('sawtooth', 640, t + d, 0.16, g);
      o.frequency.exponentialRampToValueAtTime(1260, t + d + 0.045);
      o.frequency.exponentialRampToValueAtTime(880, t + d + 0.12);
    });
  },
  /** a real heavy door knock: three hits 0.25 s apart */
  knock() {
    if (!live()) return;
    const t0 = A().currentTime + 0.01;
    for (let k = 0; k < 3; k++) {
      const t = t0 + k * 0.25;
      let g = gn(knockIn, 0);
      osc('sine', 98, t, 0.42, g).frequency.exponentialRampToValueAtTime(60, t + 0.25); // deep thud
      env(g, t, 0.004, 1, 0.3);
      g = gn(knockIn, 0);
      osc('sine', 190, t, 0.2, g).frequency.exponentialRampToValueAtTime(128, t + 0.09); // fast harmonics
      env(g, t, 0.002, 0.7, 0.13);
      g = gn(knockIn, 0);
      osc('sine', 410, t, 0.1, g);
      env(g, t, 0.001, 0.42, 0.05);
      g = gn(knockIn, 0);
      env(g, t, 0.001, 0.9, 0.03);
      noise(t, 0.06, flt('bandpass', 1900, 2.2, g)); // knuckle click
      duckAt(t); // music ducks to ~45 %
    }
  },
};
