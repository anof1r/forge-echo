import { AudioElementPool } from './audio-element-pool';

interface Slot {
  id: number;
  unlocked: boolean;
}

describe('AudioElementPool', () => {
  let created: number;
  const make = (): Slot => ({ id: ++created, unlocked: false });
  const unlock = (slot: Slot): void => {
    slot.unlocked = true;
  };

  beforeEach(() => {
    created = 0;
  });

  it('prepares and unlocks the requested number of slots up front', () => {
    // Arrange
    const pool = new AudioElementPool(make, unlock, 3);

    // Act
    pool.prepare();

    // Assert
    expect(created).toBe(3);
    expect(pool.acquire().unlocked).toBe(true);
  });

  it('hands out different slots while they are in use', () => {
    // Arrange
    const pool = new AudioElementPool(make, unlock, 2);
    pool.prepare();

    // Act
    const first = pool.acquire();
    const second = pool.acquire();

    // Assert
    expect(first).not.toBe(second);
  });

  it('reuses a slot after it was released', () => {
    // Arrange
    const pool = new AudioElementPool(make, unlock, 1);
    pool.prepare();
    const first = pool.acquire();
    pool.release(first);

    // Act
    const again = pool.acquire();

    // Assert
    expect(again).toBe(first);
    expect(created).toBe(1);
  });

  it('creates an extra slot when all are busy', () => {
    // Arrange
    const pool = new AudioElementPool(make, unlock, 1);
    pool.prepare();
    pool.acquire();

    // Act
    const extra = pool.acquire();

    // Assert
    expect(extra.id).toBe(2);
  });

  it('prepares only once', () => {
    // Arrange
    const pool = new AudioElementPool(make, unlock, 2);

    // Act
    pool.prepare();
    pool.prepare();

    // Assert
    expect(created).toBe(2);
  });

  it('does not keep unlimited spare slots', () => {
    // Arrange
    const pool = new AudioElementPool(make, unlock, 1);
    pool.prepare();
    const slots = [pool.acquire(), pool.acquire(), pool.acquire()];

    // Act
    slots.forEach((slot) => pool.release(slot));

    // Assert
    expect(pool.idleCount).toBe(1);
  });
});
