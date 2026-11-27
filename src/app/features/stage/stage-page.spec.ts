import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ForgeApi } from '../../core/forge-api';
import { LibraryStore } from '../../core/library-store';
import { StageState, Track } from '../../core/models';
import { PlaybackService } from '../../core/playback.service';
import { StageStateService } from '../../core/stage-state.service';
import { StagePage } from './stage-page';

const track = (id: string, overrides: Partial<Track> = {}): Track => ({
  id, name: `Track ${id}`, kind: 'ambient', file: `tracks/${id}.mp3`, mimeType: 'audio/mpeg', sizeBytes: 1,
  startMs: 0, endMs: null, volume: 1, loop: true, createdAt: 1, updatedAt: 1, ...overrides,
});

describe('StagePage', () => {
  let playback: {
    started: ReturnType<typeof signal<boolean>>;
    manual: ReturnType<typeof signal<boolean>>;
    masterVolume: ReturnType<typeof signal<number>>;
    paused: ReturnType<typeof signal<boolean>>;
    nowPlayingProgress: ReturnType<typeof signal<{ positionMs: number; durationMs: number } | null>>;
    nowPlaying: ReturnType<typeof signal<Track | null>>;
    startSession: ReturnType<typeof vi.fn>;
    playManual: ReturnType<typeof vi.fn>;
    playOneShot: ReturnType<typeof vi.fn>;
    backToAuto: ReturnType<typeof vi.fn>;
    hold: ReturnType<typeof vi.fn>;
    stopAmbient: ReturnType<typeof vi.fn>;
    togglePause: ReturnType<typeof vi.fn>;
    setMasterVolume: ReturnType<typeof vi.fn>;
  };
  let stageState: ReturnType<typeof signal<StageState>>;
  let tracks: ReturnType<typeof signal<Track[]>>;
  let oneShotGroups: ReturnType<typeof signal<{ id: string; name: string; createdAt: number; updatedAt: number }[]>>;
  let element: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<StagePage>>;
  const refresh = vi.fn().mockResolvedValue(undefined);

  const render = (): void => {
    fixture = TestBed.createComponent(StagePage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  };
  const query = <T extends HTMLElement>(selector: string): T => element.querySelector(selector) as T;

  beforeEach(() => {
    refresh.mockClear();
    playback = {
      started: signal(false),
      manual: signal(false),
      masterVolume: signal(1),
      paused: signal(false),
      nowPlayingProgress: signal<{ positionMs: number; durationMs: number } | null>(null),
      nowPlaying: signal<Track | null>(null),
      startSession: vi.fn().mockImplementation(async () => playback.started.set(true)),
      playManual: vi.fn(),
      playOneShot: vi.fn(),
      backToAuto: vi.fn(),
      hold: vi.fn(),
      stopAmbient: vi.fn(),
      togglePause: vi.fn().mockImplementation(() => playback.paused.update((value) => !value)),
      setMasterVolume: vi.fn(),
    };
    stageState = signal<StageState>({
      connection: 'connected',
      contract: 'compatible',
      presentation: { mode: 'story', activeSlideId: 's1' },
      slides: [{ id: 's1', name: 'Tavern', order: 0, mediaPath: '/media/slides/aa.webp?v=1' }],
    });
    tracks = signal([track('t1'), track('t2'), track('shot', { kind: 'oneshot', name: 'Door', loop: false })]);
    oneShotGroups = signal([]);
    TestBed.configureTestingModule({
      providers: [
        { provide: PlaybackService, useValue: playback },
        { provide: StageStateService, useValue: { state: stageState, serverReachable: signal(true) } },
        {
          provide: LibraryStore,
          useValue: { refresh, tracks, oneShotGroups },
        },
        {
          provide: ForgeApi,
          useValue: {
            slideImageUrl: () => '/img.webp',
            artworkUrl: (item: Track) => item.imageFile ? `/art/${item.id}.webp` : null,
          },
        },
      ],
    });
  });

  it('asks to start the session before anything else', () => {
    // Arrange - session not started

    // Act
    render();

    // Assert
    expect(query('[data-test="start-session"]')).not.toBeNull();
    expect(query('[data-test="now-playing"]')).toBeNull();
  });

  it('starts the session on tap and reveals the controls', async () => {
    // Arrange
    render();

    // Act
    query<HTMLButtonElement>('[data-test="start-session"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    // Assert
    expect(playback.startSession).toHaveBeenCalledTimes(1);
    expect(query('[data-test="start-session"]')).toBeNull();
    expect(query('[data-test="now-playing"]')).not.toBeNull();
  });

  it('loads the library when opened', () => {
    // Arrange - providers are set

    // Act
    render();

    // Assert
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  describe('after the session started', () => {
    beforeEach(() => playback.started.set(true));

    it('shows silence when nothing plays', () => {
      // Arrange - nothing playing

      // Act
      render();

      // Assert
      expect(query('[data-test="now-playing"]').textContent).toContain('Silence');
    });

    it('shows elapsed time, duration, and progress for the ambient track', () => {
      // Arrange
      playback.nowPlaying.set(track('t1'));
      playback.nowPlayingProgress.set({ positionMs: 65000, durationMs: 190000 });

      // Act
      render();

      // Assert
      expect(query('[data-test="playback-time"]').textContent).toContain('1:05');
      expect(query('[data-test="playback-time"]').textContent).toContain('3:10');
      expect(query<HTMLElement>('[data-test="playback-progress-fill"]').style.width).toBe('34.2%');
    });

    it('shows the playing track and follows scenes by default', () => {
      // Arrange
      playback.nowPlaying.set(track('t1'));

      // Act
      render();

      // Assert
      expect(query('[data-test="now-playing"]').textContent).toContain('Track t1');
      expect(query('[data-test="mode"] [aria-checked="true"]').textContent).toContain('Follow scenes');
    });

    it('puts the current scene and playback status in a clear summary', () => {
      // Arrange
      playback.nowPlaying.set(track('t1'));

      // Act
      render();

      // Assert
      expect(query('[data-test="scene-summary"]').textContent).toContain('Tavern');
      expect(query('[data-test="playback-summary"]').textContent).toContain('Track t1');
      expect(query('[data-test="stage-status"]').textContent).toContain('Following scenes');
    });

    it('shows the hold mode when the sound is taken over manually', () => {
      // Arrange
      playback.manual.set(true);

      // Act
      render();

      // Assert
      expect(query('[data-test="mode"] [aria-checked="true"]').textContent).toContain('Hold');
    });

    it('goes back to following scenes when that mode is picked', () => {
      // Arrange
      playback.manual.set(true);
      render();

      // Act
      query<HTMLButtonElement>('[data-test="mode-option-auto"]').click();

      // Assert
      expect(playback.backToAuto).toHaveBeenCalledTimes(1);
    });

    it('holds the current sound when that mode is picked', () => {
      // Arrange
      render();

      // Act
      query<HTMLButtonElement>('[data-test="mode-option-manual"]').click();

      // Assert
      expect(playback.hold).toHaveBeenCalledTimes(1);
    });
    it('shows a pause control and changes it to play when paused', () => {
      // Arrange
      render();

      // Act
      query<HTMLButtonElement>('[data-test="play-pause"]').click();
      fixture.detectChanges();

      // Assert
      expect(playback.togglePause).toHaveBeenCalledTimes(1);
      expect(element.querySelector('[data-test="stop"]')).toBeNull();
      expect(query<HTMLButtonElement>('[data-test="play-pause"]').getAttribute('aria-label')).toBe('Resume ambient sound');
      expect(query('[data-test="play-pause"]').textContent).toContain('Play');
    });

    it('plays an ambient track manually when tapped', () => {
      // Arrange
      render();

      // Act
      query<HTMLButtonElement>('[data-test="ambient-t2"]').click();

      // Assert
      expect(playback.playManual).toHaveBeenCalledWith(expect.objectContaining({ id: 't2' }));
    });

    it('fires a one-shot pad', () => {
      // Arrange
      render();

      // Act
      query<HTMLButtonElement>('[data-test="oneshot-shot"]').click();

      // Assert
      expect(playback.playOneShot).toHaveBeenCalledWith(expect.objectContaining({ id: 'shot' }));
      expect(element.querySelectorAll('[data-test^="ambient-"]')).toHaveLength(2);
    });

    it('shows image tiles for the selected one-shot group', () => {
      // Arrange
      tracks.set([
        track('axe', { kind: 'oneshot', name: 'Axe', groupIds: ['weapons'], imageFile: 'artwork/axe.webp' }),
        track('arrow', { kind: 'oneshot', name: 'Arrow', groupIds: ['weapons'] }),
        track('spell', { kind: 'oneshot', name: 'Spell', groupIds: ['magic'] }),
      ]);
      oneShotGroups.set([
        { id: 'weapons', name: 'Weapons', createdAt: 1, updatedAt: 1 },
        { id: 'magic', name: 'Magic', createdAt: 2, updatedAt: 2 },
      ]);

      // Act
      render();

      // Assert
      expect(query<HTMLSelectElement>('[data-test="oneshot-group-select"]').value).toBe('weapons');
      expect(query('[data-test="oneshot-axe"]')).not.toBeNull();
      expect(query('[data-test="oneshot-axe"] img').getAttribute('src')).toBe('/art/axe.webp');
      expect(query('[data-test="oneshot-arrow"]')).not.toBeNull();
      expect(element.querySelector('[data-test="oneshot-spell"]')).toBeNull();

      // Act
      const groupPicker = query<HTMLSelectElement>('[data-test="oneshot-group-select"]');
      groupPicker.value = 'magic';
      groupPicker.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Assert
      expect(element.querySelector('[data-test="oneshot-spell"]')).not.toBeNull();
      expect(element.querySelector('[data-test="oneshot-axe"]')).toBeNull();
    });

    it('changes the master volume from the intensity slider', () => {
      // Arrange
      playback.masterVolume.set(0.5);
      render();
      const slider = query('[data-test="master-volume"] [role="slider"]');

      // Act
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      // Assert
      expect(playback.setMasterVolume).toHaveBeenCalledWith(0.45);
    });
    it('shows the current slide and warns when Battle Forge is unreachable', () => {
      // Arrange
      stageState.update((state) => ({ ...state, connection: 'disconnected' }));

      // Act
      render();

      // Assert
      expect(query('[data-test="current-slide"]').textContent).toContain('Tavern');
      expect(query('[data-test="connection"]').textContent).toContain('Battle Forge offline');
    });

    it('warns when the Battle Forge contract is incompatible', () => {
      // Arrange
      stageState.update((state) => ({ ...state, contract: 'incompatible' }));

      // Act
      render();

      // Assert
      expect(query('[data-test="contract-warning"]').textContent).toContain('update');
    });

    it('shows no contract warning when the contract is compatible', () => {
      // Arrange
      stageState.update((state) => ({ ...state, contract: 'compatible' }));

      // Act
      render();

      // Assert
      expect(fixture.nativeElement.querySelector('[data-test="contract-warning"]')).toBeNull();
    });
  });
});
