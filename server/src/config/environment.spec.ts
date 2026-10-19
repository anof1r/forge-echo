import { describe, expect, it } from 'vitest';
import { readEnvironment } from './environment';

describe('readEnvironment', () => {
  it('uses local defaults that do not collide with Battle Forge', () => {
    // Arrange
    const env = {};

    // Act
    const environment = readEnvironment(env);

    // Assert
    expect(environment).toEqual({
      port: 8081,
      battleForgeUrl: 'http://localhost:8080',
    });
  });

  it('reads the port and the Battle Forge address from the environment', () => {
    // Arrange
    const env = { PORT: '9000', BATTLE_FORGE_URL: 'http://battle-forge:8080' };

    // Act
    const environment = readEnvironment(env);

    // Assert
    expect(environment).toEqual({ port: 9000, battleForgeUrl: 'http://battle-forge:8080' });
  });

  it('removes a trailing slash from the Battle Forge address', () => {
    // Arrange
    const env = { BATTLE_FORGE_URL: 'http://battle-forge:8080/' };

    // Act
    const environment = readEnvironment(env);

    // Assert
    expect(environment.battleForgeUrl).toBe('http://battle-forge:8080');
  });

  it.each(['abc', '0', '70000', '-1'])('rejects the invalid port %s', (port) => {
    // Arrange
    const env = { PORT: port };

    // Act
    const read = () => readEnvironment(env);

    // Assert
    expect(read).toThrow('PORT');
  });

  it('rejects a Battle Forge address that is not an http URL', () => {
    // Arrange
    const env = { BATTLE_FORGE_URL: 'ftp://battle-forge' };

    // Act
    const read = () => readEnvironment(env);

    // Assert
    expect(read).toThrow('BATTLE_FORGE_URL');
  });
});
