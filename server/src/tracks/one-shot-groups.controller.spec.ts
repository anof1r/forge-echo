import { describe, expect, it } from 'vitest';
import { InMemoryOneShotGroupRepository, InMemoryTrackRepository } from './in-memory.repositories';
import { OneShotGroupsController } from './one-shot-groups.controller';

describe('OneShotGroupsController', () => {
  it('creates, renames, lists, and deletes groups while unassigning their tracks', async () => {
    // Arrange
    const groups = new InMemoryOneShotGroupRepository();
    const tracks = new InMemoryTrackRepository();
    const controller = new OneShotGroupsController(groups, tracks);
    const created = await controller.create({ name: '  Weapons  ' });
    await tracks.insert({
      id: 'axe', name: 'Axe', kind: 'oneshot', file: 'tracks/axe.mp3', mimeType: 'audio/mpeg', sizeBytes: 1,
      startMs: 0, endMs: null, volume: 1, loop: false, groupIds: [created.group.id], imageFile: null, createdAt: 1, updatedAt: 1,
    });

    // Act
    const renamed = await controller.rename(created.group.id, { name: 'Weapons and tools' });
    const listed = await controller.list();
    const removed = await controller.remove(created.group.id);

    // Assert
    expect(created.group.name).toBe('Weapons');
    expect(renamed.group.name).toBe('Weapons and tools');
    expect(listed.groups).toHaveLength(1);
    expect(removed.success).toBe(true);
    expect((await tracks.get('axe'))?.groupIds).toEqual([]);
    expect(await groups.list()).toEqual([]);
  });
});
