import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { parseRange } from '../media/http-range';
import { BindingRepository, TrackRepository } from './repositories';
import { ID_PATTERN, parseTrackPatch } from './track-input';
import { Track } from './track.model';
import { TrackStorageService, extensionForMime } from './track-storage.service';

const MAX_TRACK_BYTES = 200 * 1024 * 1024;

interface StreamResponse {
  status(code: number): unknown;
  setHeader(name: string, value: string | number): unknown;
}

@Controller('api/tracks')
export class TracksController {
  constructor(
    private readonly storage: TrackStorageService,
    private readonly tracks: TrackRepository,
    private readonly bindings: BindingRepository,
  ) {}

  @Get()
  async list(): Promise<{ tracks: Track[] }> {
    return { tracks: await this.tracks.list() };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: MAX_TRACK_BYTES } }))
  async upload(@Body() body: unknown, @UploadedFile() file: Express.Multer.File | undefined): Promise<{ track: Track }> {
    if (!file) throw new BadRequestException('An audio file is required.');
    const extension = extensionForMime(file.mimetype);
    if (!extension) throw new BadRequestException('Unsupported audio type.');

    const fields = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const parsed = parseTrackPatch({
      name: typeof fields['name'] === 'string' && fields['name'].trim() ? fields['name'] : defaultName(file.originalname),
      kind: fields['kind'] ?? 'ambient',
    });
    if (!parsed.ok) throw new BadRequestException(parsed.error);

    const kind = parsed.value.kind ?? 'ambient';
    const now = Date.now();
    const key = await this.storage.save(file.buffer, extension);
    const track: Track = {
      id: randomUUID(),
      name: parsed.value.name ?? 'Untitled',
      kind,
      file: key,
      mimeType: file.mimetype.toLowerCase(),
      sizeBytes: file.buffer.length,
      startMs: 0,
      endMs: null,
      volume: 1,
      loop: kind === 'ambient',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.tracks.insert(track);
    } catch (error) {
      await this.storage.remove(key);
      throw error;
    }
    return { track };
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: unknown): Promise<{ track: Track }> {
    this.assertId(id);
    const parsed = parseTrackPatch(body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    const track = await this.tracks.update(id, parsed.value, Date.now());
    if (!track) throw new NotFoundException('Track was not found.');
    return { track };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    this.assertId(id);
    const track = await this.tracks.get(id);
    if (!track) throw new NotFoundException('Track was not found.');
    await this.bindings.removeByTrack(id);
    await this.tracks.remove(id);
    await this.storage.remove(track.file);
    return { success: true };
  }

  @Get(':id/stream')
  async stream(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) response: StreamResponse,
  ): Promise<StreamableFile> {
    this.assertId(id);
    const track = await this.tracks.get(id);
    const file = track ? await this.storage.open(track.file) : null;
    if (!track || !file) throw new NotFoundException('Track was not found.');

    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Type', track.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

    const parsed = parseRange(range, file.size);
    if (parsed === 'unsatisfiable') {
      response.setHeader('Content-Range', `bytes */${file.size}`);
      throw new HttpException('Range not satisfiable.', 416);
    }
    if (!parsed) {
      response.setHeader('Content-Length', file.size);
      return new StreamableFile(createReadStream(file.path));
    }

    response.status(206);
    response.setHeader('Content-Range', `bytes ${parsed.start}-${parsed.end}/${file.size}`);
    response.setHeader('Content-Length', parsed.end - parsed.start + 1);
    return new StreamableFile(createReadStream(file.path, { start: parsed.start, end: parsed.end }));
  }

  private assertId(id: string): void {
    if (!ID_PATTERN.test(id)) throw new BadRequestException('Invalid track identifier.');
  }
}

function defaultName(originalName: string): string {
  // Multer decodes multipart file names as latin1; restore UTF-8.
  const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
  const base = decoded.replace(/\.[^.]+$/, '').trim().slice(0, 80);
  return base || 'Untitled';
}
