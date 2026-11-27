import { describe, expect, it } from 'vitest';
import { perceivedVolumeGain } from './perceived-volume';

describe('perceivedVolumeGain', () => {
  it('maps zero to silence and full scale to unity gain', () => {
    // Arrange
    const values = [0, 1];

    // Act
    const gains = values.map(perceivedVolumeGain);

    // Assert
    expect(gains).toEqual([0, 1]);
  });

  it('keeps the bottom of the slider very quiet', () => {
    // Arrange
    const sliderValue = 0.03;

    // Act
    const gain = perceivedVolumeGain(sliderValue);

    // Assert
    expect(gain).toBeCloseTo(10 ** (-58.2 / 20), 8);
  });

  it('clamps values outside the slider range', () => {
    // Arrange
    const values = [-1, 2];

    // Act
    const gains = values.map(perceivedVolumeGain);

    // Assert
    expect(gains).toEqual([0, 1]);
  });
});
