import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ForgeApi } from './forge-api';

describe('ForgeApi', () => {
  let api: ForgeApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ForgeApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists tracks from the server', async () => {
    // Arrange
    const pending = api.listTracks();

    // Act
    http.expectOne('/api/tracks').flush({ tracks: [{ id: 't1' }] });

    // Assert
    expect(await pending).toEqual([{ id: 't1' }] as never);
  });

  it('uploads a track as multipart with kind and name', async () => {
    // Arrange
    const file = new File(['abc'], 'a.mp3', { type: 'audio/mpeg' });
    const pending = api.uploadTrack(file, 'oneshot', 'Door');

    // Act
    const request = http.expectOne('/api/tracks');
    request.flush({ track: { id: 't1' } });

    // Assert
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body.get('kind')).toBe('oneshot');
    expect(body.get('name')).toBe('Door');
    expect((body.get('file') as File).name).toBe('a.mp3');
    expect(await pending).toEqual({ id: 't1' } as never);
  });

  it('patches a track', async () => {
    // Arrange
    const pending = api.patchTrack('t1', { startMs: 500 });

    // Act
    const request = http.expectOne('/api/tracks/t1');
    request.flush({ track: { id: 't1', startMs: 500 } });

    // Assert
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ startMs: 500 });
    expect((await pending).startMs).toBe(500);
  });

  it('puts and deletes a binding by slide id', async () => {
    // Arrange
    const put = api.putBinding('s1', { trackId: 't1', fadeInMs: 100 });
    const putRequest = http.expectOne('/api/bindings/s1');
    putRequest.flush({ binding: { slideId: 's1' } });
    await put;

    // Act
    const removal = api.deleteBinding('s1');
    const deleteRequest = http.expectOne('/api/bindings/s1');
    deleteRequest.flush({ success: true });
    await removal;

    // Assert
    expect(putRequest.request.method).toBe('PUT');
    expect(putRequest.request.body).toEqual({ trackId: 't1', fadeInMs: 100 });
    expect(deleteRequest.request.method).toBe('DELETE');
  });

  it('builds a stream url for a track', () => {
    // Arrange
    const trackId = 't1';

    // Act
    const url = api.streamUrl(trackId);

    // Assert
    expect(url).toBe('/api/tracks/t1/stream');
  });

  it('builds a proxied slide image url that keeps the version', () => {
    // Arrange
    const slide = { id: 's1', name: 'x', order: 0, mediaPath: '/media/slides/aa-1.webp?v=3' };

    // Act
    const url = api.slideImageUrl(slide);

    // Assert
    expect(url).toBe('/api/battle-forge/slides/aa-1.webp?v=3');
  });
});
