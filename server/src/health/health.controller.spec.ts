import { describe, expect, it } from 'vitest';
import { BattleForgeSource } from '../battle-forge/battle-forge.source';
import { HealthController } from './health.controller';

function controllerWith(connection: 'connected' | 'disconnected', contract = 'compatible'): HealthController {
  const source = new BattleForgeSource('http://unused');
  Object.defineProperty(source, 'snapshot', {
    get: () => ({
      connection,
      contract,
      presentation: { mode: 'battle', activeSlideId: null },
      slides: [],
    }),
  });
  return new HealthController(source);
}

describe('HealthController', () => {
  it('reports ok when Battle Forge is connected', () => {
    // Arrange
    const controller = controllerWith('connected');

    // Act
    const status = controller.status();

    // Assert
    expect(status).toEqual({ status: 'ok', battleForge: 'connected', contract: 'compatible' });
  });

  it('reports degraded but alive when Battle Forge is unreachable', () => {
    // Arrange
    const controller = controllerWith('disconnected');

    // Act
    const status = controller.status();

    // Assert
    expect(status).toEqual({ status: 'degraded', battleForge: 'disconnected', contract: 'compatible' });
  });
});
