import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Put } from '@nestjs/common';
import { BindingRepository, TrackRepository } from '../tracks/repositories';
import { ID_PATTERN, parseBindingInput } from '../tracks/track-input';
import { Binding } from '../tracks/track.model';

@Controller('api/bindings')
export class BindingsController {
  constructor(
    private readonly tracks: TrackRepository,
    private readonly bindings: BindingRepository,
  ) {}

  @Get()
  async list(): Promise<{ bindings: Binding[] }> {
    return { bindings: await this.bindings.list() };
  }

  @Put(':slideId')
  async put(@Param('slideId') slideId: string, @Body() body: unknown): Promise<{ binding: Binding }> {
    this.assertSlideId(slideId);
    const parsed = parseBindingInput(body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    if (!(await this.tracks.get(parsed.value.trackId))) {
      throw new BadRequestException('Track does not exist.');
    }
    const binding: Binding = { slideId, ...parsed.value, updatedAt: Date.now() };
    await this.bindings.upsert(binding);
    return { binding };
  }

  @Delete(':slideId')
  async remove(@Param('slideId') slideId: string): Promise<{ success: true }> {
    this.assertSlideId(slideId);
    if (!(await this.bindings.remove(slideId))) throw new NotFoundException('Binding was not found.');
    return { success: true };
  }

  private assertSlideId(slideId: string): void {
    if (!ID_PATTERN.test(slideId)) throw new BadRequestException('Invalid slide identifier.');
  }
}
