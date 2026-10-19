import { fadeCurve } from './fade-curve';

describe('fadeCurve', () => {
  it('rises from silence to the target volume', () => {
    // Arrange
    const volume = 0.8;

    // Act
    const curve = fadeCurve('in', volume);

    // Assert
    expect(curve[0]).toBe(0);
    expect(curve[curve.length - 1]).toBeCloseTo(volume, 5);
  });

  it('falls from the start volume to silence', () => {
    // Arrange
    const volume = 0.8;

    // Act
    const curve = fadeCurve('out', volume);

    // Assert
    expect(curve[0]).toBeCloseTo(volume, 5);
    expect(curve[curve.length - 1]).toBe(0);
  });

  it('keeps the combined power of a crossfade constant', () => {
    // Arrange
    const fadeIn = fadeCurve('in', 1);
    const fadeOut = fadeCurve('out', 1);

    // Act
    const powers = fadeIn.map((gain, index) => gain ** 2 + fadeOut[index] ** 2);

    // Assert
    powers.forEach((power) => expect(power).toBeCloseTo(1, 5));
  });

  it('is louder than a straight line at the midpoint of a fade in', () => {
    // Arrange
    const curve = fadeCurve('in', 1);

    // Act
    const middle = curve[Math.floor(curve.length / 2)];

    // Assert
    expect(middle).toBeGreaterThan(0.5);
  });
});
