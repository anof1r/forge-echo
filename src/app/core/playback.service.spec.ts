import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AudioBackend, PlayRequest, VoiceHandle } from './audio-backend';
import { ForgeApi } from './forge-api';
import { LibraryStore } from './library-store';
import { Binding, StageState, Track } from './models';
import { PlaybackService } from './playback.service';
import { StageStateService } from './stage-state.service';

class FakeVoice implements VoiceHandle {
  stoppedWith: number | null = null;
  paused = false;
  constructor(readonly request: PlayRequest, readonly onEnded: () => void) {}
  stop(fadeOutMs: number): void {
    this.stoppedWith = fadeOutMs;
  }
  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }
}

class FakeBackend extends AudioBackend {
  voices: FakeVoice[] = [];
  resumed = 0;
  master = 1;
  async resume(): Promise<void> {
    this.resumed += 1;
  }
  setMasterVolume(volume: number): void {
    this.master = volume;
  }
  play(request: PlayRequest, onEnded: () => void): VoiceHandle {
    const voice = new FakeVoice(request, onEnded);
    this.voices.push(voice);
    return voice;
  }
}

const track = (id: string, overrides: Partial<Track> = {}): Track => ({
  id, name: id, kind: 'ambient', file: `tracks/${id}.mp3`, mimeType: 'audio/mpeg', sizeBytes: 1,
  startMs: 1000, endMs: 9000, volume: 0.5, loop: true, createdAt: 1, updatedAt: 1, ...overrides,
});
const binding = (slideId: string, trackId: string): Binding => ({
  slideId, trackId, fadeInMs: 2000, fadeOutMs: 1000, volume: 0.8, updatedAt: 1,
});
const stage = (activeSlideId: string | null): StageState => ({
  connection: 'connected',
  contract: 'compatible',
  presentation: { mode: 'story', activeSlideId },
  slides: [],
});

describe('PlaybackService', () => {
  let backend: FakeBackend;
  let state: ReturnType<typeof signal<StageState>>;
  let service: PlaybackService;

  const select = (slideId: string | null): void => {
    state.set(stage(slideId));
    TestBed.tick();
  };

  beforeEach(() => {
    backend = new FakeBackend();
    state = signal(stage(null));
    TestBed.configureTestingModule({
      providers: [
        { provide: AudioBackend, useValue: backend },
        { provide: StageStateService, useValue: { state } },
        { provide: ForgeApi, useValue: { streamUrl: (id: string) => `/api/tracks/${id}/stream` } },
        {
          provide: LibraryStore,
          useValue: {
            tracks: signal([track('t1'), track('t2'), track('shot', { kind: 'oneshot', loop: false, volume: 1 })]),
            bindings: signal([binding('s1', 't1'), binding('s2', 't2')]),
          },
        },
      ],
    });
    service = TestBed.inject(PlaybackService);
  });

  it('stays silent until the session is started', () => {
    // Arrange - nothing started

    // Act
    select('s1');

    // Assert
    expect(backend.voices).toHaveLength(0);
    expect(service.started()).toBe(false);
  });

  it('resumes audio and plays the bound track when the session starts', async () => {
    // Arrange
    select('s1');

    // Act
    await service.startSession();
    TestBed.tick();

    // Assert
    expect(backend.resumed).toBe(1);
    expect(backend.voices).toHaveLength(1);
    expect(backend.voices[0].request).toEqual({
      url: '/api/tracks/t1/stream', startMs: 1000, endMs: 9000, loop: true, volume: 0.4, fadeInMs: 2000,
    });
    expect(service.nowPlaying()?.id).toBe('t1');
  });

  it('crossfades by fading out the previous voice with the new binding fade out', async () => {
    // Arrange
    await service.startSession();
    select('s1');

    // Act
    select('s2');

    // Assert
    expect(backend.voices).toHaveLength(2);
    expect(backend.voices[0].stoppedWith).toBe(1000);
    expect(service.nowPlaying()?.id).toBe('t2');
  });

  it('does not restart the same track when another slide uses it', async () => {
    // Arrange
    await service.startSession();
    select('s1');

    // Act
    select(null);
    select('s1');

    // Assert
    expect(backend.voices).toHaveLength(1);
  });

  it('keeps playing on a slide without a binding', async () => {
    // Arrange
    await service.startSession();
    select('s1');

    // Act
    select('unbound');

    // Assert
    expect(backend.voices).toHaveLength(1);
    expect(backend.voices[0].stoppedWith).toBeNull();
    expect(service.nowPlaying()?.id).toBe('t1');
  });

  it('manual play overrides slide changes until back to auto', async () => {
    // Arrange
    await service.startSession();
    select('s1');
    service.playManual(track('t2'));

    // Act
    select('s2');
    const whileManual = backend.voices.length;
    service.backToAuto();
    TestBed.tick();

    // Assert
    expect(service.manual()).toBe(false);
    expect(whileManual).toBe(2);
    expect(backend.voices).toHaveLength(2);
    expect(service.nowPlaying()?.id).toBe('t2');
  });

  it('holding freezes the current track while scenes keep changing', async () => {
    // Arrange
    await service.startSession();
    select('s1');
    service.hold();

    // Act
    select('s2');
    TestBed.tick();

    // Assert
    expect(service.manual()).toBe(true);
    expect(service.nowPlaying()?.id).toBe('t1');
    expect(backend.voices).toHaveLength(1);
  });

  it('pauses and resumes the current ambient voice without changing follow mode', async () => {
    // Arrange
    await service.startSession();
    select('s1');

    // Act
    service.togglePause();
    const pausedAfterFirstTap = service.paused();
    service.togglePause();

    // Assert
    expect(pausedAfterFirstTap).toBe(true);
    expect(service.paused()).toBe(false);
    expect(service.manual()).toBe(false);
    expect(backend.voices).toHaveLength(1);
  });

  it('returning to auto switches to the track of the current slide', async () => {
    // Arrange
    await service.startSession();
    select('s1');
    service.playManual(track('t2'));

    // Act
    service.backToAuto();
    TestBed.tick();

    // Assert
    expect(service.nowPlaying()?.id).toBe('t1');
    expect(backend.voices).toHaveLength(3);
  });

  it('stop fades out and keeps silence until back to auto', async () => {
    // Arrange
    await service.startSession();
    select('s1');

    // Act
    service.stopAmbient();
    select('s2');

    // Assert
    expect(backend.voices[0].stoppedWith).toBe(4000);
    expect(service.nowPlaying()).toBeNull();
    expect(service.manual()).toBe(true);
    expect(backend.voices).toHaveLength(1);
  });

  it('plays a one-shot without touching the ambient track', async () => {
    // Arrange
    await service.startSession();
    select('s1');

    // Act
    service.playOneShot(track('shot', { kind: 'oneshot', loop: false, volume: 1, startMs: 0, endMs: null }));

    // Assert
    expect(backend.voices).toHaveLength(2);
    expect(backend.voices[1].request).toMatchObject({ loop: false, fadeInMs: 0, volume: 1 });
    expect(backend.voices[0].stoppedWith).toBeNull();
    expect(service.nowPlaying()?.id).toBe('t1');
  });

  it('ignores one-shots before the session starts', () => {
    // Arrange - session not started

    // Act
    service.playOneShot(track('shot'));

    // Assert
    expect(backend.voices).toHaveLength(0);
  });

  it('clears now playing when a non-looping ambient track ends by itself', async () => {
    // Arrange
    await service.startSession();
    service.playManual(track('t2', { loop: false }));

    // Act
    backend.voices[0].onEnded();

    // Assert
    expect(service.nowPlaying()).toBeNull();
  });

  it('forwards the master volume to the backend and clamps it', () => {
    // Arrange - fresh service

    // Act
    service.setMasterVolume(0.03);
    const quietGain = backend.master;
    service.setMasterVolume(0);
    const silentGain = backend.master;
    service.setMasterVolume(7);
    const maxGain = backend.master;

    // Assert
    expect(quietGain).toBeCloseTo(10 ** (-58.2 / 20), 8);
    expect(silentGain).toBe(0);
    expect(maxGain).toBe(1);
    expect(service.masterVolume()).toBe(1);
  });
});
