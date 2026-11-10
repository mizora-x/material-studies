// No. 062 — the room: a cosy pixel room, night on the right, morning dragged in from the left.
import { clamp, lerp, sst } from '../../engine/math';
import { W, H, A, EM, OUTC, BAY, DK, mixc, put, fill, mixPut, P, R, E, LN, ST } from '../../engine/pixel';
import type { Frame } from '../../engine/switch';
import { sfx } from './music';

// ── state, written by update()
let p = 0,
  T = 0,
  beat = 0,
  pulse = 0,
  bxn = -14,
  lampOn = false,
  lampA = 0,
  party = 0,
  inA = 0,
  waiting = false,
  shake = 0,
  boom = false;
let catX = 67,
  catDir = 1,
  walkPh = 0,
  catSt = 0,
  catTgt = 67,
  catHead: [number, number] = [62, 36];
let partyOn = false,
  entered = false,
  awake = false,
  kt = 0.6;
const lit: boolean[] = new Array(12).fill(false);
const glow: boolean[] = new Array(12).fill(false);
const hits: number[] = [];

const wireY = (x: number): number => {
  const f = ((x + 2) % 29.7) / 29.7;
  return Math.round(13.6 * f * (1 - f));
};
const BX: number[] = [],
  BY: number[] = [];
for (let i = 0; i < 12; i++) {
  BX[i] = Math.round(10 + i * 13.9);
  BY[i] = wireY(BX[i]) + 1;
}
const BC = [0xff6b6b, 0xffd23f, 0x6fe7b7, 0x6fa8ff, 0xff8fc8];
const BCR = BC.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
const O = 0xf29a3e,
  SR = 0xd07a28,
  CR = 0xfbe3b8;
const STARS = [[52, 9], [57, 12], [61, 9], [65, 13], [72, 10], [75, 14], [81, 9], [84, 13], [55, 16], [70, 17], [79, 18], [63, 18]];
const TOWN = [[50, 5, 4], [55, 4, 6], [59, 6, 3], [65, 3, 7], [68, 5, 5], [73, 4, 4], [77, 6, 6], [83, 4, 3]];
const sput = (x: number, y: number, c: number) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 50 && x < 87 && y >= 8 && y < 24) put(x, y, c, 1);
};

function sky(): void {
  const nd = sst(0.16, 0.44, p),
    dd = sst(0.5, 0.76, p);
  const top = mixc(mixc(0x121742, 0x6b4aa0, nd), 0x58b0ee, dd),
    bot = mixc(mixc(0x2b3276, 0xffb98a, nd), 0xc4e9fb, dd);
  for (let y = 8; y < 24; y++)
    for (let x = 50; x < 87; x++) {
      const f = clamp((y - 8) / 15 + (BAY[(y & 3) * 4 + (x & 3)] - 0.5) * 0.16, 0, 1);
      put(x, y, mixc(top, bot, Math.round(f * 5) / 5), 1);
    }
  STARS.forEach((s, k) => {
    if (nd < 0.2 + (k % 4) * 0.2) {
      const tw = Math.sin(T * (1.3 + k * 0.37) + k * 2.1);
      if (tw > -0.55) sput(s[0], s[1], tw > 0.55 ? 0xffffff : 0xaab4f5);
    }
  });
  const mx = 79,
    my = 11 + nd * 17; // crescent moon, setting
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++)
      if (dx * dx + dy * dy <= 7.5 && (dx - 1.5) * (dx - 1.5) + (dy + 0.8) * (dy + 0.8) > 5.2) sput(mx + dx, my + dy, 0xfff3c4);
  const rise = sst(0.28, 0.8, p),
    sx = 57 + rise * 15,
    sy = 26 - rise * 16,
    sc = mixc(0xff8a4a, 0xfff1a0, dd); // the sun
  if (rise > 0)
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = dx * dx + dy * dy;
        if (d <= 10.5) sput(sx + dx, sy + dy, d <= 4 ? mixc(sc, 0xffffff, 0.35) : sc);
        else if (d <= 20 && (dx + dy) & 1 && dd > 0.4 && Math.sin(T * 2 + dx) > -0.3) sput(sx + dx, sy + dy, 0xfff6c8);
      }
  if (dd > 0.2)
    for (let k = 0; k < 3; k++) {
      const cx = 44 + ((T * 1.3 + k * 19) % 52),
        cy = 10 + k * 3 + (k === 2 ? -5 : 0),
        half = dd < 0.65;
      for (let dx = -4; dx <= 4; dx++) {
        if (half && dx & 1) continue;
        if (Math.abs(dx) <= 2) sput(cx + dx, cy, 0xffffff);
        sput(cx + dx, cy + 1, Math.abs(dx) > 2 ? 0xffffff : 0xdcecfa);
      }
    }
  TOWN.forEach((b, k) => {
    const top = 24 - b[2],
      wall = mixc(mixc(k & 1 ? 0x1d1e44 : 0x161736, k & 1 ? 0x5a3d73 : 0x47305f, nd), k & 1 ? 0xa594c4 : 0x8f7fb5, dd),
      roof = mixc(mixc(0x24255a, 0x8a4f77, nd), k & 1 ? 0xe8806a : 0x4fb0a6, dd);
    for (let y = top; y < 24; y++) for (let x = b[0]; x < b[0] + b[1]; x++) sput(x, y, y === top ? roof : wall);
    if (nd < 0.55 + 0.1 * (k % 3)) {
      if ((k * 7 + 3) % 5 !== 0) sput(b[0] + 1, top + 2, 0xffd76a);
      if (b[2] > 4 && k % 2 === 0) sput(b[0] + b[1] - 2, top + 4, 0xffc24a);
    } else if (dd > 0.5 && b[2] > 3) sput(b[0] + 1, top + 2, 0xdff3ff);
  });
}

function catWalk(cx: number, dir: number): void {
  const ph = Math.floor(walkPh) & 1;
  E(cx, 40, 5.5, 2.5, O);
  E(cx + 6 * dir, 37, 3, 2.6, O);
  P(cx + 6 * dir - 2, 34, O);
  P(cx + 6 * dir + 2, 34, O);
  LN(cx - 5 * dir, 39, cx - 8 * dir, 35, O);
  [-4, -2, 2, 4].forEach((o, i) => R(cx + o, 43, 1, 3 - ((i & 1) ^ ph), O));
  ST();
  put(cx + 6 * dir - 1, 37, DK);
  put(cx + 6 * dir + 1, 37, DK);
  put(cx + 6 * dir, 38, 0xff9fb0);
  put(cx - 2, 38, SR);
  put(cx, 38, SR);
  put(cx + 2, 38, SR);
  catHead = [cx + 6 * dir, 33];
}
function catDance(cx: number, ghost: number): void {
  const bob = pulse > 0.5 ? -1 : 0,
    arm = Math.floor(beat) & 1;
  E(cx, 39 + bob, 3, 4.6, O);
  E(cx, 31.5 + bob, 3.2, 2.7, O);
  P(cx - 2, 28 + bob, O);
  P(cx + 2, 28 + bob, O);
  LN(cx - 3, 36 + bob, cx - 6, (arm ? 32 : 38) + bob, O);
  LN(cx + 3, 36 + bob, cx + 6, (arm ? 38 : 32) + bob, O);
  R(cx - 2, 43, 1, 3 - (arm ? 1 : 0), O);
  R(cx + 1, 43, 1, 3 - (arm ? 0 : 1), O);
  LN(cx + 3, 42, cx + 6, 40 + (arm ? -1 : 1), O);
  if (ghost) {
    ST({ flat: ghost, dith: true, em: 1, ol: null });
    return;
  }
  R(cx - 1, 37 + bob, 2, 4, CR);
  ST();
  fill(cx - 3, 31 + bob, 3, 2, 0x16121f); // sunglasses
  fill(cx + 1, 31 + bob, 3, 2, 0x16121f);
  put(cx, 31 + bob, 0x16121f);
  put(cx - 2, 31 + bob, 0x8fd6ff);
  put(cx + 2, 31 + bob, 0x8fd6ff);
  put(cx, 33 + bob, 0xff9fb0);
  catHead = [cx, 27 + bob];
}
function drawCat(): void {
  const moving = Math.abs(catX - catTgt) > 0.7,
    cx = Math.round(catX);
  if (moving || catSt === 3) {
    catWalk(cx, catDir);
    return;
  }
  if (catSt === 4) {
    const sw = Math.sin((beat * Math.PI) / 2),
      dn = Math.cos((beat * Math.PI) / 2) > 0 ? 1 : -1,
      x = 106 + Math.round(2.6 * sw);
    catDance(x - dn * 4, 0xff5fb8);
    catDance(x - dn * 2, 0xff8fd0);
    catDance(x, 0);
    return;
  }
  if (catSt === 0) {
    // curled asleep, breathing
    const br = Math.sin(T * 1.7) * 0.55;
    E(68, 41.6 - br * 0.4, 6, 2.5 + br, O);
    E(62.4, 42, 2.6, 2.2, O);
    P(61, 39, O);
    P(64, 39, O);
    R(65, 44, 8, 1, SR);
    ST();
    put(67, 40, SR);
    put(69, 40, SR);
    put(71, 41, SR);
    put(61, 42, SR);
    put(63, 42, SR);
    for (let k = 0; k < 3; k++) {
      const ph = (T * 0.42 + k / 3) % 1,
        zx = Math.round(59 - ph * 5 + Math.sin(ph * 6 + k) * 1.2),
        zy = Math.round(36 - ph * 13),
        c = mixc(0xe6eaff, 0x8a92d6, ph);
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
    catHead = [62, 36];
    return;
  }
  if (catSt === 1) {
    // awake, head up, blinking
    E(69, 42, 6, 2.5, O);
    E(62, 38.5, 3, 2.6, O);
    P(60, 35, O);
    P(64, 35, O);
    R(62, 41, 3, 2, CR);
    LN(75, 42, 77, 40 + Math.round(Math.sin(T * 2.2)), O);
    ST();
    const bl = T % 3.1 < 0.14;
    put(61, 38, bl ? SR : DK);
    put(63, 38, bl ? SR : DK);
    put(62, 39, 0xff9fb0);
    put(68, 40, SR);
    put(70, 40, SR);
    put(72, 41, SR);
    catHead = [62, 34];
    return;
  }
  // sitting
  E(68, 40.4, 3.4, 4, O);
  E(66.5, 34.5, 3, 2.6, O);
  P(65, 31, O);
  P(68, 31, O);
  R(66, 38, 2, 5, CR);
  LN(71, 44, 74, 43, O);
  P(75, 42 + Math.round(Math.sin(T * 2) * 0.6), O);
  ST();
  const bl = T % 3.4 < 0.14;
  put(65, 34, bl ? SR : DK);
  put(67, 34, bl ? SR : DK);
  put(66, 35, 0xff9fb0);
  put(70, 39, SR);
  put(70, 41, SR);
  catHead = [66, 30];
}

function drawRoom(): void {
  // walls, wainscot, floor
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c: number;
      if (y < 27) {
        const u = (x + y) & 7,
          v = (x - y + 64) & 7;
        c = u === 0 || v === 0 ? 0xe2b950 : u === 4 && v === 4 ? 0xfdeeb0 : 0xf3d77e;
      } else if (y === 27) c = 0x62c4bb;
      else if (y === 28) c = 0x257a76;
      else if (y < 37) c = x % 8 === 3 ? 0x237772 : x % 8 === 4 ? 0x3ba59d : 0x2f8f8a;
      else if (y === 37) c = 0x1d5a58;
      else {
        const r = (y - 38) >> 2,
          o = r * 13,
          seam = ((y - 38) & 3) === 0 || (x + o) % 24 === 0;
        c = seam ? 0x8a552b : r & 1 ? 0xc07f45 : 0xb47339;
        if (!seam && ((y - 38) & 3) === 1) c = mixc(c, 0xffffff, 0.13);
      }
      put(x, y, c, 0);
    }
  // rug
  for (let x = 84; x < 130; x++) {
    const k = ((x - 84) >> 2) % 3;
    R(x, 42, 1, 6, k === 0 ? 0xef7a63 : k === 1 ? 0xf7ead0 : 0x3aa69f);
  }
  ST();
  // window with curtains
  R(48, 6, 41, 20, 0xf7ead0);
  ST();
  sky();
  fill(68, 8, 1, 16, 0xf7ead0);
  fill(50, 15, 37, 1, 0xf7ead0);
  fill(50, 16, 37, 1, 0xd8c9ae);
  R(46, 26, 45, 1, 0xf7ead0);
  ST();
  R(43, 4, 51, 1, 0xd9a441);
  ST();
  for (let y = 5; y < 27; y++) {
    const w = y > 15 && y < 19 ? 4 : 6;
    for (let i = 0; i < w; i++) {
      R(45 + i, y, 1, 1, i & 1 ? 0xd24d6c : 0xe8607a);
      R(91 - i, y, 1, 1, i & 1 ? 0xd24d6c : 0xe8607a);
    }
  }
  ST();
  // shelf: books above, jelly jars below
  R(22, 15, 23, 1, 0xa8683a);
  R(22, 24, 23, 1, 0xa8683a);
  ST();
  let x = 23;
  [[2, 6, 0xe24a4a], [2, 5, 0x3aa69f], [3, 6, 0xf7c948], [2, 4, 0x6f7fe8], [2, 6, 0xf29a3e], [3, 5, 0xe8607a]].forEach((b) => {
    R(x, 15 - b[1], b[0], b[1], b[2]);
    ST();
    x += b[0] + 1;
  });
  [0xe8558a, 0x9bd65a, 0xf7a23b, 0x6f7fe8].forEach((c, k) => {
    const jx = 24 + k * 5;
    R(jx, 19, 4, 5, c);
    R(jx, 18, 4, 1, 0xf7ead0);
    ST();
    put(jx + 1, 20, mixc(c, 0xffffff, 0.6));
    put(jx + 1, 21, mixc(c, 0xffffff, 0.3));
  });
  // floor lamp (brass, mint shade)
  R(5, 40, 7, 2, 0xd9a441);
  R(8, 22, 1, 18, 0xd9a441);
  ST();
  for (let j = 0; j < 7; j++) {
    const w = 5 + j;
    R(8 - (w >> 1), 15 + j, w, 1, lampOn ? 0xeafff3 : 0x9fe3c4);
  }
  ST({ em: lampOn ? 1 : 0 });
  // wall clock, 02:00 → 10:00
  E(113, 10, 4, 4, 0xfbf3dd);
  ST();
  {
    const hr = 2 + 8 * p,
      ma = (hr % 1) * 6.2832,
      ha = ((hr % 12) / 12) * 6.2832;
    for (let r = 1; r <= 3; r++) put(Math.round(113 + Math.sin(ma) * r), Math.round(10 - Math.cos(ma) * r), DK);
    for (let r = 1; r <= 2; r++) put(Math.round(113 + Math.sin(ha) * r), Math.round(10 - Math.cos(ha) * r), 0xe24a4a);
    put(113, 10, DK);
  }
  // cabinet + red boombox
  R(101, 28, 23, 12, 0xa8683a);
  R(102, 40, 2, 2, 0x8a552b);
  R(121, 40, 2, 2, 0x8a552b);
  ST();
  fill(112, 30, 1, 9, 0x80502a);
  put(110, 34, 0xf7c948);
  put(114, 34, 0xf7c948);
  fill(103, 30, 8, 1, 0xbb7a48);
  fill(114, 30, 8, 1, 0xbb7a48);
  {
    const th = boom && pulse > 0.55 ? 1 : 0,
      sr = 1.8 + (boom ? pulse * 1.5 : 0);
    R(104, 19 - th, 19, 9 + th, 0xe24a4a);
    R(108, 16 - th, 11, 1, 0x3a2a3a);
    R(108, 17 - th, 1, 2, 0x3a2a3a);
    R(118, 17 - th, 1, 2, 0x3a2a3a);
    ST();
    E(108, 24, sr, sr, 0x33263a);
    E(119, 24, sr, sr, 0x33263a);
    ST({ ol: null, sh: false });
    put(108, 24, 0xf7ead0);
    put(119, 24, 0xf7ead0);
    fill(112, 21 - th, 4, 2, 0xf7ead0);
    put(113, 21 - th, 0x33263a);
    put(112, 25, 0xffd23f);
    put(114, 25, 0x6fe7b7);
    put(115, 25, 0xf7ead0);
  }
  // blue panelled door
  R(128, 7, 18, 31, 0xf7ead0);
  ST();
  if (inA > 0.03) {
    fill(130, 9, 14, 29, 0xf79a3e, 1);
    fill(130, 9, 14, 6, 0xe07f2e, 1);
    fill(130, 31, 14, 7, 0xffbd66, 1);
    const lw = Math.round(lerp(14, 3, sst(0, 1, inA)));
    R(130, 9, lw, 29, 0x3f6cc0);
    ST();
  } else {
    R(130 + shake, 9, 14, 29, 0x4f7fd6);
    ST();
    fill(132 + shake, 12, 10, 9, 0x3f6cc0);
    fill(132 + shake, 12, 10, 1, 0x33589f);
    fill(132 + shake, 24, 10, 10, 0x3f6cc0);
    fill(132 + shake, 24, 10, 1, 0x33589f);
    put(141 + shake, 22, 0xffe08a);
    put(141 + shake, 23, 0xd9a441);
    if (waiting) {
      // the puppy outside: warm light under the door, shifting paw shadows
      for (let i = 130; i < 144; i++) {
        put(i, 37, 0xffc66a, 1);
        mixPut(i, 38, 0xffb04a, 0.55, 0);
        if ((i + 1) & 1) mixPut(i, 39, 0xffb04a, 0.3, 0);
      }
      [[133, 1.7, 0], [139, 2.3, 1.2]].forEach((f) => {
        const fx = f[0] + Math.round(Math.sin(T * f[1] + f[2]) * 1.6);
        put(fx, 37, 0x6b3a1a, 1);
        put(fx + 1, 37, 0x6b3a1a, 1);
        mixPut(fx, 38, 0x5a3418, 0.5, 0);
      });
    }
  }
  // framed jelly shark
  R(149, 8, 13, 12, 0xa8683a);
  ST();
  fill(151, 10, 9, 8, 0xbfe9f5);
  fill(151, 16, 9, 2, 0x9fd8ee);
  for (let i = 152; i <= 158; i++) put(i, 14, 0xff8fb8);
  for (let i = 154; i <= 157; i++) {
    put(i, 13, 0xff8fb8);
    put(i, 15, 0xffb3cf);
  }
  put(155, 12, 0xff8fb8);
  put(152, 13, 0xff8fb8);
  put(152, 15, 0xff8fb8);
  put(157, 13, DK);
  put(155, 13, 0xffd6e6);
  // potted plant
  {
    const sw = Math.sin(T * 1.1) * 0.8 + (boom ? Math.sin(beat * Math.PI) * 1.3 : 0);
    LN(166, 35, 164 + sw, 29, 0x3d9950);
    LN(167, 35, 170 + sw, 28, 0x3d9950);
    LN(166, 35, 167 + sw * 1.4, 23, 0x3d9950);
    E(163 + sw, 28, 2, 3, 0x4fae5a);
    E(171 + sw, 26, 2, 3, 0x5cc068);
    E(167 + sw * 1.4, 21, 2, 3.4, 0x4fae5a);
    ST();
    R(163, 37, 7, 6, 0xd9703f);
    R(162, 36, 9, 2, 0xe8854f);
    ST();
  }
  // purple pet bed, the cat
  E(67, 43, 13, 3.6, 0x8a5bd6);
  E(67, 42.4, 10, 2.2, 0xb79af0);
  ST();
  drawCat();
  // the puppy
  if (inA > 0.25) {
    const px = Math.round(lerp(141, 133, sst(0.25, 1, inA))),
      bob = pulse > 0.5 ? -1 : 0,
      wag = Math.round(Math.sin(T * 14));
    E(px + 1, 41 + bob, 4, 2.6, 0xfdfaf3);
    E(px - 4, 36.5 + bob, 3, 2.8, 0xfdfaf3);
    R(px - 2, 43, 1, 3, 0xfdfaf3);
    R(px, 43, 1, 3, 0xfdfaf3);
    R(px + 3, 43, 1, 3, 0xfdfaf3);
    R(px + 5, 43, 1, 3, 0xfdfaf3);
    LN(px + 5, 40 + bob, px + 7, 37 + bob + wag, 0xfdfaf3);
    R(px - 7, 35 + bob, 1, 4, 0x8a5a3a);
    R(px - 1, 35 + bob, 1, 4, 0x8a5a3a);
    ST();
    put(px - 5, 36 + bob, DK);
    put(px - 3, 36 + bob, DK);
    put(px - 4, 38 + bob, DK);
    if (bob) put(px - 4, 39 + bob, 0xff7f9a);
    put(px + 2, 40 + bob, 0xd9a070);
    put(px + 3, 40 + bob, 0xd9a070);
  }
  // knock: sound arcs + “!” over the cat
  let ex = false;
  for (const h of hits) {
    const a = T - h;
    if (a < 0 || a > 0.42) continue;
    if (a < 0.4) ex = true;
    for (let k = 0; k < 2; k++) {
      const r = 4 + a * 30 - k * 4;
      if (r < 2) continue;
      for (let an = -0.75; an <= 0.75; an += 0.12) {
        const ax = Math.round(128 - Math.cos(an) * r),
          ay = Math.round(22 + Math.sin(an) * r * 0.9);
        if (ay > 1 && ay < 37) put(ax, ay, k ? 0xffd98a : 0xfff6d8, 1);
      }
    }
  }
  if (ex && inA < 0.5) {
    const hx = catHead[0],
      hy = catHead[1] - 6;
    R(hx, hy, 1, 3, 0xffd23f);
    R(hx, hy + 4, 1, 1, 0xffd23f);
    ST({ em: 1 });
  }
  // music notes from the boombox
  if (boom)
    for (let k = 0; k < 3; k++) {
      const ph = (T * 0.45 + k / 3) % 1;
      if (ph > 0.9) continue;
      const sd = k & 1 ? 1 : -1,
        nx = Math.round((sd < 0 ? 101 : 124) + sd * ph * 8 + Math.sin(ph * 9 + k) * 1.5),
        ny = Math.round(17 - ph * 14),
        c = [0xffd23f, 0x7fe3ff, 0xff8fc8][k];
      note(nx, ny, c);
    }
  // disco ball
  if (party > 0.02) {
    const cy = Math.round(-6 + sst(0, 1, party) * 17);
    for (let y = 0; y < cy - 4; y++) put(96, y, 0x3a3048);
    E(96, cy, 4, 4, 0xb9c6e0);
    ST({ em: 1 });
    const sp = Math.floor(T * 7);
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (dx * dx + dy * dy <= 11) {
          const q = (dx * 2 + dy * 3 + sp) & 7;
          if (q === 0) put(96 + dx, cy + dy, 0xffffff, 1);
          else if (q === 3) put(96 + dx, cy + dy, 0x8c9ac0, 1);
        }
  }
  // the string of bulbs
  for (let i = 0; i < W; i++) put(i, wireY(i), 0x3a3048);
  for (let i = 0; i < 12; i++) {
    const on = glow[i],
      c = BC[i % 5];
    R(BX[i], BY[i], 2, 2, on ? c : mixc(c, 0x4a4460, 0.62));
    P(BX[i], BY[i] + 2, on ? c : mixc(c, 0x4a4460, 0.62));
    ST({ em: on ? 1 : 0 });
    if (on) put(BX[i], BY[i], 0xffffff, 1);
  }
  // confetti glints
  if (party > 0.3)
    for (let k = 0; k < 22; k++) {
      const cx = (k * 37 + 11) % 176,
        cy = ((T * (9 + (k % 5) * 3) + k * 13) % 58) - 4;
      if (Math.sin(T * 7 + k * 1.7) > -0.1) put(cx, cy, [0xff6b6b, 0xffd23f, 0x6fe7b7, 0x6fa8ff, 0xff8fc8, 0xffffff][k % 6], 1);
    }
}
function note(nx: number, ny: number, c: number): void {
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

// Lighting: the displayed half (dawn dragged in behind the knob) and the fully lit half seen through the glass.
function lightRoom(): void {
  const wt = sst(0.3, 0.75, p),
    tg = lerp(0.88, 1, wt),
    tb = lerp(0.8, 1, wt);
  const nd = sst(0.16, 0.44, p),
    moon = 1 - nd,
    sun = sst(0.42, 0.7, p) * (1 - 0.6 * party),
    band = 1 - sst(0.88, 1, p);
  const sp: number[][] = [];
  if (party > 0.05) for (let k = 0; k < 4; k++) sp.push([88 + 74 * Math.sin(T * 0.7 + k * 1.6), 30 + 13 * Math.sin(T * 0.9 + k * 2.1), (k + 1) % 5]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x,
        c = A[i],
        e = EM[i],
        bay = BAY[(y & 3) * 4 + (x & 3)];
      let r = c & 255,
        g = (c >> 8) & 255,
        b = (c >> 16) & 255,
        ar = 0,
        ag = 0,
        ab = 0;
      if (lampA > 0.01) {
        // banded warm pool from the lamp
        const dx = x - 8,
          dy = (y - 27) * 0.8,
          d = Math.sqrt(dx * dx + dy * dy),
          I = (d < 9 ? 0.56 : d < 15 ? 0.36 : d < 21 ? 0.2 : d < 27 ? 0.08 : 0) * lampA;
        ar = I * 120;
        ag = I * 78;
        ab = I * 8;
      }
      if (y < 13)
        for (let j = 0; j < 12; j++)
          if (glow[j]) {
            const dx = x - BX[j] - 0.5,
              dy = y - BY[j] - 1,
              d2 = dx * dx + dy * dy;
            if (d2 < 72 && !e) {
              const f = 1 - Math.sqrt(d2) / 8.5;
              if (f * 1.2 > bay + 0.12) {
                const q = BCR[j % 5];
                r += (q[0] - r) * 0.4;
                g += (q[1] - g) * 0.4;
                b += (q[2] - b) * 0.4;
              }
            }
          }
      for (const s of sp) {
        // disco spots sweeping the room
        const dx = x - s[0],
          dy = (y - s[1]) * 1.25,
          d2 = dx * dx + dy * dy;
        if (d2 < 64 && bay < 0.62 * party) {
          const q = BCR[s[2]];
          r += (q[0] - r) * 0.38;
          g += (q[1] - g) * 0.38;
          b += (q[2] - b) * 0.38;
        }
      }
      const sx = x + (y - 24) * 0.9,
        shaft = y >= 26 && sx >= 50 && sx < 87 && !e;
      let lr = r + ar * 0.35,
        lg = g + ag * 0.35,
        lb = b + ab * 0.35;
      if (shaft && bay < sun * 0.8) {
        lr += 36;
        lg += 24;
        lb += 2;
      }
      let nr: number, ng: number, nb: number;
      if (e) {
        nr = r;
        ng = g;
        nb = b;
      } else {
        nr = r * 0.3 + 7;
        ng = g * 0.34 + 9;
        nb = b * 0.56 + 30;
        if (shaft && bay < moon * 0.82) {
          nr += 15;
          ng += 25;
          nb += 42;
        }
      }
      nr += ar;
      ng += ag;
      nb += ab;
      let dr: number, dg: number, db: number;
      if ((bxn - x) / 9 + 0.5 > bay) {
        dr = lr;
        dg = lg * tg;
        db = lb * tb;
        const w = 1 - (bxn - x) / 26; // warm dawn band just behind the knob
        if (w > 0 && w * band > bay) {
          dr += 30;
          dg += 8;
          db -= 16;
        }
      } else {
        dr = nr;
        dg = ng;
        db = nb;
      }
      const o = i * 4,
        o2 = o + W * H * 4;
      OUTC[o] = dr;
      OUTC[o + 1] = dg;
      OUTC[o + 2] = db;
      OUTC[o + 3] = 255;
      OUTC[o2] = lr;
      OUTC[o2 + 1] = lg;
      OUTC[o2 + 2] = lb;
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
  for (let i = 0; i < 12; i++) {
    const on = bxn > BX[i] + 4;
    if (on !== lit[i]) {
      lit[i] = on;
      sfx.pluck(i, on);
    }
    glow[i] = on && !(partyOn && (Math.floor(beat * 2) + i) % 4 === 0);
  }
  const lo = lampOn ? p > 0.085 : p > 0.1;
  if (lo !== lampOn) {
    lampOn = lo;
    sfx.lamp();
  }
  lampA += ((lampOn ? 1 : 0) - lampA) * (1 - Math.exp(-dt * 18));
  const aw = awake ? p > 0.18 : p > 0.2;
  if (aw !== awake) {
    awake = aw;
    if (aw) sfx.mrrp();
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
    if (en) sfx.yip();
  }
  inA += ((entered ? 1 : 0) - inA) * (1 - Math.exp(-dt * 5));
  waiting = p >= 0.8 && !entered;
  if (waiting) {
    kt -= dt;
    if (kt <= 0) {
      kt = 2.8;
      hits.push(T, T + 0.25, T + 0.5);
      sfx.knock();
    }
  } else kt = 0.7;
  while (hits.length && T - hits[0] > 0.6) hits.shift();
  shake = 0;
  for (const h of hits) {
    const a = T - h;
    if (a >= 0 && a < 0.07) shake = 2;
  }
  boom = p > 0.36;
  catSt = p < 0.2 ? 0 : p < 0.38 ? 1 : p < 0.55 ? 2 : p < 0.86 ? 3 : 4;
  catTgt = catSt < 3 ? 67 : catSt === 3 ? lerp(74, 104, sst(0.55, 0.8, p)) : 106;
  {
    const d = catTgt - catX,
      s = Math.min(Math.abs(d), dt * 20);
    if (Math.abs(d) > 0.01) {
      catX += Math.sign(d) * s;
      catDir = Math.sign(d);
      walkPh += s * 0.45;
    }
  }
  drawRoom();
  lightRoom();
}
