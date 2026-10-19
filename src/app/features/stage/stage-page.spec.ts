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
    nowPlaying: ReturnType<typeof signal<Track | null>>;
    startSession: ReturnType<typeof vi.fn>;
    playManual: ReturnType<typeof vi.fn>;
    playOneShot: ReturnType<typeof vi.fn>;
    backToAuto: ReturnType<typeof vi.fn>;
    hold: ReturnType<typeof vi.fn>;
    stopAmbient: ReturnType<typeof vi.fn>;
    setMasterVolume: ReturnType<typeof vi.fn>;
  };
  let stageState: ReturnType<typeof signal<StageState>>;
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
      nowPlaying: signal<Track | null>(null),
      startSession: vi.fn().mockImplementation(async () => playback.started.set(true)),
      playManual: vi.fn(),
      playOneShot: vi.fn(),
      backToAuto: vi.fn(),
      hold: vi.fn(),
      stopAmbient: vi.fn(),
      setMasterVolume: vi.fn(),
    };
    stageState = signal<StageState>({
      connection: 'connected',
      contract: 'compatible',
      presentation: { mode: 'story', activeSlideId: 's1' },
      slides: [{ id: 's1', name: 'Tavern', order: 0, mediaPath: '/media/slides/aa.webp?v=1' }],
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: PlaybackService, useValue: playback },
        { provide: StageStateService, useValue: { state: stageState, serverReachable: signal(true) } },
        {
          provide: LibraryStore,
          useValue: { refresh, tracks: signal([track('t1'), track('t2'), track('shot', { kind: 'oneshot', name: 'Door' })]) },
        },
        { provide: ForgeApi, useValue: { slideImageUrl: () => '/img.webp' } },
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

    it('shows the playing track and follows scenes by default', () => {
      // Arrange
      playback.nowPlaying.set(track('t1'));

      // Act
      render();

      // Assert
      expect(query('[data-test="now-playing"]').textContent).toContain('Track t1');
      expect(query('[data-test="mode"] [aria-checked="true"]').textContent).toContain('Follow scenes');
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
    it('stops the ambient track', () => {
      // Arrange
      render();

      // Act
      query<HTMLButtonElement>('[data-test="stop"]').click();

      // Assert
      expect(playback.stopAmbient).toHaveBeenCalledTimes(1);
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
