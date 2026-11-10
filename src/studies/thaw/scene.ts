// No. 063 — the hollow: two worlds (winter and spring) drawn every frame and dithered together at the knob.
import { clamp, lerp, sst } from '../../engine/math';
import { W, H, A, EM, OUTC, BAY, DK, mixc, put, fill, P, R, E, LN, ST, speck } from '../../engine/pixel';
import type { Frame } from '../../engine/switch';
import { sfx } from './music';

const FW = new Uint8ClampedArray(W * H * 3),
  FS = new Uint8ClampedArray(W * H * 3); // lit winter / spring worlds

// ── state, written by update()
let p = 0,
  T = 0,
  beat = 0,
  pulse = 0,
  bxn = -14,
  fx = 30,
  stoveOn = false,
  stoveA = 0,
  party = 0,
  inA = 0,
  waiting = false,
  shake = 0,
  boom = false;
let bearX = 110,
  bearDir = 1,
  walkPh = 0,
  bearSt = 0,
  bearTgt = 110,
  bearHead: [number, number] = [110, 33],
  flock: [number, number] = [150, 7];
let partyOn = false,
  entered = false,
  awake = false,
  kt = 0.6,
  ck1 = false,
  ck2 = false,
  hatDown = false;
const lit: boolean[] = new Array(12).fill(false);
const glow: boolean[] = new Array(12).fill(false);
const dripT: number[] = new Array(12).fill(-9);
const hits: number[] = [];

/** thaw progress of something at x: starts under the glass, completes behind it */
const prog = (x: number, span: number): number => clamp((fx - x) / span, 0, 1);
const wireY = (x: number): number => {
  const f = ((x + 2) % 29.7) / 29.7;
  return Math.round(12 * f * (1 - f));
};
const BX: number[] = [],
  BY: number[] = [];
for (let i = 0; i < 12; i++) {
  BX[i] = Math.round(10 + i * 13.9);
  BY[i] = wireY(BX[i]) + 1;
}
const BC = [0xff6b6b, 0xffd23f, 0x6fe7b7, 0x6fa8ff, 0xff8fc8],
  BCR = BC.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
const BR = 0x9a623a,
  MZ = 0xe9c9a0,
  SNOW = 0xf5f9ff;
const mh1 = (x: number): number => Math.round(15 + 6 * Math.sin(x * 0.07 + 1) + 3 * Math.sin(x * 0.19)); // far range
const mh2 = (x: number): number => Math.round(28 + 3 * Math.sin(x * 0.05 + 2) + 1.5 * Math.sin(x * 0.13)); // near hills
const GY = 35;
const FLOWERS = [[12, 47, 0xb48cff], [24, 46, 0xffd23f], [36, 47, 0xff6b6b], [45, 45, 0xff6b6b], [51, 48, 0xffd23f], [59, 47, 0xb48cff], [103, 48, 0xff8fc8], [122, 45, 0xffd23f], [126, 48, 0xff6b6b], [136, 47, 0xb48cff], [149, 45, 0xffffff], [155, 48, 0xff8fc8], [160, 44, 0xffd23f]];
const TIPS = [[136, 19], [149, 17], [142, 13], [153, 23], [131, 24], [139, 15], [146, 21]];
const inPond = (x: number, y: number): boolean => {
  const dx = (x - 81) / 18.4,
    dy = (y - 43) / 3.4;
  return dx * dx + dy * dy <= 1;
};

function sky(sp: boolean): void {
  let top: number, bot: number;
  if (sp) {
    const c = sst(0.3, 0.72, p);
    top = mixc(0xb7a3cc, 0x4fa9ee, c);
    bot = mixc(0xffdcc6, 0xcdeefc, c);
  } else {
    const c = sst(0.3, 0.95, p) * 0.7;
    top = mixc(0x101c38, 0x55678a, c);
    bot = mixc(0x3d5884, 0xa9bad2, c);
  }
  for (let y = 0; y < GY; y++)
    for (let x = 0; x < W; x++) {
      const f = clamp(y / 33 + (BAY[(y & 3) * 4 + (x & 3)] - 0.5) * 0.14, 0, 1);
      put(x, y, mixc(top, bot, Math.round(f * 6) / 6), 1);
    }
  if (!sp) {
    // stars + aurora
    const a = 1 - sst(0.1, 0.55, p);
    for (let k = 0; k < 16; k++) {
      const sx = (k * 47 + 13) % 176,
        sy = 1 + ((k * 5) % 9),
        tw = Math.sin(T * (1.2 + k * 0.31) + k * 2);
      if (a > 0.25 + (k % 4) * 0.15 && tw > -0.5) put(sx, sy, tw > 0.6 ? 0xffffff : 0xaab8ee, 1);
    }
    if (a > 0.02)
      for (let x = 0; x < W; x++) {
        const y0 = 7 + 3 * Math.sin(x * 0.06 + T * 0.3) + 2 * Math.sin(x * 0.15 - T * 0.22);
        for (let d = 0; d < 7; d++) {
          const y = Math.round(y0) + d;
          if (y >= 0 && BAY[(y & 3) * 4 + (x & 3)] < (1 - d / 7) * a * (0.55 + 0.35 * Math.sin(x * 0.11 + T * 0.7))) put(x, y, mixc(0x7dffc8, 0x4f9dff, d / 6), 1);
        }
      }
  } else {
    // sun, clouds, rainbow
    const rise = sst(0.12, 0.8, p),
      sx = 84 + rise * 8,
      sy = 31 - rise * 22,
      sc = mixc(0xffb98a, 0xfff1a0, sst(0.3, 0.7, p));
    for (let dy = -5; dy <= 5; dy++)
      for (let dx = -5; dx <= 5; dx++) {
        const d = dx * dx + dy * dy,
          x = Math.round(sx + dx),
          y = Math.round(sy + dy);
        if (d <= 11) put(x, y, d <= 4 ? mixc(sc, 0xffffff, 0.4) : sc, 1);
        else if (d <= 24 && (dx + dy) & 1 && Math.sin(T * 2 + dx * 1.3) > -0.2) put(x, y, mixc(sc, 0xffffff, 0.5), 1);
      }
    if (party > 0.02)
      for (let k = 0; k < 5; k++) {
        const r = 31 - k,
          c = [0xff6b6b, 0xffb04a, 0xffe66b, 0x6fe7b7, 0x6fa8ff][k];
        for (let an = 0; an <= 3.1416; an += 0.012) {
          const x = Math.round(88 - Math.cos(an) * r * 1.9),
            y = Math.round(36 - Math.sin(an) * r);
          if (y >= 0 && y < GY && BAY[(y & 3) * 4 + (x & 3)] < party * 0.85) put(x, y, c, 1);
        }
      }
    const ca = sst(0.25, 0.5, p);
    if (ca > 0)
      for (let k = 0; k < 4; k++) {
        const cx = ((T * 1.4 + k * 51) % 200) - 12,
          cy = 3 + ((k * 3) % 9),
          half = ca < 0.7;
        for (let dx = -5; dx <= 5; dx++) {
          if (half && dx & 1) continue;
          if (Math.abs(dx) <= 3) put(cx + dx, cy, 0xffffff, 1);
          put(cx + dx, cy + 1, Math.abs(dx) > 3 ? 0xffffff : 0xe4f0fb, 1);
          if (Math.abs(dx) <= 1) put(cx + dx + 1, cy - 1, 0xffffff, 1);
        }
      }
  }
}
function land(sp: boolean): void {
  for (let x = 0; x < W; x++) {
    const t1 = mh1(x),
      t2 = mh2(x),
      shade = mh1(x + 2) > mh1(x - 2);
    for (let y = t1; y < t2; y++) {
      let c: number;
      const d = y - t1;
      if (sp) {
        c = shade ? 0x7388b8 : 0x90a8d0;
        if (d < (14 - t1) * 0.7) c = shade ? 0xdfe8f8 : 0xffffff;
        else if (y > 23) c = mixc(c, 0x7fbf8e, 0.55);
      } else {
        c = shade ? 0x93a6d2 : 0xc3d2ee;
        if (d > 7) c = mixc(c, 0x7f93c4, 0.35);
      }
      put(x, y, c, 0);
    }
    for (let y = t2; y < GY; y++) put(x, y, sp ? (y === t2 ? 0x8fdc78 : 0x6dbb6a) : y === t2 ? 0xffffff : 0xe3ebfa);
  }
  for (let x = 3; x < W; x += 7) {
    // little pines on the hills
    const tx = x + ((x * 5) % 3),
      ty = mh2(tx) + 1 + ((x * 3) % 3),
      c = sp ? 0x3f8f5a : 0x2f5d50;
    put(tx, ty - 3, sp ? c : 0xffffff);
    fill(tx - 1, ty - 2, 3, 1, c);
    fill(tx - 1, ty - 1, 3, 1, mixc(c, 0x102030, 0.25));
    if (!sp) put(tx - 1, ty - 2, 0xe8f0ff);
  }
  for (let y = GY; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c: number;
      if (sp) {
        c = 0x7fd06c;
        if ((x * 5 + y * 3) % 13 === 0) c = 0x5fb85c;
        else if ((x * 7 + y * 11) % 29 === 0) c = 0xb2ec92;
        if (y === GY) c = 0x9be283;
      } else {
        c = 0xf3f7ff;
        if ((x * 3 + y * 5) % 11 === 0) c = 0xd9e4f6;
        else if (y === GY) c = 0xffffff;
        else if (y > 46 && (x + y) & 1) c = 0xe2eaf9;
      }
      put(x, y, c, 0);
    }
  for (let y = 37; y < 44; y++) {
    // the path from the door
    const x0 = 20 + (y - 37) * 3;
    for (let x = x0; x < x0 + 6; x++) if ((x + y * 3) % 5) put(x, y, sp ? 0xcfa878 : 0xdde6f6);
  }
}
function pine(sp: boolean): void {
  const g = sp ? 0x3a9a62 : 0x2f6f5a;
  R(5, 34, 2, 4, 0x6b4a3a);
  for (let t = 2; t >= 0; t--) {
    const ty = 12 + t * 6;
    for (let r = 0; r < 8; r++) {
      const hw = Math.round(0.6 + r * 0.62 + t * 0.6);
      R(6 - hw, ty + r, hw * 2 + 1, 1, !sp && r < 2 + (t === 0 ? 1 : 0) ? SNOW : g);
    }
  }
  if (!sp) {
    P(3, 22, SNOW);
    P(9, 27, SNOW);
    P(2, 28, SNOW);
  }
  ST();
}
function cabin(sp: boolean): void {
  // smoke from the stove
  const sm = 1 - sst(0.5, 0.8, p);
  if (sm > 0.05)
    for (let k = 0; k < 4; k++) {
      const ph = (T * 0.22 + k / 4) % 1;
      if (ph * 0.9 > sm) continue;
      const r = 1 + ph * 1.8;
      E(32.5 + ph * 7 + Math.sin(ph * 5 + k) * 1.5, 11 - ph * 12, r, r * 0.8, sp ? 0xffffff : 0xc5cfe2);
    }
  ST({ ol: null, sh: false });
  R(31, 12, 3, 7, 0x9a4a3a);
  if (!sp) R(30, 11, 5, 1, SNOW);
  ST();
  R(16, 25, 22, 12, 0xb06f3f);
  ST();
  for (const y of [28, 31, 34]) fill(16, y, 22, 1, 0x8f562f);
  for (let j = 0; j < 7; j++) {
    const xo = Math.round(j * 0.75);
    R(17 - xo, 18 + j, 21 + 2 * xo, 1, sp ? (j & 1 ? 0xb04832 : 0xc8553d) : j === 6 ? 0xcfdcf2 : SNOW);
  }
  ST();
  if (sp) {
    for (let x = 14; x < 41; x += 3) put(x + ((x >> 1) & 1), 21 + ((x * 3) % 3), 0x9a3d2c);
    put(20, 19, 0x6dbb6a);
    put(21, 19, 0x6dbb6a);
    put(35, 22, 0x6dbb6a);
  } else
    for (const q of [[13, 3], [15, 2], [26, 2], [40, 3], [42, 2]]) // icicles off the eaves
      for (let j = 0; j < q[1]; j++) put(q[0], 25 + j, j === q[1] - 1 ? 0xaedcff : 0xe6f6ff);
  R(19, 29, 5, 8, 0x6b4226);
  ST();
  put(22, 33, 0xf7c948);
  R(27, 28, 7, 6, 0xf7ead0);
  ST();
  const winLit = !sp && stoveOn;
  fill(28, 29, 5, 4, sp ? 0x9fd8f5 : winLit ? 0xffd27a : 0x2a3a5a, winLit ? 1 : 0);
  fill(30, 29, 1, 4, 0xf7ead0);
  fill(28, 31, 5, 1, 0xf7ead0);
  if (sp) {
    fill(27, 34, 7, 1, 0x8a552b);
    put(28, 33, 0xff8fc8);
    put(30, 33, 0xffd23f);
    put(32, 33, 0xff8fc8);
  }
  fill(25, 28, 1, 6, 0xffffff); // thermometer
  const th = Math.round(1 + p * 5);
  fill(25, 34 - th, 1, th, 0xe24a4a);
  put(25, 34, 0xe24a4a);
  if (!sp) for (let x = 15; x < 39; x++) if ((x * 3) % 4) put(x, 36, SNOW);
}
function gramophone(sp: boolean): void {
  R(43, 37, 6, 3, 0x8a5a3a);
  R(43, 37, 6, 1, 0xc99a66);
  if (!sp) R(43, 36, 6, 1, SNOW);
  ST();
  R(44, 34, 4, 3, 0x2f8f8a);
  ST();
  put(46, 35, 0xf7c948);
  const th = boom ? pulse * 1.1 : 0;
  LN(46, 33, 47, 30, 0xd9a441);
  E(49, 28, 2.3 + th, 2.7 + th, 0xf2c14e);
  ST();
  put(49, 28, 0x8a5a2a);
  put(50, 28, 0x8a5a2a);
  put(49, 29, 0x8a5a2a);
}
function snowman(sp: boolean): void {
  const m = sp ? prog(56, 30) : 0,
    s = 1 - m,
    by = 41;
  if (m > 0.45) {
    E(56, 42, 3 + m * 2, 1.2, 0x7fc4f0);
    ST();
  }
  const r1 = 3.6 * s,
    r2 = 2.6 * s,
    r3 = 2 * s,
    w = 0.4 + 0.6 * s;
  E(56, by - r1, 3.6 * w, r1, SNOW);
  E(56, by - 2 * r1 - r2 + 1, 2.6 * w, r2, SNOW);
  const hy = by - 2 * r1 - 2 * r2 - r3 + 2;
  E(56, hy, 2 * w, r3, SNOW);
  if (s > 0.3) {
    LN(53, by - 2 * r1 - r2 + 1, 50, by - 2 * r1 - r2 - 1, 0x6b4a3a);
    LN(59, by - 2 * r1 - r2 + 1, 62, by - 2 * r1 - r2 - 2, 0x6b4a3a);
  }
  const ty = Math.round(Math.min(41, hy - r3));
  R(54, ty, 5, 1, 0x33263a);
  R(55, ty - 2, 3, 2, 0x33263a);
  ST();
  put(55, ty - 1, 0xe24a4a);
  put(56, ty - 1, 0xe24a4a);
  put(57, ty - 1, 0xe24a4a);
  if (s > 0.4) {
    put(55, hy, DK);
    put(57, hy, DK);
    put(58, Math.round(hy) + 1, 0xff8a3a);
    fill(54, Math.round(hy + r3), 5, 1, 0xe24a4a);
    put(56, Math.round(by - 2 * r1 - r2 + 1), DK);
  } else put(60, 42, 0xff8a3a);
}
function pond(sp: boolean): void {
  E(81, 43, 19, 4, sp ? 0x4fa8e8 : 0xcfeafa);
  ST();
  if (sp) {
    for (let k = 0; k < 9; k++) {
      const x = 63 + ((k * 13 + T * 3.2) % 36),
        y = 40 + ((k * 2) % 7);
      for (let d = 0; d < 3; d++) if (inPond(x + d, y)) put(x + d, y, 0x9fd8fa);
    }
    for (const fxp of [66, 74, 82, 90, 97]) {
      // ice floes, still drifting just behind the thaw
      const d = fx - fxp;
      if (d > 2 && d < 34) {
        const b = Math.round(Math.sin(T * 2 + fxp) * 0.6),
          yy = 41 + (fxp % 5) + b;
        if (inPond(fxp, yy) && inPond(fxp + 2, yy)) {
          fill(fxp, yy, 3, 1, 0xffffff);
          put(fxp + 1, yy + 1, 0xbfe3f7);
        }
      }
    }
    const lp = prog(70, 40);
    if (lp > 0.5) {
      // lily pads
      E(70, 44, 2.6, 1, 0x4fae5a);
      E(92, 45, 2, 0.8, 0x4fae5a);
      ST({ sh: false });
      put(93, 44, 0xff8fc8);
    }
    if (lp > 0.8) {
      // the frog hops on the beat at the festival
      const hop = party > 0.5 && pulse > 0.5 ? -2 : 0;
      E(70, 42 + hop, 1.7, 1.4, 0x7fd65a);
      ST();
      put(69, 41 + hop, DK);
      put(71, 41 + hop, DK);
    }
    if (party > 0.3)
      for (let k = 0; k < 6; k++) {
        const x = 64 + ((k * 29 + Math.floor(T * 5) * 7) % 34),
          y = 40 + ((k * 3) % 6);
        if (inPond(x, y)) put(x, y, 0xffffff, 1);
      }
  } else {
    for (let k = 0; k < 7; k++) {
      const x = 65 + k * 5,
        y = 40 + ((k * 3) % 6);
      for (let d = 0; d < 3; d++) if (inPond(x + d, y)) put(x + d, y, 0xffffff);
    }
    for (let x = 63; x < Math.min(100, fx + 12); x++) {
      // cracks running ahead of the thaw
      const y = 43 + ((x * 7) % 3) - 1 + (x > 80 ? 1 : 0);
      if (inPond(x, y) && x % 5) put(x, y, 0x5f8fc0);
      if (x % 9 === 4 && inPond(x, y - 2)) put(x, y - 1, 0x5f8fc0);
      if (x % 11 === 6 && inPond(x, y + 2)) put(x, y + 1, 0x5f8fc0);
    }
  }
}
function den(sp: boolean): void {
  E(110, 37, 11, 7, sp ? 0x69bd62 : 0xeef3ff);
  if (!sp) speck(0xd5e0f5, 9, 3);
  else {
    speck(0x58a856, 11, 2);
    speck(0xffe66b, 31, 7);
    speck(0xff8fc8, 37, 5);
  }
  ST();
  E(110, 37.5, 4.2, 3.2, 0x2a1f2e);
  ST({ ol: null, sh: false });
}
function tree(sp: boolean): void {
  R(141, 27, 3, 11, 0x6b4a3a);
  P(140, 37, 0x6b4a3a);
  P(144, 37, 0x6b4a3a);
  LN(142, 27, 136, 19, 0x6b4a3a);
  LN(142, 26, 149, 17, 0x6b4a3a);
  LN(142, 24, 142, 13, 0x6b4a3a);
  LN(143, 29, 153, 23, 0x6b4a3a);
  LN(141, 29, 131, 24, 0x6b4a3a);
  LN(140, 22, 139, 15, 0x6b4a3a);
  LN(146, 22, 146, 21, 0x6b4a3a);
  ST();
  if (!sp) {
    for (const t of TIPS) {
      put(t[0], t[1] - 1, SNOW);
      put(t[0] + (t[0] < 142 ? 1 : -1), t[1] - 1, SNOW);
    }
    put(141, 26, SNOW);
    put(143, 26, SNOW);
    return;
  }
  const b = prog(128, 36);
  if (b < 0.12) return;
  if (b < 0.4) {
    for (const t of TIPS) put(t[0], t[1], 0xff9cc8); // buds
    return;
  }
  const q = sst(0.4, 1, b);
  TIPS.forEach((t, k) => E(t[0], t[1] - 1, q * (5.6 + (k % 3) * 0.7), q * (3.9 + (k % 2) * 0.6), k & 1 ? 0xffb7d5 : 0xff9cc8));
  E(142, 17, q * 8.5, q * 5, 0xffc4dd);
  speck(0xffe3ef, 5, 1);
  speck(0xf07fb0, 7, 4);
  speck(0x8fd67a, 23, 9);
  ST();
}
function stoneLantern(sp: boolean): void {
  R(165, 39, 5, 2, 0x9aa0aa);
  R(166, 34, 3, 5, 0x9aa0aa);
  R(165, 30, 5, 4, 0xaab0ba);
  R(164, 28, 7, 2, 0x8a909a);
  R(166, 27, 3, 1, sp ? 0x8a909a : SNOW);
  if (!sp) R(164, 27, 7, 1, SNOW);
  ST();
  const on = !sp || party > 0.4;
  fill(166, 31, 3, 2, on ? 0xffd27a : 0x4a4658, on ? 1 : 0);
}
function flowers(): void {
  for (const f of FLOWERS) {
    const g = clamp((fx - f[0] - 8) / 14, 0, 1);
    if (g <= 0) continue;
    const h = Math.max(1, Math.round(g * 3));
    for (let j = 0; j < h; j++) put(f[0], f[1] - j, 0x3d9950);
    put(f[0], f[1] - h, g > 0.6 ? f[2] : 0x8fd67a);
    if (g >= 1) {
      put(f[0] - 1, f[1] - h, mixc(f[2], 0xffffff, 0.45));
      put(f[0] + 1, f[1] - h, mixc(f[2], 0xffffff, 0.45));
      put(f[0] + 1, f[1] - 1, 0x5cc068);
    }
  }
}
function bearWalk(cx: number, dir: number): void {
  const ph = Math.floor(walkPh) & 1,
    hx = cx + 6 * dir;
  E(cx, 41, 5.5, 3, BR);
  E(hx, 39, 3, 2.8, BR);
  P(hx - 2, 36, BR);
  P(hx + 2, 36, BR);
  P(cx - 6 * dir, 40, BR);
  [-4, -2, 2, 4].forEach((o, i) => R(cx + o, 44, 1, 3 - ((i & 1) ^ ph), BR));
  ST();
  put(hx, 38, DK);
  put(hx + 2 * dir, 39, DK);
  put(hx + 2 * dir, 40, MZ);
  put(hx + dir, 40, MZ);
  bearHead = [hx, 35];
}
function bearDance(cx: number, ghost: number): void {
  const bob = pulse > 0.5 ? -1 : 0,
    arm = Math.floor(beat) & 1;
  E(cx, 39 + bob, 3.4, 4.8, BR);
  E(cx, 31.5 + bob, 3.3, 2.8, BR);
  P(cx - 3, 29 + bob, BR);
  P(cx + 3, 29 + bob, BR);
  LN(cx - 3, 36 + bob, cx - 6, (arm ? 32 : 38) + bob, BR);
  LN(cx + 3, 36 + bob, cx + 6, (arm ? 38 : 32) + bob, BR);
  R(cx - 2, 44, 1, 3 - (arm ? 1 : 0), BR);
  R(cx + 1, 44, 1, 3 - (arm ? 0 : 1), BR);
  if (ghost) {
    ST({ flat: ghost, dith: true, em: 1, ol: null });
    return;
  }
  R(cx - 1, 37 + bob, 3, 4, MZ);
  ST();
  put(cx - 1, 31 + bob, DK);
  put(cx + 1, 31 + bob, DK);
  put(cx, 32 + bob, DK);
  put(cx - 1, 33 + bob, MZ);
  put(cx, 33 + bob, MZ);
  put(cx + 1, 33 + bob, MZ);
  [0xff8fc8, 0xffe66b, 0xffffff, 0xffe66b, 0xff8fc8].forEach((c, i) => put(cx - 2 + i, 29 + bob, c)); // flower crown
  bearHead = [cx, 27 + bob];
}
function bear(): void {
  const moving = Math.abs(bearX - bearTgt) > 0.7,
    cx = Math.round(bearX);
  if (moving || bearSt === 3) {
    bearWalk(cx, bearDir);
    return;
  }
  if (bearSt === 4) {
    const sw = Math.sin((beat * Math.PI) / 2),
      dn = Math.cos((beat * Math.PI) / 2) > 0 ? 1 : -1,
      x = 128 + Math.round(2.6 * sw);
    bearDance(x - dn * 4, 0xff5fb8);
    bearDance(x - dn * 2, 0xff9fd4);
    bearDance(x, 0);
    return;
  }
  if (bearSt === 0) {
    // curled up in the den, breathing
    const br = Math.sin(T * 1.5) * 0.5;
    E(110, 38.4 - br * 0.3, 3.2, 1.9 + br, BR);
    P(108, 36, BR);
    ST({ ol: null });
    put(109, 38, 0x7a4a2a);
    put(111, 38, 0x7a4a2a);
    for (let k = 0; k < 3; k++) {
      const ph = (T * 0.4 + k / 3) % 1,
        zx = Math.round(113 + ph * 6 + Math.sin(ph * 6 + k) * 1.2),
        zy = Math.round(33 - ph * 13),
        c = mixc(0xffffff, 0x9aa8e0, ph);
      if (ph > 0.05) {
        put(zx, zy, c, 1);
        put(zx + 1, zy, c, 1);
        if (ph > 0.3) {
          put(zx + 2, zy, c, 1);
          put(zx + 1, zy + 1, c, 1);
          put(zx, zy + 2, c, 1);
          put(zx + 1, zy + 2, c, 1);
          put(zx + 2, zy + 2, c, 1);
        } else {
          put(zx, zy + 1, c, 1);
          put(zx + 1, zy + 1, c, 1);
        }
      }
    }
    bearHead = [110, 32];
    return;
  }
  if (bearSt === 1) {
    // peeking out, blinking, yawning now and then
    E(110, 36.5, 3.3, 2.8, BR);
    P(108, 33, BR);
    P(112, 33, BR);
    R(107, 39, 2, 1, BR);
    R(112, 39, 2, 1, BR);
    ST();
    const bl = T % 3.1 < 0.14,
      yawn = T % 5.2 < 0.7;
    put(109, 36, bl ? 0x7a4a2a : DK);
    put(111, 36, bl ? 0x7a4a2a : DK);
    put(109, 38, MZ);
    put(110, 38, yawn ? 0x8a2a3a : MZ);
    put(111, 38, MZ);
    put(110, 37, DK);
    bearHead = [110, 32];
    return;
  }
  // sitting, scratching
  E(110, 42, 3.7, 3.8, BR);
  E(110, 36, 3.3, 2.8, BR);
  P(108, 33, BR);
  P(112, 33, BR);
  R(107, 45, 2, 1, BR);
  R(112, 45, 2, 1, BR);
  const sc = T % 2.4 < 0.8 && Math.floor(T * 10) & 1;
  LN(113, 41, 115, sc ? 38 : 40, BR);
  R(109, 41, 3, 3, MZ);
  ST();
  const bl = T % 3.4 < 0.14;
  put(109, 36, bl ? 0x7a4a2a : DK);
  put(111, 36, bl ? 0x7a4a2a : DK);
  put(110, 37, DK);
  put(109, 38, MZ);
  put(110, 38, MZ);
  put(111, 38, MZ);
  bearHead = [110, 32];
}
function geese(): void {
  // the flock circles while it waits; it jumps 2 px with every honk
  if (inA < 0.6 && (waiting || inA > 0.02)) {
    const fxk = flock[0] - inA * 70,
      fyk = flock[1] + inA * 44 - shake,
      fl = Math.floor(T * 5) & 1;
    [[0, 0], [3, -2], [3, 2], [6, -4], [6, 4]].forEach((o, i) => {
      const x = Math.round(fxk + o[0]),
        y = Math.round(fyk + o[1]),
        f = fl ^ (i & 1) ? 1 : 0;
      put(x - 1, y - f, DK);
      put(x, y, DK);
      put(x + 1, y - f, DK);
    });
  }
  if (inA > 0.3)
    [92, 85, 80, 75].forEach((tx, k) => {
      // the goose and three goslings swim in
      const x = Math.round(lerp(104 + k * 4, tx, sst(0.3 + k * 0.06, 1, inA)));
      if (x > 98) return;
      const bob = pulse > 0.5 === !(k & 1) ? -1 : 0;
      if (k === 0) {
        E(x, 41 + bob, 3, 1.8, 0xfdfaf3);
        R(x - 3, 37 + bob, 1, 4, 0xfdfaf3);
        P(x - 4, 37 + bob, 0xfdfaf3);
        ST();
        put(x - 5, 37 + bob, 0xff9a3a);
        put(x - 3, 37 + bob, DK);
        put(x + 1, 41 + bob, 0xd9dfe8);
      } else {
        E(x, 42 + bob, 1.5, 1.1, 0xffd94a);
        P(x - 2, 41 + bob, 0xffd94a);
        ST();
        put(x - 3, 41 + bob, 0xff9a3a);
      }
      put(x + 4, 43, 0xbfe3f7);
      put(x + 5, 44, 0xbfe3f7);
    });
}
function rope(): void {
  for (let i = 0; i < W; i++) put(i, wireY(i), 0x3a3048);
  for (let i = 0; i < 12; i++) {
    const on = glow[i],
      c = BC[i % 5],
      x = BX[i],
      y = BY[i];
    R(x - 1, y, 3, 3, on ? c : mixc(c, 0x566078, 0.66));
    if (!lit[i]) R(x - 1, y, 3, 1, SNOW);
    ST({ em: on ? 1 : 0 });
    if (on) put(x, y + 1, 0xffffff, 1);
    if (!lit[i]) {
      // icicle
      const n = 3 + ((i * 7) % 3);
      for (let j = 0; j < n; j++) put(x, y + 4 + j, j === n - 1 ? 0x9fd0f5 : Math.sin(T * 3 + i) > 0.8 && j === 1 ? 0xffffff : 0xe1f3ff);
    } else {
      // its last drop
      const a = T - dripT[i];
      if (a >= 0 && a < 0.55) {
        const dy = y + 4 + a * a * 150;
        if (dy < H) {
          put(x, dy, 0xbfe9ff, 1);
          put(x, dy - 1, 0x8fd0f5, 1);
        }
      }
    }
  }
}
function particles(sp: boolean): void {
  if (!sp) {
    // falling snow
    for (let k = 0; k < 50; k++) {
      const x = (((k * 37.7 - T * (2 + (k % 3)) + Math.sin(T * 0.8 + k) * 2) % 176) + 176) % 176,
        y = ((k * 17.3 + T * (7 + (k % 5) * 2.2)) % 54) - 2;
      put(x, y, k % 3 ? 0xffffff : 0xdbe6ff, k % 4 === 0 ? 1 : 0);
    }
    return;
  }
  const b = prog(128, 36);
  if (b > 0.8)
    for (let k = 0; k < 7; k++) {
      const ph = (T * 0.16 + k / 7) % 1;
      put(128 + ((k * 5) % 28) + Math.sin(ph * 7 + k) * 3 - ph * 8, 22 + ph * 26, k & 1 ? 0xffc4dd : 0xff9cc8, 1);
    }
  if (party > 0.3)
    for (let k = 0; k < 26; k++) {
      const x = (((k * 37 + 11 + Math.sin(T * 1.3 + k) * 4 - T * 3) % 176) + 176) % 176,
        y = ((T * (8 + (k % 5) * 2.5) + k * 13) % 58) - 4;
      if (Math.sin(T * 6 + k * 1.7) > -0.3) put(x, y, [0xffc4dd, 0xff9cc8, 0xffffff, 0xffe3ef][k % 4], 1);
    }
  const bf = sst(0.5, 0.62, p);
  if (bf > 0)
    for (let k = 0; k < 3; k++) {
      // butterflies
      if (bf < 0.5 && k) continue;
      const x = Math.round(40 + k * 45 + 22 * Math.sin(T * 0.5 + k * 2.1)),
        y = Math.round(30 + 7 * Math.sin(T * 0.8 + k * 1.3)),
        fl = Math.floor(T * 9 + k) & 1,
        c = [0xffe66b, 0xffffff, 0x9fd8fa][k];
      put(x, y, DK);
      put(x - 1, y - (fl ? 1 : 0), c, 1);
      put(x + 1, y - (fl ? 1 : 0), c, 1);
      if (!fl) {
        put(x - 2, y - 1, c, 1);
        put(x + 2, y - 1, c, 1);
      }
    }
}
function overlays(): void {
  if (boom)
    for (let k = 0; k < 3; k++) {
      // notes from the gramophone
      const ph = (T * 0.45 + k / 3) % 1;
      if (ph > 0.9) continue;
      const nx = Math.round(50 + ph * 9 * (k & 1 ? 1 : -0.4) + Math.sin(ph * 9 + k) * 1.5),
        ny = Math.round(22 - ph * 16),
        c = [0xffd23f, 0x7fe3ff, 0xff8fc8][k];
      put(nx, ny + 3, c, 1);
      put(nx + 1, ny + 3, c, 1);
      put(nx, ny + 2, c, 1);
      put(nx + 1, ny + 2, c, 1);
      put(nx + 1, ny + 1, c, 1);
      put(nx + 1, ny, c, 1);
      put(nx + 1, ny - 1, c, 1);
      put(nx + 2, ny - 1, c, 1);
      put(nx + 2, ny, c, 1);
    }
  let ex = false;
  for (const h of hits) {
    // honk arcs + “!” over the bear
    const a = T - h;
    if (a < 0 || a > 0.42) continue;
    if (a < 0.4) ex = true;
    for (let k = 0; k < 2; k++) {
      const r = 5 + a * 32 - k * 4;
      if (r < 2) continue;
      for (let an = -0.7; an <= 0.7; an += 0.1) {
        const ax = Math.round(flock[0] - 4 - Math.cos(an - 0.5) * r),
          ay = Math.round(flock[1] + 2 - Math.sin(an - 0.5) * r);
        if (ay > 0 && ay < 34) put(ax, ay, k ? 0xffd98a : 0xfff6d8, 1);
      }
    }
  }
  if (ex && inA < 0.5) {
    const hx = bearHead[0],
      hy = bearHead[1] - 6;
    R(hx, hy, 1, 3, 0xffd23f);
    R(hx, hy + 4, 1, 1, 0xffd23f);
    ST({ em: 1 });
  }
}
function drawScene(sp: boolean): void {
  sky(sp);
  land(sp);
  pine(sp);
  cabin(sp);
  gramophone(sp);
  pond(sp);
  snowman(sp);
  den(sp);
  tree(sp);
  stoneLantern(sp);
  if (sp) flowers();
  bear();
  geese();
  rope();
  particles(sp);
  overlays();
}
/** Light one world into F. */
function finish(sp: boolean, F: Uint8ClampedArray): void {
  const c = sst(0.2, 0.9, p),
    wr = lerp(0.64, 0.84, c),
    wg = lerp(0.7, 0.88, c),
    wb = lerp(0.86, 0.97, c),
    ar0 = 4,
    ag0 = lerp(8, 6, c),
    ab0 = lerp(22, 10, c),
    sun = sst(0.5, 0.8, p);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x,
        v = A[i],
        e = EM[i],
        bay = BAY[(y & 3) * 4 + (x & 3)];
      let r = v & 255,
        g = (v >> 8) & 255,
        b = (v >> 16) & 255;
      if (y < 14 && !e)
        for (let j = 0; j < 12; j++)
          if (glow[j]) {
            const dx = x - BX[j],
              dy = y - BY[j] - 1,
              d2 = dx * dx + dy * dy;
            if (d2 < 72) {
              const f = 1 - Math.sqrt(d2) / 8.5;
              if (f * 1.2 > bay + 0.12) {
                const q = BCR[j % 5];
                r += (q[0] - r) * 0.4;
                g += (q[1] - g) * 0.4;
                b += (q[2] - b) * 0.4;
              }
            }
          }
      if (sp) {
        // slanted sun rays
        if (sun > 0 && !e && y < GY + 2 && (x + y * 1.3 + 400 - T * 2) % 30 < 7 && bay < sun * 0.34) {
          r += 28;
          g += 22;
          b += 4;
        }
      } else {
        if (!e) {
          r = r * wr + ar0;
          g = g * wg + ag0;
          b = b * wb + ab0;
        }
        if (stoveA > 0.01 && y > 30) {
          // banded warm pool on the snow from the cabin window
          const dx = x - 31,
            dy = (y - 37) * 1.5,
            d = Math.sqrt(dx * dx + dy * dy),
            I = (d < 7 ? 0.5 : d < 12 ? 0.32 : d < 17 ? 0.17 : d < 22 ? 0.07 : 0) * stoveA;
          r += I * 130;
          g += I * 84;
          b += I * 6;
        }
      }
      const o = i * 3;
      F[o] = r;
      F[o + 1] = g;
      F[o + 2] = b;
    }
}
/** Spring behind the knob, winter ahead of it, melting into each other through a 4×4 Bayer edge. */
function compose(): void {
  const band = 1 - sst(0.9, 1, p);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x,
        o3 = i * 3,
        o = i * 4,
        o2 = o + W * H * 4,
        bay = BAY[(y & 3) * 4 + (x & 3)];
      let r: number, g: number, b: number;
      if ((bxn - x) / 11 + 0.5 > bay) {
        r = FS[o3];
        g = FS[o3 + 1];
        b = FS[o3 + 2];
        const w = 1 - (bxn - x) / 24; // meltwater shimmer just behind the knob
        if (w > 0 && w * band > BAY[((y + 2) & 3) * 4 + ((x + 1) & 3)]) {
          r += 24;
          g += 30;
          b += 30;
        }
      } else {
        r = FW[o3];
        g = FW[o3 + 1];
        b = FW[o3 + 2];
      }
      OUTC[o] = r;
      OUTC[o + 1] = g;
      OUTC[o + 2] = b;
      OUTC[o + 3] = 255;
      OUTC[o2] = FS[o3];
      OUTC[o2 + 1] = FS[o3 + 1];
      OUTC[o2 + 2] = FS[o3 + 2];
      OUTC[o2 + 3] = 255;
    }
}

// The story, by position.
export function update(f: Frame): void {
  p = f.p;
  T = f.T;
  beat = f.beat;
  pulse = f.pulse;
  const dt = f.dt;
  bxn = f.kxr + (p - 0.5) * 60;
  fx = f.kxr + 14;
  const lx = f.kxr - 6 + (p - 0.5) * 20;
  for (let i = 0; i < 12; i++) {
    const on = lx > BX[i];
    if (on !== lit[i]) {
      lit[i] = on;
      if (on) dripT[i] = T;
      sfx.drip(i, on);
    }
    glow[i] = on && !(partyOn && (Math.floor(beat * 2) + i) % 4 === 0);
  }
  const so = stoveOn ? p > 0.085 : p > 0.1;
  if (so !== stoveOn) {
    stoveOn = so;
    sfx.latch();
  }
  stoveA += ((stoveOn ? 1 : 0) - stoveA) * (1 - Math.exp(-dt * 18));
  const aw = awake ? p > 0.18 : p > 0.2;
  if (aw !== awake) {
    awake = aw;
    if (aw) sfx.yawn();
  }
  const c1 = fx > 64,
    c2 = fx > 84;
  if (c1 !== ck1) {
    ck1 = c1;
    if (c1) sfx.crack();
  }
  if (c2 !== ck2) {
    ck2 = c2;
    if (c2) sfx.crack();
  }
  const hd = prog(56, 30) > 0.85;
  if (hd !== hatDown) {
    hatDown = hd;
    if (hd) sfx.slide();
  }
  const po = partyOn ? p > 0.84 : p >= 0.86;
  if (po !== partyOn) {
    partyOn = po;
    if (po) sfx.riser();
    else sfx.brake();
  }
  party += ((partyOn ? 1 : 0) - party) * (1 - Math.exp(-dt * 4));
  const en = entered ? p > 0.93 : p >= 0.965;
  if (en !== entered) {
    entered = en;
    if (en) sfx.land();
  }
  inA += ((entered ? 1 : 0) - inA) * (1 - Math.exp(-dt * 3.5));
  waiting = p >= 0.8 && !entered;
  if (waiting) {
    kt -= dt;
    if (kt <= 0) {
      kt = 2.8;
      hits.push(T, T + 0.27, T + 0.54);
      sfx.honk();
    }
  } else kt = 0.7;
  while (hits.length && T - hits[0] > 0.6) hits.shift();
  shake = 0;
  for (const h of hits) {
    const a = T - h;
    if (a >= 0 && a < 0.08) shake = 2;
  }
  flock = [150 + 9 * Math.sin(T * 0.6), 8 + 2 * Math.sin(T * 0.9)];
  boom = p > 0.36;
  bearSt = p < 0.2 ? 0 : p < 0.38 ? 1 : p < 0.55 ? 2 : p < 0.86 ? 3 : 4;
  bearTgt = bearSt < 3 ? 110 : bearSt === 3 ? lerp(114, 128, sst(0.55, 0.8, p)) : 128;
  {
    const d = bearTgt - bearX,
      s = Math.min(Math.abs(d), dt * 16);
    if (Math.abs(d) > 0.01) {
      bearX += Math.sign(d) * s;
      bearDir = Math.sign(d);
      walkPh += s * 0.45;
    }
  }
  drawScene(false);
  finish(false, FW);
  drawScene(true);
  finish(true, FS);
  compose();
}
