const STEPS = 129;

// Equal-power curve, so two overlapping tracks keep a steady perceived loudness during a crossfade.
export function fadeCurve(direction: 'in' | 'out', volume: number): Float32Array {
  const curve = new Float32Array(STEPS);
  for (let i = 0; i < STEPS; i += 1) {
    const t = i / (STEPS - 1);
    const shape = direction === 'in' ? Math.sin((t * Math.PI) / 2) : Math.cos((t * Math.PI) / 2);
    curve[i] = shape * volume;
  }
  curve[direction === 'in' ? 0 : STEPS - 1] = 0;
  curve[direction === 'in' ? STEPS - 1 : 0] = volume;
  return curve;
}
