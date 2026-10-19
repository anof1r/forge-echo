import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BindingsController } from '../bindings/bindings.controller';
import { InMemoryBindingRepository, InMemoryTrackRepository } from './in-memory.repositories';
import { TrackStorageService } from './track-storage.service';
import { TracksController } from './tracks.controller';

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string | number>;
  status(code: number): void;
  setHeader(name: string, value: string | number): void;
}

const fakeResponse = (): FakeResponse => ({
  statusCode: 200,
  headers: {},
  status(code) {
    this.statusCode = code;
  },
  setHeader(name, value) {
    this.headers[name] = value;
  },
});

const upload = (content: string, mimetype = 'audio/mpeg'): Express.Multer.File =>
  ({ buffer: Buffer.from(content), mimetype, size: content.length, originalname: 'Tavern Night.mp3' }) as Express.Multer.File;

async function readStream(result: { getStream(): NodeJS.ReadableStream }): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of result.getStream()) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}

describe('TracksController and BindingsController', () => {
  let root: string;
  let storage: TrackStorageService;
  let tracks: InMemoryTrackRepository;
  let bindings: InMemoryBindingRepository;
  let tracksController: TracksController;
  let bindingsController: BindingsController;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'forge-echo-'));
    storage = new TrackStorageService(root);
    tracks = new InMemoryTrackRepository();
    bindings = new InMemoryBindingRepository();
    tracksController = new TracksController(storage, tracks, bindings);
    bindingsController = new BindingsController(tracks, bindings);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('uploads a track with defaults derived from the file name', async () => {
    // Arrange
    const file = upload('abc');

    // Act
    const { track } = await tracksController.upload({}, file);

    // Assert
    expect(track).toMatchObject({ name: 'Tavern Night', kind: 'ambient', startMs: 0, endMs: null, volume: 1, loop: true });
    expect(track.file).toMatch(/^tracks\/.+\.mp3$/);
    expect(await tracks.list()).toHaveLength(1);
  });

  it('uses the provided name and kind when uploading', async () => {
    // Arrange
    const file = upload('abc');

    // Act
    const { track } = await tracksController.upload({ name: ' Door slam ', kind: 'oneshot' }, file);

    // Assert
    expect(track).toMatchObject({ name: 'Door slam', kind: 'oneshot', loop: false });
  });

  it('rejects an unsupported mime type and stores nothing', async () => {
    // Arrange
    const file = upload('abc', 'application/pdf');

    // Act
    const act = tracksController.upload({}, file);

    // Assert
    await expect(act).rejects.toThrow(/unsupported/i);
    expect(await tracks.list()).toHaveLength(0);
  });

  it('rejects a request without a file', async () => {
    // Arrange
    const file = undefined;

    // Act
    const act = tracksController.upload({}, file);

    // Assert
    await expect(act).rejects.toThrow(/file/i);
  });

  it('lists tracks newest first', async () => {
    // Arrange
    const first = (await tracksController.upload({ name: 'A' }, upload('1'))).track;
    const second = (await tracksController.upload({ name: 'B' }, upload('2'))).track;

    // Act
    const result = await tracksController.list();

    // Assert
    expect(result.tracks.map((track) => track.id)).toEqual([second.id, first.id]);
  });

  it('patches trim marks and volume', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('abc'));

    // Act
    const result = await tracksController.patch(track.id, { startMs: 2000, endMs: 9000, volume: 0.4 });

    // Assert
    expect(result.track).toMatchObject({ startMs: 2000, endMs: 9000, volume: 0.4 });
  });

  it('rejects an invalid patch', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('abc'));

    // Act
    const act = tracksController.patch(track.id, { volume: 5 });

    // Assert
    await expect(act).rejects.toThrow(/volume/);
  });

  it('answers 404 when patching a missing track', async () => {
    // Arrange
    const id = 'missing-id';

    // Act
    const act = tracksController.patch(id, { volume: 0.5 });

    // Assert
    await expect(act).rejects.toThrow(/not found/i);
  });

  it('deletes a track, its file and its bindings', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('abc'));
    await bindingsController.put('aaa-111', { trackId: track.id });

    // Act
    await tracksController.remove(track.id);

    // Assert
    expect(await tracks.list()).toHaveLength(0);
    expect(await bindings.list()).toHaveLength(0);
    expect(await storage.open(track.file)).toBeNull();
  });

  it('streams the whole file with range support advertised', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('0123456789'));
    const response = fakeResponse();

    // Act
    const result = await tracksController.stream(track.id, undefined, response);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.headers['Accept-Ranges']).toBe('bytes');
    expect(response.headers['Content-Length']).toBe(10);
    expect(response.headers['Content-Type']).toBe('audio/mpeg');
    expect(await readStream(result)).toBe('0123456789');
  });

  it('streams a partial chunk with 206 and Content-Range', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('0123456789'));
    const response = fakeResponse();

    // Act
    const result = await tracksController.stream(track.id, 'bytes=2-5', response);

    // Assert
    expect(response.statusCode).toBe(206);
    expect(response.headers['Content-Range']).toBe('bytes 2-5/10');
    expect(response.headers['Content-Length']).toBe(4);
    expect(await readStream(result)).toBe('2345');
  });

  it('answers 416 for a range outside the file', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('0123456789'));
    const response = fakeResponse();

    // Act
    const act = tracksController.stream(track.id, 'bytes=50-60', response);

    // Assert
    await expect(act).rejects.toMatchObject({ status: 416 });
  });

  it('answers 404 when streaming a missing track', async () => {
    // Arrange
    const response = fakeResponse();

    // Act
    const act = tracksController.stream('missing-id', undefined, response);

    // Assert
    await expect(act).rejects.toThrow(/not found/i);
  });

  it('binds a track to a slide with defaults', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('abc'));

    // Act
    const result = await bindingsController.put('aaa-111', { trackId: track.id });

    // Assert
    expect(result.binding).toMatchObject({ slideId: 'aaa-111', trackId: track.id, fadeInMs: 4000, fadeOutMs: 4000, volume: 1 });
  });

  it('replaces an existing binding for the same slide', async () => {
    // Arrange
    const first = (await tracksController.upload({}, upload('a'))).track;
    const second = (await tracksController.upload({}, upload('b'))).track;
    await bindingsController.put('aaa-111', { trackId: first.id });

    // Act
    await bindingsController.put('aaa-111', { trackId: second.id, fadeInMs: 500 });

    // Assert
    const list = (await bindingsController.list()).bindings;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ trackId: second.id, fadeInMs: 500 });
  });

  it('refuses to bind an unknown track', async () => {
    // Arrange
    const trackId = 'nope';

    // Act
    const act = bindingsController.put('aaa-111', { trackId });

    // Assert
    await expect(act).rejects.toThrow(/track/i);
  });

  it('refuses an invalid slide id', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('abc'));

    // Act
    const act = bindingsController.put('../bad', { trackId: track.id });

    // Assert
    await expect(act).rejects.toThrow(/slide/i);
  });

  it('removes a binding and answers 404 when it is missing', async () => {
    // Arrange
    const { track } = await tracksController.upload({}, upload('abc'));
    await bindingsController.put('aaa-111', { trackId: track.id });

    // Act
    await bindingsController.remove('aaa-111');
    const again = bindingsController.remove('aaa-111');

    // Assert
    expect(await bindings.list()).toHaveLength(0);
    await expect(again).rejects.toThrow(/not found/i);
  });
});
