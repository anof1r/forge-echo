const MINIMUM_DECIBELS = -60;

// A linear dB taper gives useful control at low levels while keeping zero as true silence.
export function perceivedVolumeGain(value: number): number {
  const normalized = Math.min(1, Math.max(0, value));
  if (normalized === 0) return 0;
  return 10 ** ((MINIMUM_DECIBELS * (1 - normalized)) / 20);
}
