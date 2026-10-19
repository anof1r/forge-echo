import { describe, expect, it } from 'vitest';
import { parseBindingInput, parseTrackPatch } from './track-input';

describe('parseTrackPatch', () => {
  it('accepts a full valid patch and trims the name', () => {
    // Arrange
    const input = { name: '  Tavern  ', kind: 'ambient', startMs: 1000, endMs: 5000, volume: 0.5, loop: true };

    // Act
    const result = parseTrackPatch(input);

    // Assert
    expect(result).toEqual({
      ok: true,
      value: { name: 'Tavern', kind: 'ambient', startMs: 1000, endMs: 5000, volume: 0.5, loop: true },
    });
  });

  it('accepts a partial patch and keeps only provided fields', () => {
    // Arrange
    const input = { volume: 1 };

    // Act
    const result = parseTrackPatch(input);

    // Assert
    expect(result).toEqual({ ok: true, value: { volume: 1 } });
  });

  it('allows endMs to be null meaning play to the end', () => {
    // Arrange
    const input = { endMs: null };

    // Act
    const result = parseTrackPatch(input);

    // Assert
    expect(result).toEqual({ ok: true, value: { endMs: null } });
  });

  it.each([
    ['empty name', { name: '   ' }],
    ['name over 80 chars', { name: 'x'.repeat(81) }],
    ['unknown kind', { kind: 'music' }],
    ['negative start', { startMs: -1 }],
    ['fractional start', { startMs: 1.5 }],
    ['volume above 1', { volume: 1.1 }],
    ['volume below 0', { volume: -0.1 }],
    ['non boolean loop', { loop: 'yes' }],
    ['end not after start', { startMs: 5000, endMs: 5000 }],
    ['non object body', 'text'],
  ])('rejects %s', (_label, input) => {
    // Arrange - input comes from the table

    // Act
    const result = parseTrackPatch(input);

    // Assert
    expect(result.ok).toBe(false);
  });

  it('ignores unknown fields', () => {
    // Arrange
    const input = { volume: 0.2, file: '../../etc/passwd' };

    // Act
    const result = parseTrackPatch(input);

    // Assert
    expect(result).toEqual({ ok: true, value: { volume: 0.2 } });
  });
});

describe('parseBindingInput', () => {
  it('accepts a binding with fades and volume', () => {
    // Arrange
    const input = { trackId: 'abc-123', fadeInMs: 2000, fadeOutMs: 3000, volume: 0.8 };

    // Act
    const result = parseBindingInput(input);

    // Assert
    expect(result).toEqual({
      ok: true,
      value: { trackId: 'abc-123', fadeInMs: 2000, fadeOutMs: 3000, volume: 0.8 },
    });
  });

  it('applies defaults for fades and volume', () => {
    // Arrange
    const input = { trackId: 'abc-123' };

    // Act
    const result = parseBindingInput(input);

    // Assert
    expect(result).toEqual({
      ok: true,
      value: { trackId: 'abc-123', fadeInMs: 4000, fadeOutMs: 4000, volume: 1 },
    });
  });

  it.each([
    ['missing track', {}],
    ['bad track id', { trackId: '../x' }],
    ['negative fade', { trackId: 'abc', fadeInMs: -1 }],
    ['fade over 30 seconds', { trackId: 'abc', fadeOutMs: 30001 }],
    ['volume above 1', { trackId: 'abc', volume: 2 }],
  ])('rejects %s', (_label, input) => {
    // Arrange - input comes from the table

    // Act
    const result = parseBindingInput(input);

    // Assert
    expect(result.ok).toBe(false);
  });
});
