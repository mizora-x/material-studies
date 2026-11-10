// Page copy for each study (rendered at build time). The runtime lives in src/studies/<name>/.
export interface StudyMeta {
  no: string;
  slug: string;
  title: string;
  caption: string;
  /** one-line theme for the index, e.g. "Night → Morning" */
  span: string;
  blurb: string;
  ariaLabel: string;
  /** readout labels and their values at position 0 */
  readouts: readonly [readonly [string, string], readonly [string, string], readonly [string, string]];
  ariaText0: string;
  /** page colours at position 0: --bg, --fg, --mut, --line */
  vars: { bg: string; fg: string; mut: string; line: string };
}

export const studies: readonly StudyMeta[] = [
  {
    no: '062',
    slug: '062-daybreak-switch',
    title: 'Daybreak Switch',
    caption: 'Drag a jelly-glass knob across a small pixel room and pull the morning in behind it.',
    span: 'Night → Morning',
    blurb: 'A jelly-glass knob drags the morning across a cosy pixel room. A cat wakes, the bulbs light up, and someone knocks at the door.',
    ariaLabel: 'Daybreak switch, night to morning',
    readouts: [['Clock', '02:00'], ['Light', 'Night'], ['Music', 'Crickets']],
    ariaText0: '02:00, Night',
    vars: { bg: 'rgb(27,26,56)', fg: 'rgb(236,232,250)', mut: 'rgba(236,232,250,.64)', line: 'rgba(236,232,250,.2)' },
  },
  {
    no: '063',
    slug: '063-thaw-switch',
    title: 'Thaw Switch',
    caption: 'Drag a drop of glass across a snowed-in hollow and let spring run in behind it.',
    span: 'Winter → Spring',
    blurb: 'A drop of glass carries spring through a snowed-in hollow. The ice cracks, a bear cub wakes up, and geese come home to the pond.',
    ariaLabel: 'Thaw switch, winter to spring',
    readouts: [['Temp', '−12°C'], ['Season', 'Deep winter'], ['Music', 'Wind']],
    ariaText0: '−12°C, Deep winter',
    vars: { bg: 'rgb(22,34,50)', fg: 'rgb(230,240,250)', mut: 'rgba(230,240,250,.66)', line: 'rgba(230,240,250,.2)' },
  },
];

export const bySlug = (slug: string): StudyMeta => {
  const s = studies.find((x) => x.slug === slug);
  if (!s) throw new Error(`unknown study ${slug}`);
  return s;
};
