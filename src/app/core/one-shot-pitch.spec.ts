import { describe, expect, it } from 'vitest';
import { nextOneShotPitch } from './one-shot-pitch';

describe('nextOneShotPitch', () => {
  it('keeps the first or non-rapid trigger at its original pitch', () => {
    // Arrange
    const noPreviousTrigger = null;
    const previousTrigger = { at: 1000, semitones: 0.4 };

    // Act
    const first = nextOneShotPitch(noPreviousTrigger, 1000, 0.9);
    const afterPause = nextOneShotPitch(previousTrigger, 2500, 0.9);

    // Assert
    expect(first).toBe(0);
    expect(afterPause).toBe(0);
  });

  it('adds a small pitch shift to a rapid repeat', () => {
    // Arrange
    const previousTrigger = { at: 1000, semitones: 0 };

    // Act
    const pitch = nextOneShotPitch(previousTrigger, 1200, 0.8);

    // Assert
    expect(pitch).toBeCloseTo(1.08, 2);
    expect(Math.abs(pitch)).toBeLessThanOrEqual(1.8);
    expect(Math.abs(pitch)).toBeGreaterThanOrEqual(0.75);
  });

  it('never lets a rapid repeat fall near the original pitch', () => {
    // Arrange
    const previousTrigger = { at: 1000, semitones: 0 };

    // Act
    const pitch = nextOneShotPitch(previousTrigger, 1200, 0.5);

    // Assert
    expect(Math.abs(pitch)).toBe(0.75);
  });

  it('chooses a different pitch when randomness repeats the previous value', () => {
    // Arrange
    const previousTrigger = { at: 1000, semitones: 1.8 };

    // Act
    const pitch = nextOneShotPitch(previousTrigger, 1100, 1);

    // Assert
    expect(pitch).toBe(-1.8);
  });
});
