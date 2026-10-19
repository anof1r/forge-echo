import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

const MIME_EXTENSIONS: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
};

const KEY_PATTERN = /^tracks\/[0-9a-f-]+\.(mp3|m4a|aac|ogg|wav|webm|flac)$/;

export function extensionForMime(mime: string): string | null {
  return MIME_EXTENSIONS[mime.toLowerCase()] ?? null;
}

export interface OpenedTrackFile {
  path: string;
  size: number;
}

export class TrackStorageService {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async save(buffer: Buffer, extension: string): Promise<string> {
    const key = `tracks/${randomUUID()}.${extension}`;
    await mkdir(join(this.root, 'tracks'), { recursive: true });
    await writeFile(join(this.root, key), buffer);
    return key;
  }

  async open(key: string): Promise<OpenedTrackFile | null> {
    const path = this.resolveKey(key);
    if (!path) return null;
    try {
      const info = await stat(path);
      return info.isFile() ? { path, size: info.size } : null;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    const path = this.resolveKey(key);
    if (path) await rm(path, { force: true });
  }

  private resolveKey(key: string): string | null {
    if (!KEY_PATTERN.test(key)) return null;
    const path = resolve(this.root, key);
    return path.startsWith(this.root + sep) ? path : null;
  }
}
