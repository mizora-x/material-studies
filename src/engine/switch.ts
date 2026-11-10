// Runs one switch study: spring physics, pointer / keyboard input, page colours,
// readouts, the per-frame scene update and the GPU draw.
import { clamp, lerp, sst } from './math';
import { W } from './pixel';
import { createGlass, GlassError, CWU, CHU, PADX, PADY, type GlassTheme } from './glass';
import { setupAudio, startAudio, setSound, soundIsOn, suspend, beatNow, audioFrame, type Music } from './audio';

/** Where the knob can travel inside the 176-px track. */
export const KX0 = 16;
export const KX1 = 160;

export interface Frame {
  /** knob position 0..1 (clamped) */
  p: number;
  /** knob velocity in positions per second */
  kv: number;
  /** seconds since load */
  T: number;
  dt: number;
  /** beats since the song started */
  beat: number;
  /** 1 on the beat, decaying to 0 */
  pulse: number;
  /** knob centre in scene pixels */
  kxr: number;
}

export interface PageTheme {
  /** background stops: [position, r, g, b] */
  stops: readonly (readonly [number, number, number, number])[];
  /** switch position after which text turns dark */
  darkAt: number;
  light: string;
  dark: string;
  mutLight: number;
  mutDark: number;
}

export interface Study {
  page: PageTheme;
  glass: GlassTheme;
  music: Music;
  /** the three readouts, in order */
  readouts(p: number): readonly [string, string, string];
  ariaText(p: number): string;
  /** advance the story and draw the scene into the pixel buffer */
  update(f: Frame): void;
}

const q = <T extends Element>(root: ParentNode, sel: string): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

export function mount(study: Study, root: ParentNode = document): void {
  const cv = q<HTMLCanvasElement>(root, '[data-canvas]');
  const stage = q<HTMLElement>(root, '[data-stage]');
  const errEl = q<HTMLElement>(root, '[data-error]');
  const btn = q<HTMLButtonElement>(root, '[data-sound]');
  const reads = [0, 1, 2].map((i) => q<HTMLElement>(root, `[data-read="${i}"]`));
  const docEl = document.documentElement;

  let glass;
  try {
    glass = createGlass(cv, study.glass);
  } catch (e) {
    errEl.textContent = e instanceof GlassError ? e.message : 'Something went wrong starting this study.';
    errEl.hidden = false;
    stage.hidden = true;
    if (!(e instanceof GlassError)) console.error(e);
    return;
  }
  setupAudio(study.music);

  // ── canvas size: whole device pixels per scene pixel, as many as fit
  let scale = 1;
  const resize = () => {
    const dpr = window.devicePixelRatio || 1,
      w = Math.max(160, stage.clientWidth);
    scale = Math.max(1, Math.floor((w * dpr) / CWU));
    if (cv.width !== CWU * scale) {
      cv.width = CWU * scale;
      cv.height = CHU * scale;
    }
    cv.style.width = (CWU * scale) / dpr + 'px';
    cv.style.height = (CHU * scale) / dpr + 'px';
  };
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);

  // ── input
  let tp = 0,
    kp = 0,
    kv = 0,
    wob = 0,
    wv = 0,
    last = 0,
    T = 0,
    userMuted = false;
  let drag: { id: number; x: number; tp0: number; moved: boolean } | null = null;

  const showSound = (on: boolean) => {
    btn.textContent = on ? 'Sound on' : 'Sound off';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  const audioStart = () => {
    if (userMuted) return;
    startAudio();
    showSound(soundIsOn());
  };
  btn.addEventListener('click', () => {
    if (!soundIsOn()) {
      userMuted = false;
      audioStart();
    } else {
      userMuted = true;
      setSound(false);
      showSound(false);
    }
  });
  const unitCss = () => cv.getBoundingClientRect().width / CWU;
  const onSwitch = (e: PointerEvent) => {
    const r = cv.getBoundingClientRect(),
      u = r.width / CWU,
      x = (e.clientX - r.left) / u,
      y = (e.clientY - r.top) / u;
    return x > PADX - 9 && x < PADX + W + 9 && y > PADY - 9 && y < PADY + 50 + 9;
  };
  cv.addEventListener('pointerdown', (e) => {
    if (e.button || !onSwitch(e)) return;
    try {
      cv.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable */
    }
    tp = clamp(kp, 0, 1);
    drag = { id: e.pointerId, x: e.clientX, tp0: tp, moved: false };
    cv.dataset.drag = '';
    audioStart();
    study.music.grab();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    if (drag.moved) tp = clamp(drag.tp0 + dx / ((KX1 - KX0) * unitCss()), 0, 1);
  });
  const endDrag = (e: PointerEvent, cancel: boolean) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && !cancel) tp = kp < 0.5 ? 1 : 0; // tap: spring to the other end
    drag = null;
    delete cv.dataset.drag;
    audioStart();
    study.music.release();
  };
  cv.addEventListener('pointerup', (e) => endDrag(e, false));
  cv.addEventListener('pointercancel', (e) => endDrag(e, true));
  cv.addEventListener('click', audioStart);
  cv.addEventListener('keydown', (e) => {
    let handled = true;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        tp = clamp(tp + 0.05, 0, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        tp = clamp(tp - 0.05, 0, 1);
        break;
      case 'PageUp':
        tp = clamp(tp + 0.2, 0, 1);
        break;
      case 'PageDown':
        tp = clamp(tp - 0.2, 0, 1);
        break;
      case 'Home':
        tp = 0;
        break;
      case 'End':
        tp = 1;
        break;
      case ' ':
      case 'Enter':
        tp = tp < 0.5 ? 1 : 0;
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      audioStart();
    }
  });
  document.addEventListener('visibilitychange', () => suspend(document.hidden));

  // ── page colours + readouts
  const { page } = study;
  let bg: [number, number, number] = [page.stops[0][1], page.stops[0][2], page.stops[0][3]];
  let lastBg = -1,
    lastDark: boolean | null = null,
    lastVal = -1;
  const lastRead = ['', '', ''];
  const ui = (p: number) => {
    let k = 0;
    while (k < page.stops.length - 2 && p > page.stops[k + 1][0]) k++;
    const a = page.stops[k],
      b = page.stops[k + 1],
      f = clamp((p - a[0]) / (b[0] - a[0]), 0, 1);
    bg = [Math.round(lerp(a[1], b[1], f)), Math.round(lerp(a[2], b[2], f)), Math.round(lerp(a[3], b[3], f))];
    const key = (bg[0] << 16) | (bg[1] << 8) | bg[2];
    if (key !== lastBg) {
      lastBg = key;
      docEl.style.setProperty('--bg', `rgb(${bg[0]},${bg[1]},${bg[2]})`);
    }
    const dark = p > page.darkAt;
    if (dark !== lastDark) {
      lastDark = dark;
      const c = dark ? page.dark : page.light;
      docEl.style.setProperty('--fg', `rgb(${c})`);
      docEl.style.setProperty('--mut', `rgba(${c},${dark ? page.mutDark : page.mutLight})`);
      docEl.style.setProperty('--line', `rgba(${c},.2)`);
    }
    study.readouts(p).forEach((t, i) => {
      if (t !== lastRead[i]) {
        lastRead[i] = t;
        reads[i].textContent = t;
      }
    });
    const v = Math.round(tp * 100);
    if (v !== lastVal) {
      lastVal = v;
      cv.setAttribute('aria-valuenow', String(v));
      cv.setAttribute('aria-valuetext', study.ariaText(tp));
    }
  };

  // ── main loop
  const ech: [number, number, number] = [PADX + KX0, PADX + KX0, PADX + KX0];
  const rates = [13, 7.5, 4.5];
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const t = now / 1000,
      dt = clamp(t - last, 0, 0.05);
    last = t;
    T += dt;
    // spring: the knob lags the finger; a second damped spring, fed by acceleration, makes it wobble
    const n = 4,
      h = dt / n;
    for (let i = 0; i < n; i++) {
      const acc = 230 * (tp - kp) - 16.5 * kv;
      kv += acc * h;
      kp += kv * h;
      if (kp < 0) {
        kp = 0;
        if (kv < 0) kv *= -0.28;
      } else if (kp > 1) {
        kp = 1;
        if (kv > 0) kv *= -0.28;
      }
      wv += (-310 * wob - 9 * wv - acc * 0.36) * h;
      wob += wv * h;
    }
    const p = clamp(kp, 0, 1);
    const sx = 1 + Math.min(0.3, Math.abs(kv) * 0.055), // stretch with speed, squash vertically to keep volume
      kxr = KX0 + p * (KX1 - KX0);
    const beat = beatNow(T),
      pulse = Math.max(0, 1 - (beat % 1) * 2.4);

    study.update({ p, kv, T, dt, beat, pulse, kxr });

    const kxc = PADX + kxr,
      ea: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      ech[i] += (kxc - ech[i]) * (1 - Math.exp(-dt * rates[i]));
      ea[i] = clamp(Math.abs(kxc - ech[i]) / 5, 0, 1) * (1 - i * 0.18);
    }
    audioFrame(p, Math.abs(kv));
    ui(p);
    glass.draw({
      scale,
      bg,
      day: sst(0.3, 0.8, p),
      knob: [kxc, PADY + 25, clamp(wob, -0.3, 0.3)],
      stretch: [sx, 1 / sx],
      echo: ech,
      echoA: ea,
    });
  };
  if (location.hash === '#test') {
    (window as unknown as { __switch: unknown }).__switch = {
      set: (v: number) => {
        tp = kp = v;
        kv = 0;
      },
      drag: (v: number) => {
        tp = v;
      },
    };
  }
  requestAnimationFrame(frame);
}
