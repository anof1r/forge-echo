import { Binding, Presentation, Track } from './models';
import { planPlayback } from './playback-planner';

const track = (id: string, overrides: Partial<Track> = {}): Track => ({
  id,
  name: id,
  kind: 'ambient',
  file: `tracks/${id}.mp3`,
  mimeType: 'audio/mpeg',
  sizeBytes: 1,
  startMs: 0,
  endMs: null,
  volume: 1,
  loop: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const binding = (slideId: string, trackId: string, overrides: Partial<Binding> = {}): Binding => ({
  slideId,
  trackId,
  fadeInMs: 2000,
  fadeOutMs: 1000,
  volume: 0.8,
  updatedAt: 1,
  ...overrides,
});

const story = (activeSlideId: string | null): Presentation => ({ mode: 'story', activeSlideId });

describe('planPlayback', () => {
  const tracks = [track('t1'), track('t2')];

  it('plays the bound track when a bound slide becomes active', () => {
    // Arrange
    const input = { presentation: story('s1'), bindings: [binding('s1', 't1')], tracks, currentTrackId: null, manual: false };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toEqual({ type: 'play', trackId: 't1', fadeInMs: 2000, fadeOutMs: 1000, volume: 0.8 });
  });

  it('does nothing when the bound track is already playing', () => {
    // Arrange
    const input = { presentation: story('s2'), bindings: [binding('s2', 't1')], tracks, currentTrackId: 't1', manual: false };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toEqual({ type: 'none' });
  });

  it('crossfades to a different bound track', () => {
    // Arrange
    const input = { presentation: story('s2'), bindings: [binding('s2', 't2')], tracks, currentTrackId: 't1', manual: false };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toMatchObject({ type: 'play', trackId: 't2' });
  });

  it('keeps the previous track playing on a slide without a binding', () => {
    // Arrange
    const input = { presentation: story('s3'), bindings: [binding('s1', 't1')], tracks, currentTrackId: 't1', manual: false };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toEqual({ type: 'none' });
  });

  it('does nothing when no slide is active', () => {
    // Arrange
    const input = { presentation: story(null), bindings: [binding('s1', 't1')], tracks, currentTrackId: null, manual: false };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toEqual({ type: 'none' });
  });

  it('uses the battle binding when the battle screen is shown', () => {
    // Arrange
    const input = {
      presentation: { mode: 'battle', activeSlideId: 's1' } as Presentation,
      bindings: [binding('s1', 't1'), binding('battle', 't2')],
      tracks,
      currentTrackId: 't1',
      manual: false,
    };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toMatchObject({ type: 'play', trackId: 't2' });
  });

  it('ignores a binding whose track no longer exists', () => {
    // Arrange
    const input = { presentation: story('s1'), bindings: [binding('s1', 'gone')], tracks, currentTrackId: null, manual: false };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toEqual({ type: 'none' });
  });

  it('does nothing in manual mode even for a bound slide', () => {
    // Arrange
    const input = { presentation: story('s1'), bindings: [binding('s1', 't1')], tracks, currentTrackId: null, manual: true };

    // Act
    const action = planPlayback(input);

    // Assert
    expect(action).toEqual({ type: 'none' });
  });
});
