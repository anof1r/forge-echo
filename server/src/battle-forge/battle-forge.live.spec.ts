import { afterEach, describe, expect, it } from 'vitest';
import { SUPPORTED_CONTRACT_VERSION, parseContractVersion } from './battle-forge.contract';
import { BattleForgeSource } from './battle-forge.source';

const url = process.env['BATTLE_FORGE_URL'];

/**
 * Contract check against a running Battle Forge. Opt-in:
 * BATTLE_FORGE_URL=http://localhost:8080 npm run test:contract
 */
describe.skipIf(!url)('Battle Forge live contract', () => {
  let source: BattleForgeSource;

  afterEach(() => source?.stop());

  it('answers both subscriptions with data that passes the contract parsers', async () => {
    // Arrange
    source = new BattleForgeSource(url as string);
    const loaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Battle Forge did not answer.')), 5000);
      source.subscribe((snapshot) => {
        if (snapshot.connection === 'connected') {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    // Act
    source.start();
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Assert
    expect(['battle', 'story']).toContain(source.snapshot.presentation.mode);
    expect(Array.isArray(source.snapshot.slides)).toBe(true);
    for (const slide of source.snapshot.slides) {
      expect(slide.mediaPath).toMatch(/^\/media\/slides\/[0-9a-f-]+\.webp\?v=\d+$/i);
    }
  });

  it('serves the health endpoint', async () => {
    // Arrange
    const healthUrl = `${url}/api/health`;

    // Act
    const response = await fetch(healthUrl);
    const body = (await response.json()) as { status: string };

    // Assert
    expect(response.ok).toBe(true);
    expect(body.status).toBe('ok');
  });

  it('declares the contract version Forge Echo supports', async () => {
    // Arrange
    const healthUrl = `${url}/api/health`;

    // Act
    const body: unknown = await (await fetch(healthUrl)).json();

    // Assert
    expect(parseContractVersion(body)).toBe(SUPPORTED_CONTRACT_VERSION);
  });
});
