import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ForgeApi } from '../../core/forge-api';
import { LibraryStore } from '../../core/library-store';
import { Binding, StageState, Track } from '../../core/models';
import { StageStateService } from '../../core/stage-state.service';
import { WaveformFactory, WaveformHandlers } from '../../ui/waveform';
import { LibraryPage } from './library-page';

const track = (id: string, overrides: Partial<Track> = {}): Track => ({
  id, name: `Track ${id}`, kind: 'ambient', file: `tracks/${id}.mp3`, mimeType: 'audio/mpeg', sizeBytes: 1,
  startMs: 0, endMs: null, volume: 1, loop: true, createdAt: 1, updatedAt: 1, ...overrides,
});
const binding = (slideId: string, trackId: string): Binding => ({
  slideId, trackId, fadeInMs: 2000, fadeOutMs: 3000, volume: 1, updatedAt: 1,
});

describe('LibraryPage', () => {
  let store: {
    tracks: ReturnType<typeof signal<Track[]>>;
    bindings: ReturnType<typeof signal<Binding[]>>;
    oneShotGroups: ReturnType<typeof signal<{ id: string; name: string; createdAt: number; updatedAt: number }[]>>;
    error: ReturnType<typeof signal<string | null>>;
    refresh: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
    unbind: ReturnType<typeof vi.fn>;
    createOneShotGroup: ReturnType<typeof vi.fn>;
    renameOneShotGroup: ReturnType<typeof vi.fn>;
    deleteOneShotGroup: ReturnType<typeof vi.fn>;
    uploadArtwork: ReturnType<typeof vi.fn>;
  };
  let waveformHandlers: WaveformHandlers;
  const waveformCreate = vi.fn();
  let element: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<LibraryPage>>;

  const stage: StageState = {
    connection: 'connected',
    contract: 'compatible',
    presentation: { mode: 'story', activeSlideId: 's1' },
    slides: [{ id: 's1', name: 'Tavern', order: 0, mediaPath: '/media/slides/aa.webp?v=1' }],
  };

  const render = (): void => {
    fixture = TestBed.createComponent(LibraryPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    store = {
      tracks: signal([track('t1'), track('shot', { kind: 'oneshot', loop: false, name: 'Door' })]),
      bindings: signal([binding('s1', 't1')]),
      oneShotGroups: signal([{ id: 'weapons', name: 'Weapons', createdAt: 1, updatedAt: 1 }]),
      error: signal<string | null>(null),
      refresh: vi.fn().mockResolvedValue(undefined),
      upload: vi.fn().mockResolvedValue(undefined),
      patch: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      bind: vi.fn().mockResolvedValue(undefined),
      unbind: vi.fn().mockResolvedValue(undefined),
      createOneShotGroup: vi.fn().mockResolvedValue(undefined),
      renameOneShotGroup: vi.fn().mockResolvedValue(undefined),
      deleteOneShotGroup: vi.fn().mockResolvedValue(undefined),
      uploadArtwork: vi.fn().mockResolvedValue(undefined),
    };
    waveformCreate.mockReset();
    waveformCreate.mockImplementation((_container, _url, _trim, handlers: WaveformHandlers) => {
      waveformHandlers = handlers;
      return { playTrim: vi.fn(), stop: vi.fn(), destroy: vi.fn() };
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: LibraryStore, useValue: store },
        { provide: WaveformFactory, useValue: { create: waveformCreate } },
        { provide: StageStateService, useValue: { state: signal(stage) } },
        {
          provide: ForgeApi,
          useValue: {
            streamUrl: (id: string) => `/api/tracks/${id}/stream`,
            slideImageUrl: () => '/img.webp',
            artworkUrl: (item: Track) => item.imageFile ? `/art/${item.id}.webp` : null,
          },
        },
      ],
    });
  });

  it('loads the library when opened', () => {
    // Arrange - providers are set

    // Act
    render();

    // Assert
    expect(store.refresh).toHaveBeenCalledTimes(1);
  });

  it('lists every track with its name', () => {
    // Arrange - providers are set

    // Act
    render();

    // Assert
    const names = Array.from(element.querySelectorAll<HTMLInputElement>('[data-test="track-name"]')).map((input) => input.value);
    expect(names).toEqual(['Track t1', 'Door']);
  });

  it('creates groups and assigns one-shot sounds to groups', () => {
    // Arrange
    render();
    const name = element.querySelector<HTMLInputElement>('[data-test="new-group-name"]') as HTMLInputElement;
    name.value = 'Combat';

    // Act
    element.querySelector<HTMLButtonElement>('[data-test="group-create"]')?.click();
    const checkbox = element.querySelector<HTMLInputElement>('[data-test="assign-shot-weapons"]') as HTMLInputElement;
    checkbox.click();

    // Assert
    expect(store.createOneShotGroup).toHaveBeenCalledWith('Combat');
    expect(store.patch).toHaveBeenCalledWith('shot', { groupIds: ['weapons'] });
  });

  it('uploads an illustration for a one-shot tile', async () => {
    // Arrange
    render();
    const input = element.querySelector<HTMLInputElement>('[data-test="artwork-shot"]') as HTMLInputElement;
    const image = new File(['pixels'], 'door.webp', { type: 'image/webp' });
    Object.defineProperty(input, 'files', { value: [image], configurable: true });

    // Act
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    // Assert
    expect(store.uploadArtwork).toHaveBeenCalledWith('shot', image);
  });

  it('uploads the chosen file with the selected kind', () => {
    // Arrange
    render();
    const kind = element.querySelector<HTMLSelectElement>('[data-test="upload-kind"]') as HTMLSelectElement;
    kind.value = 'oneshot';
    kind.dispatchEvent(new Event('change'));
    const input = element.querySelector<HTMLInputElement>('[data-test="upload-file"]') as HTMLInputElement;
    const file = new File(['abc'], 'door.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    // Act
    input.dispatchEvent(new Event('change'));

    // Assert
    expect(store.upload).toHaveBeenCalledWith(file, 'oneshot');
  });

  it('renames a track when the name changes', () => {
    // Arrange
    render();
    const input = element.querySelector<HTMLInputElement>('[data-test="track-name"]') as HTMLInputElement;
    input.value = '  Rainy tavern ';

    // Act
    input.dispatchEvent(new Event('change'));

    // Assert
    expect(store.patch).toHaveBeenCalledWith('t1', { name: 'Rainy tavern' });
  });

  it('does not rename to an empty name', () => {
    // Arrange
    render();
    const input = element.querySelector<HTMLInputElement>('[data-test="track-name"]') as HTMLInputElement;
    input.value = '   ';

    // Act
    input.dispatchEvent(new Event('change'));

    // Assert
    expect(store.patch).not.toHaveBeenCalled();
    expect(input.value).toBe('Track t1');
  });

  it('saves trim marks converted from seconds to milliseconds', () => {
    // Arrange
    render();
    const start = element.querySelector<HTMLInputElement>('[data-test="trim-start"]') as HTMLInputElement;
    const end = element.querySelector<HTMLInputElement>('[data-test="trim-end"]') as HTMLInputElement;
    start.value = '1.5';
    end.value = '42';

    // Act
    (element.querySelector('[data-test="trim-save"]') as HTMLButtonElement).click();

    // Assert
    expect(store.patch).toHaveBeenCalledWith('t1', { startMs: 1500, endMs: 42000 });
  });

  it('treats an empty trim end as play to the end of the file', () => {
    // Arrange
    render();
    (element.querySelector('[data-test="trim-start"]') as HTMLInputElement).value = '0';
    (element.querySelector('[data-test="trim-end"]') as HTMLInputElement).value = '';

    // Act
    (element.querySelector('[data-test="trim-save"]') as HTMLButtonElement).click();

    // Assert
    expect(store.patch).toHaveBeenCalledWith('t1', { startMs: 0, endMs: null });
  });

  it('does not load any waveform until one is requested', () => {
    // Arrange
    render();

    // Act
    const editors = element.querySelectorAll('app-trim-editor');

    // Assert
    expect(editors).toHaveLength(0);
    expect(waveformCreate).not.toHaveBeenCalled();
  });

  it('shows the waveform of a track on request', () => {
    // Arrange
    render();

    // Act
    (element.querySelector('[data-test="trim-waveform"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Assert
    expect(element.querySelectorAll('app-trim-editor')).toHaveLength(1);
    expect(waveformCreate.mock.calls[0][1]).toBe('/api/tracks/t1/stream');
  });

  it('fills the trim fields from the waveform and saves them', () => {
    // Arrange
    render();
    (element.querySelector('[data-test="trim-waveform"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    waveformHandlers.ready(60);

    // Act
    waveformHandlers.trimChanged(3.5, 41);
    fixture.detectChanges();
    (element.querySelector('[data-test="trim-save"]') as HTMLButtonElement).click();

    // Assert
    expect(store.patch).toHaveBeenCalledWith('t1', { startMs: 3500, endMs: 41000 });
  });

  it('requires a second tap to delete a track', () => {
    // Arrange
    render();
    const button = (): HTMLButtonElement => element.querySelector('[data-test="track-delete"]') as HTMLButtonElement;

    // Act
    button().click();
    fixture.detectChanges();
    const afterFirst = store.remove.mock.calls.length;
    button().click();

    // Assert
    expect(afterFirst).toBe(0);
    expect(store.remove).toHaveBeenCalledWith('t1');
  });

  it('shows the slide and the track currently bound to it', () => {
    // Arrange - providers are set

    // Act
    render();

    // Assert
    const select = element.querySelector<HTMLSelectElement>('[data-test="bind-s1"]') as HTMLSelectElement;
    expect(select.value).toBe('t1');
    expect(element.querySelector('[data-test="binding-s1"]')?.textContent).toContain('Tavern');
  });

  it('offers only ambient tracks for binding', () => {
    // Arrange
    render();

    // Act
    const options = Array.from(element.querySelectorAll<HTMLOptionElement>('[data-test="bind-s1"] option')).map((o) => o.value);

    // Assert
    expect(options).toEqual(['', 't1']);
  });

  it('binds the chosen track to a slide', () => {
    // Arrange
    store.bindings.set([]);
    render();
    const select = element.querySelector<HTMLSelectElement>('[data-test="bind-s1"]') as HTMLSelectElement;
    select.value = 't1';

    // Act
    select.dispatchEvent(new Event('change'));

    // Assert
    expect(store.bind).toHaveBeenCalledWith('s1', { trackId: 't1' });
  });

  it('keeps the existing fades when the track of a binding changes', () => {
    // Arrange
    store.tracks.update((tracks) => [...tracks, track('t3')]);
    render();
    const select = element.querySelector<HTMLSelectElement>('[data-test="bind-s1"]') as HTMLSelectElement;
    select.value = 't3';

    // Act
    select.dispatchEvent(new Event('change'));

    // Assert
    expect(store.bind).toHaveBeenCalledWith('s1', { trackId: 't3', fadeInMs: 2000, fadeOutMs: 3000, volume: 1 });
  });

  it('removes the binding when no track is chosen', () => {
    // Arrange
    render();
    const select = element.querySelector<HTMLSelectElement>('[data-test="bind-s1"]') as HTMLSelectElement;
    select.value = '';

    // Act
    select.dispatchEvent(new Event('change'));

    // Assert
    expect(store.unbind).toHaveBeenCalledWith('s1');
  });

  it('lets the battle screen have its own binding', () => {
    // Arrange
    render();

    // Act
    const battle = element.querySelector('[data-test="bind-battle"]');

    // Assert
    expect(battle).not.toBeNull();
  });

  it('updates fade times in seconds', () => {
    // Arrange
    render();
    const fade = element.querySelector<HTMLInputElement>('[data-test="fade-in-s1"]') as HTMLInputElement;
    fade.value = '4';

    // Act
    fade.dispatchEvent(new Event('change'));

    // Assert
    expect(store.bind).toHaveBeenCalledWith('s1', { trackId: 't1', fadeInMs: 4000, fadeOutMs: 3000, volume: 1 });
  });

  it('shows a store error', () => {
    // Arrange
    store.error.set('Request failed.');

    // Act
    render();

    // Assert
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Request failed.');
  });
});
