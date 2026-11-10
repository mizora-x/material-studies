// No. 062 — Daybreak Switch: night → morning.
import type { Study } from '../../engine/switch';
import { music } from './music';
import { update } from './scene';

const clock = (v: number): string => {
  const m = Math.round(120 + v * 480);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
const light = (v: number): string => (v < 0.15 ? 'Night' : v < 0.38 ? 'First light' : v < 0.6 ? 'Sunrise' : v < 0.86 ? 'Morning' : 'Party');
const tune = (v: number): string => (v < 0.12 ? 'Crickets' : v < 0.36 ? 'Music box' : v < 0.58 ? 'Beat' : v < 0.86 ? 'Band' : 'Party');

export const daybreak: Study = {
  page: {
    stops: [[0, 27, 26, 56], [0.35, 44, 38, 80], [0.6, 112, 100, 150], [0.8, 205, 199, 222], [1, 233, 230, 240]],
    darkAt: 0.64,
    light: '236,232,250',
    dark: '38,35,58',
    mutLight: 0.64,
    mutDark: 0.68,
  },
  glass: {
    shadow: [0.04, 0.03, 0.1],
    shadowAmt: [0.6, 0.3],
    bezel: [[0.17, 0.18, 0.235], [0.945, 0.945, 0.965]], // graphite → white gloss plastic
    bezelLight: [0.5, 0.11],
    bezelSpec: [0.16, 0.05],
    rime: 0,
    frost: 0,
    echo: [[1, 0.5, 0.36], [1, 0.4, 0.74]], // coral → pink
    foot: [1, 0.9, 0.68],
    fresnel: [[0.74, 0.8, 1], [1, 0.95, 0.9]],
  },
  music,
  readouts: (p) => [clock(p), light(p), tune(p)],
  ariaText: (v) => `${clock(v)}, ${light(v)}`,
  update,
};
