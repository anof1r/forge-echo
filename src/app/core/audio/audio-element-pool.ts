// iOS only lets an audio element play after it was started once from a user tap.
// The pool unlocks a few elements during that tap and reuses them for later, tap-less playback.
export class AudioElementPool<T> {
  private readonly idle: T[] = [];
  private prepared = false;

  constructor(
    private readonly create: () => T,
    private readonly unlock: (slot: T) => void,
    private readonly size: number,
  ) {}

  get idleCount(): number {
    return this.idle.length;
  }

  prepare(): void {
    if (this.prepared) return;
    this.prepared = true;
    for (let i = 0; i < this.size; i += 1) {
      const slot = this.create();
      this.unlock(slot);
      this.idle.push(slot);
    }
  }

  acquire(): T {
    const slot = this.idle.pop();
    if (slot !== undefined) return slot;
    const extra = this.create();
    this.unlock(extra);
    return extra;
  }

  release(slot: T): void {
    if (this.idle.length < this.size && !this.idle.includes(slot)) this.idle.push(slot);
  }
}
