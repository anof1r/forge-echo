export interface ByteRange {
  start: number;
  end: number;
}

// Single range only: browsers use one range per request for media playback.
export function parseRange(header: string | undefined, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  const multi = /^bytes=\d*-\d*(,\s*\d*-\d*)+$/.test(header.trim());
  if (multi) return 'unsatisfiable';
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;
  if (size <= 0) return 'unsatisfiable';

  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (suffix === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (start >= size || end < start) return 'unsatisfiable';
  return { start, end };
}
