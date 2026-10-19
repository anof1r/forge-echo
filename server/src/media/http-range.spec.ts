import { describe, expect, it } from 'vitest';
import { parseRange } from './http-range';

describe('parseRange', () => {
  it('returns null when the header is absent', () => {
    // Arrange
    const header = undefined;

    // Act
    const result = parseRange(header, 1000);

    // Assert
    expect(result).toBeNull();
  });

  it('parses an explicit start and end', () => {
    // Arrange
    const header = 'bytes=0-99';

    // Act
    const result = parseRange(header, 1000);

    // Assert
    expect(result).toEqual({ start: 0, end: 99 });
  });

  it('parses an open ended range up to the last byte', () => {
    // Arrange
    const header = 'bytes=500-';

    // Act
    const result = parseRange(header, 1000);

    // Assert
    expect(result).toEqual({ start: 500, end: 999 });
  });

  it('parses a suffix range as the last N bytes', () => {
    // Arrange
    const header = 'bytes=-100';

    // Act
    const result = parseRange(header, 1000);

    // Assert
    expect(result).toEqual({ start: 900, end: 999 });
  });

  it('clamps an end beyond the file size', () => {
    // Arrange
    const header = 'bytes=900-5000';

    // Act
    const result = parseRange(header, 1000);

    // Assert
    expect(result).toEqual({ start: 900, end: 999 });
  });

  it('clamps an oversized suffix to the whole file', () => {
    // Arrange
    const header = 'bytes=-5000';

    // Act
    const result = parseRange(header, 1000);

    // Assert
    expect(result).toEqual({ start: 0, end: 999 });
  });

  it.each(['bytes=1000-', 'bytes=500-100', 'bytes=-0', 'bytes=0-1,5-9'])(
    'reports %s as unsatisfiable',
    (header) => {
      // Arrange - header comes from the table

      // Act
      const result = parseRange(header, 1000);

      // Assert
      expect(result).toBe('unsatisfiable');
    },
  );

  it.each(['items=0-1', 'bytes=', 'bytes=a-b', 'garbage'])('ignores malformed header %s', (header) => {
    // Arrange - header comes from the table

    // Act
    const result = parseRange(header, 1000);

    // Assert
    expect(result).toBeNull();
  });

  it('reports any range on an empty file as unsatisfiable', () => {
    // Arrange
    const header = 'bytes=0-0';

    // Act
    const result = parseRange(header, 0);

    // Assert
    expect(result).toBe('unsatisfiable');
  });
});
