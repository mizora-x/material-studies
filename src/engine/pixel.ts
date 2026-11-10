// The 176×50 scene buffer every study draws into on the CPU, once per frame.
//
// Shapes are drawn into a scratch layer (P / R / E / LN) and then "stamped" with ST(),
// which adds an automatic 1-px outline, a lighter top row and a darker bottom row,
// so every object reads as a pixel sprite.

export const W = 176;
export const H = 50;

/** Current frame, ABGR (little-endian RGBA). */
export const A = new Uint32Array(W * H);
/** 1 = emissive: ignores ambient darkening. */
export const EM = new Uint8Array(W * H);
const L = new Int32Array(W * H);

/** Texture uploaded to the GPU: rows 0..H-1 = what the track shows, rows H..2H-1 = the fully lit world seen through the glass. */
export const OUTC = new Uint8ClampedArray(W * H * 2 * 4);
export const OUT8 = new Uint8Array(OUTC.buffer);

/** 4×4 Bayer thresholds in 0..1. */
export const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bay = (x: number, y: number): number => BAY[(y & 3) * 4 + (x & 3)];

export const OL = 0x2b2138;
export const DK = 0x2b2138;

const pk = (h: number): number => 0xff000000 | ((h & 255) << 16) | (h & 0xff00) | ((h >>> 16) & 255);

/** Mix two 0xRRGGBB colours. */
export const mixc = (a: number, b: number, t: number): number => {
  const r = (a >> 16) & 255,
    g = (a >> 8) & 255,
    c = a & 255;
  return ((r + (((b >> 16) & 255) - r) * t) << 16) | ((g + (((b >> 8) & 255) - g) * t) << 8) | (c + ((b & 255) - c) * t);
};

export function put(x: number, y: number, c: number, e: number = 0): void {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x;
  A[i] = pk(c);
  EM[i] = e | 0;
}
export function fill(x: number, y: number, w: number, h: number, c: number, e: number = 0): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, c, e);
}
export function mixPut(x: number, y: number, c: number, a: number, e: number = 0): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const v = A[y * W + x],
    o = ((v & 255) << 16) | (v & 0xff00) | ((v >> 16) & 255);
  put(x, y, mixc(o, c, a), e);
}

// ── scratch layer
let bx0 = W,
  by0 = H,
  bx1 = -1,
  by1 = -1;
export function P(x: number, y: number, c: number): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  L[y * W + x] = c | 0x1000000;
  if (x < bx0) bx0 = x;
  if (x > bx1) bx1 = x;
  if (y < by0) by0 = y;
  if (y > by1) by1 = y;
}
export function R(x: number, y: number, w: number, h: number, c: number): void {
  x = Math.round(x);
  y = Math.round(y);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, c);
}
export function E(cx: number, cy: number, rx: number, ry: number, c: number): void {
  if (rx < 0.5 || ry < 0.5) return;
  for (let y = Math.ceil(cy - ry); y <= cy + ry; y++)
    for (let x = Math.ceil(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / (rx + 0.3),
        dy = (y - cy) / (ry + 0.3);
      if (dx * dx + dy * dy <= 1) P(x, y, c);
    }
}
export function LN(x0: number, y0: number, x1: number, y1: number, c: number): void {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let k = 0; k <= n; k++) P(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c);
}
/** Replace a sparse pattern of pixels in the scratch layer with another colour (texture flecks). */
export function speck(c: number, mod: number, seed: number): void {
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) if (L[y * W + x] && (x * 7 + y * 13 + seed) % mod === 0) L[y * W + x] = c | 0x1000000;
}

export interface StampOptions {
  /** outline colour, or null for none */
  ol?: number | null;
  /** emissive flag for the stamped pixels */
  em?: number;
  /** paint every pixel this one colour (used for ghost trails) */
  flat?: number;
  /** with flat: checkerboard dither */
  dith?: boolean;
  /** false: no light-top / dark-bottom shading */
  sh?: boolean;
}
/** Stamp the scratch layer onto the frame and clear it. */
export function ST(o: StampOptions = {}): void {
  if (bx1 < 0) return;
  const ol = o.ol === undefined ? OL : o.ol,
    e = o.em ?? 0;
  const x0 = Math.max(0, bx0 - 1),
    x1 = Math.min(W - 1, bx1 + 1),
    y0 = Math.max(0, by0 - 1),
    y1 = Math.min(H - 1, by1 + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x,
        v = L[i];
      if (v) {
        let c = v & 0xffffff;
        if (o.flat !== undefined) {
          if (o.dith && (x + y) & 1) continue;
          c = o.flat;
        } else if (o.sh !== false) {
          if (y === 0 || !L[i - W]) c = mixc(c, 0xffffff, 0.34);
          else if (y === H - 1 || !L[i + W]) c = mixc(c, 0x1a1030, 0.3);
        }
        A[i] = pk(c);
        EM[i] = e;
      } else if (ol !== null && ((x > 0 && L[i - 1]) || (x < W - 1 && L[i + 1]) || (y > 0 && L[i - W]) || (y < H - 1 && L[i + W]))) {
        A[i] = pk(ol);
        EM[i] = 0;
      }
    }
  for (let y = by0; y <= by1; y++) L.fill(0, y * W + bx0, y * W + bx1 + 1);
  bx0 = W;
  by0 = H;
  bx1 = -1;
  by1 = -1;
}
