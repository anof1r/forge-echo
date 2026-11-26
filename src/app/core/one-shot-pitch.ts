export interface OneShotPitchMemory {
  at: number;
  semitones: number;
}

const RAPID_REPEAT_WINDOW_MS = 900;
const MAX_PITCH_SHIFT_SEMITONES = 1.8;
const MIN_PITCH_SHIFT_SEMITONES = 0.75;
const REPEAT_DISTANCE_SEMITONES = 0.3;

export function nextOneShotPitch(
  previous: OneShotPitchMemory | null,
  now: number,
  randomValue = Math.random(),
): number {
  if (!previous || now < previous.at || now - previous.at > RAPID_REPEAT_WINDOW_MS) return 0;

  const random = Math.min(1, Math.max(0, randomValue));
  let pitch = (random * 2 - 1) * MAX_PITCH_SHIFT_SEMITONES;
  if (Math.abs(pitch) < MIN_PITCH_SHIFT_SEMITONES) pitch = pitch < 0 ? -MIN_PITCH_SHIFT_SEMITONES : MIN_PITCH_SHIFT_SEMITONES;
  if (Math.abs(pitch - previous.semitones) < REPEAT_DISTANCE_SEMITONES) {
    pitch = previous.semitones >= 0 ? -MAX_PITCH_SHIFT_SEMITONES : MAX_PITCH_SHIFT_SEMITONES;
  }
  return Math.round(pitch * 100) / 100;
}
