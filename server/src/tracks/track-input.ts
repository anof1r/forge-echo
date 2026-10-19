import { BindingInput, TRACK_KINDS, TrackKind, TrackPatch } from './track.model';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const ID_PATTERN = /^[0-9a-zA-Z-]{1,64}$/;
const MAX_FADE_MS = 30000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isUnit = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

export function parseTrackPatch(input: unknown): ParseResult<TrackPatch> {
  if (!isRecord(input)) return { ok: false, error: 'Body must be an object.' };
  const patch: TrackPatch = {};

  if ('name' in input) {
    const name = typeof input['name'] === 'string' ? input['name'].trim() : '';
    if (name.length < 1 || name.length > 80) return { ok: false, error: 'name must be 1-80 characters.' };
    patch.name = name;
  }
  if ('kind' in input) {
    if (!TRACK_KINDS.includes(input['kind'] as TrackKind)) return { ok: false, error: 'kind is invalid.' };
    patch.kind = input['kind'] as TrackKind;
  }
  if ('startMs' in input) {
    if (!isNonNegativeInt(input['startMs'])) return { ok: false, error: 'startMs must be a non-negative integer.' };
    patch.startMs = input['startMs'];
  }
  if ('endMs' in input) {
    if (input['endMs'] !== null && !isNonNegativeInt(input['endMs'])) {
      return { ok: false, error: 'endMs must be null or a non-negative integer.' };
    }
    patch.endMs = input['endMs'] as number | null;
  }
  if ('volume' in input) {
    if (!isUnit(input['volume'])) return { ok: false, error: 'volume must be between 0 and 1.' };
    patch.volume = input['volume'];
  }
  if ('loop' in input) {
    if (typeof input['loop'] !== 'boolean') return { ok: false, error: 'loop must be a boolean.' };
    patch.loop = input['loop'];
  }

  if (patch.startMs !== undefined && typeof patch.endMs === 'number' && patch.endMs <= patch.startMs) {
    return { ok: false, error: 'endMs must be greater than startMs.' };
  }
  return { ok: true, value: patch };
}

export function parseBindingInput(input: unknown): ParseResult<BindingInput> {
  if (!isRecord(input)) return { ok: false, error: 'Body must be an object.' };
  const trackId = input['trackId'];
  if (typeof trackId !== 'string' || !ID_PATTERN.test(trackId)) {
    return { ok: false, error: 'trackId is invalid.' };
  }
  const fadeInMs = input['fadeInMs'] ?? 1500;
  const fadeOutMs = input['fadeOutMs'] ?? 1500;
  const volume = input['volume'] ?? 1;
  if (!isNonNegativeInt(fadeInMs) || fadeInMs > MAX_FADE_MS) return { ok: false, error: 'fadeInMs is invalid.' };
  if (!isNonNegativeInt(fadeOutMs) || fadeOutMs > MAX_FADE_MS) return { ok: false, error: 'fadeOutMs is invalid.' };
  if (!isUnit(volume)) return { ok: false, error: 'volume must be between 0 and 1.' };
  return { ok: true, value: { trackId, fadeInMs, fadeOutMs, volume } };
}
