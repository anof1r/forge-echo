import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Readable } from 'node:stream';

type Fetcher = (url: string) => Promise<Response>;
export const BATTLE_FORGE_URL = 'BATTLE_FORGE_URL';
export const SLIDE_FETCHER = 'SLIDE_FETCHER';
interface Reply {
  setHeader(name: string, value: string): unknown;
}

const SLIDE_FILE = /^[0-9a-f-]+\.webp$/;

// Proxies slide images so phones never need a route to the Battle Forge host.
@Controller('api/battle-forge/slides')
export class SlideMediaController {
  constructor(
    @Inject(BATTLE_FORGE_URL) private readonly battleForgeUrl: string,
    @Optional() @Inject(SLIDE_FETCHER) private readonly fetcher: Fetcher = (url) => fetch(url),
  ) {}

  @Get(':file')
  async get(@Param('file') file: string, @Res({ passthrough: true }) reply: Reply): Promise<StreamableFile> {
    if (!SLIDE_FILE.test(file)) throw new BadRequestException('Invalid slide file name.');

    let upstream: Response;
    try {
      upstream = await this.fetcher(`${this.battleForgeUrl}/media/slides/${file}`);
    } catch {
      throw new BadGatewayException('Battle Forge is unreachable.');
    }
    if (upstream.status === 404) throw new NotFoundException('Slide was not found.');
    if (!upstream.ok || !upstream.body) throw new BadGatewayException('Battle Forge returned an error.');

    reply.setHeader('Content-Type', 'image/webp');
    reply.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return new StreamableFile(Readable.fromWeb(upstream.body as never));
  }
}
