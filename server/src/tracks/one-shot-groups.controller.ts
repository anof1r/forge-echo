import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ID_PATTERN, parseOneShotGroupName } from './track-input';
import { OneShotGroup } from './track.model';
import { OneShotGroupRepository, TrackRepository } from './repositories';

@Controller('api/oneshot-groups')
export class OneShotGroupsController {
  constructor(
    private readonly groups: OneShotGroupRepository,
    private readonly tracks: TrackRepository,
  ) {}

  @Get()
  async list(): Promise<{ groups: OneShotGroup[] }> {
    return { groups: await this.groups.list() };
  }

  @Post()
  async create(@Body() body: unknown): Promise<{ group: OneShotGroup }> {
    const parsed = parseOneShotGroupName(body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    const now = Date.now();
    const group: OneShotGroup = { id: randomUUID(), name: parsed.value, createdAt: now, updatedAt: now };
    await this.groups.insert(group);
    return { group };
  }

  @Patch(':id')
  async rename(@Param('id') id: string, @Body() body: unknown): Promise<{ group: OneShotGroup }> {
    this.assertId(id);
    const parsed = parseOneShotGroupName(body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    const group = await this.groups.rename(id, parsed.value, Date.now());
    if (!group) throw new NotFoundException('One-shot group was not found.');
    return { group };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    this.assertId(id);
    if (!(await this.groups.remove(id))) throw new NotFoundException('One-shot group was not found.');
    const tracks = await this.tracks.list();
    await Promise.all(
      tracks
        .filter((track) => (track.groupIds ?? []).includes(id))
        .map((track) => this.tracks.update(track.id, { groupIds: (track.groupIds ?? []).filter((groupId) => groupId !== id) }, Date.now())),
    );
    return { success: true };
  }

  private assertId(id: string): void {
    if (!ID_PATTERN.test(id)) throw new BadRequestException('Invalid group identifier.');
  }
}
