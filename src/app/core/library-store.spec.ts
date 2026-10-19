import { TestBed } from '@angular/core/testing';
import { ForgeApi } from './forge-api';
import { LibraryStore } from './library-store';
import { Binding, Track } from './models';

const track = (id: string): Track => ({
  id, name: id, kind: 'ambient', file: `tracks/${id}.mp3`, mimeType: 'audio/mpeg', sizeBytes: 1,
  startMs: 0, endMs: null, volume: 1, loop: true, createdAt: 1, updatedAt: 1,
});
const binding = (slideId: string, trackId: string): Binding => ({
  slideId, trackId, fadeInMs: 1500, fadeOutMs: 1500, volume: 1, updatedAt: 1,
});

describe('LibraryStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: LibraryStore;

  beforeEach(() => {
    api = {
      listTracks: vi.fn().mockResolvedValue([track('t1')]),
      listBindings: vi.fn().mockResolvedValue([binding('s1', 't1')]),
      uploadTrack: vi.fn().mockResolvedValue(track('t2')),
      patchTrack: vi.fn().mockResolvedValue({ ...track('t1'), name: 'Renamed' }),
      deleteTrack: vi.fn().mockResolvedValue(undefined),
      putBinding: vi.fn().mockResolvedValue(binding('s2', 't1')),
      deleteBinding: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ForgeApi, useValue: api }] });
    store = TestBed.inject(LibraryStore);
  });

  it('loads tracks and bindings on refresh', async () => {
    // Arrange - store starts empty

    // Act
    await store.refresh();

    // Assert
    expect(store.tracks().map((item) => item.id)).toEqual(['t1']);
    expect(store.bindings().map((item) => item.slideId)).toEqual(['s1']);
  });

  it('puts an uploaded track first in the list', async () => {
    // Arrange
    await store.refresh();

    // Act
    await store.upload(new File(['a'], 'a.mp3'), 'ambient');

    // Assert
    expect(store.tracks().map((item) => item.id)).toEqual(['t2', 't1']);
  });

  it('replaces a track after a patch', async () => {
    // Arrange
    await store.refresh();

    // Act
    await store.patch('t1', { name: 'Renamed' });

    // Assert
    expect(store.tracks()[0].name).toBe('Renamed');
  });

  it('drops the bindings of a removed track', async () => {
    // Arrange
    await store.refresh();

    // Act
    await store.remove('t1');

    // Assert
    expect(store.tracks()).toEqual([]);
    expect(store.bindings()).toEqual([]);
  });

  it('adds a binding and removes it again', async () => {
    // Arrange
    await store.refresh();

    // Act
    await store.bind('s2', { trackId: 't1' });
    const afterBind = store.bindings().map((item) => item.slideId);
    await store.unbind('s2');

    // Assert
    expect(afterBind).toEqual(['s1', 's2']);
    expect(store.bindings().map((item) => item.slideId)).toEqual(['s1']);
  });

  it('exposes a friendly error when a request fails and keeps the data', async () => {
    // Arrange
    await store.refresh();
    api['deleteTrack'].mockRejectedValue(new Error('boom'));

    // Act
    await store.remove('t1');

    // Assert
    expect(store.error()).toContain('Request failed');
    expect(store.tracks()).toHaveLength(1);
  });
});
