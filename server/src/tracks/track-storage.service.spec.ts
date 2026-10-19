import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TrackStorageService, extensionForMime } from './track-storage.service';

describe('extensionForMime', () => {
  it.each([
    ['audio/mpeg', 'mp3'],
    ['audio/mp4', 'm4a'],
    ['audio/aac', 'aac'],
    ['audio/ogg', 'ogg'],
    ['audio/wav', 'wav'],
    ['audio/x-wav', 'wav'],
    ['audio/webm', 'webm'],
    ['audio/flac', 'flac'],
  ])('maps %s to %s', (mime, extension) => {
    // Arrange - mime comes from the table

    // Act
    const result = extensionForMime(mime);

    // Assert
    expect(result).toBe(extension);
  });

  it('returns null for unsupported types', () => {
    // Arrange
    const mime = 'application/pdf';

    // Act
    const result = extensionForMime(mime);

    // Assert
    expect(result).toBeNull();
  });
});

describe('TrackStorageService', () => {
  let root: string;
  let storage: TrackStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'forge-echo-'));
    storage = new TrackStorageService(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('saves a buffer under tracks/ with a generated name', async () => {
    // Arrange
    const buffer = Buffer.from('audio-bytes');

    // Act
    const key = await storage.save(buffer, 'mp3');

    // Assert
    expect(key).toMatch(/^tracks\/[0-9a-f-]+\.mp3$/);
    expect(await readFile(join(root, key))).toEqual(buffer);
  });

  it('opens a saved file and reports its size', async () => {
    // Arrange
    const key = await storage.save(Buffer.from('12345'), 'ogg');

    // Act
    const opened = await storage.open(key);

    // Assert
    expect(opened?.size).toBe(5);
    expect(opened?.path).toBe(join(root, key));
  });

  it('returns null when opening a missing file', async () => {
    // Arrange
    const key = 'tracks/00000000-0000-0000-0000-000000000000.mp3';

    // Act
    const opened = await storage.open(key);

    // Assert
    expect(opened).toBeNull();
  });

  it('removes a saved file', async () => {
    // Arrange
    const key = await storage.save(Buffer.from('x'), 'wav');

    // Act
    await storage.remove(key);

    // Assert
    await expect(stat(join(root, key))).rejects.toThrow();
  });

  it('does not throw when removing a missing file', async () => {
    // Arrange
    const key = 'tracks/00000000-0000-0000-0000-000000000000.mp3';

    // Act
    const act = storage.remove(key);

    // Assert
    await expect(act).resolves.toBeUndefined();
  });

  it.each(['../secret.mp3', 'tracks/../../secret.mp3', 'tracks/a.exe', '/etc/passwd'])(
    'refuses unsafe key %s',
    async (key) => {
      // Arrange - key comes from the table

      // Act
      const opened = await storage.open(key);
      const removal = storage.remove(key);

      // Assert
      expect(opened).toBeNull();
      await expect(removal).resolves.toBeUndefined();
    },
  );
});
