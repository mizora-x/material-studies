// No. 063 — Thaw Switch: winter → spring.
import type { Study } from '../../engine/switch';
import { music } from './music';
import { update } from './scene';

const temp = (v: number): string => {
  const d = Math.round(-12 + 30 * v);
  return (d < 0 ? '−' : d > 0 ? '+' : '') + Math.abs(d) + '°C';
};
const season = (v: number): string => (v < 0.15 ? 'Deep winter' : v < 0.38 ? 'First drip' : v < 0.6 ? 'Thaw' : v < 0.86 ? 'Spring' : 'Festival');
const tune = (v: number): string => (v < 0.12 ? 'Wind' : v < 0.36 ? 'Kalimba' : v < 0.58 ? 'Beat' : v < 0.86 ? 'Band' : 'Festival');

export const thaw: Study = {
  page: {
    stops: [[0, 22, 34, 50], [0.35, 38, 54, 76], [0.6, 146, 140, 160], [0.8, 234, 216, 222], [1, 247, 237, 232]],
    darkAt: 0.57,
    light: '230,240,250',
    dark: '52,36,48',
    mutLight: 0.66,
    mutDark: 0.7,
  },
  glass: {
    shadow: [0.03, 0.05, 0.1],
    shadowAmt: [0.6, 0.28],
    bezel: [[0.56, 0.64, 0.74], [0.97, 0.945, 0.9]], // frosted aluminium → cream enamel
    bezelLight: [0.3, 0.11],
    bezelSpec: [0.12, 0.05],
    rime: 1,
    frost: 1,
    echo: [[0.45, 1, 0.72], [1, 0.45, 0.75]], // mint → blossom pink
    foot: [1, 0.93, 0.75],
    fresnel: [[0.78, 0.9, 1], [1, 0.95, 0.92]],
  },
  music,
  readouts: (p) => [temp(p), season(p), tune(p)],
  ariaText: (v) => `${temp(v)}, ${season(v)}`,
  update,
};
