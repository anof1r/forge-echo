import { Component, input, model, signal, computed } from '@angular/core';

const STEP = 0.05;
const LARGE_STEP = 0.1;

const clamp = (value: number): number => Math.min(1, Math.max(0, Math.round(value * 100) / 100));

// A large, touch-first slider for a 0..1 value. The whole bar is the handle.
@Component({
  selector: 'app-intensity-slider',
  templateUrl: './intensity-slider.html',
  styleUrl: './intensity-slider.scss',
})
export class IntensitySlider {
  readonly label = input.required<string>();
  readonly value = model(0);

  protected readonly percent = computed(() => Math.round(this.value() * 100));
  private readonly dragging = signal(false);

  protected onKeydown(event: KeyboardEvent): void {
    const delta = this.keyDelta(event.key);
    if (delta === null) return;
    event.preventDefault();
    this.value.set(typeof delta === 'number' ? clamp(this.value() + delta) : delta === 'start' ? 0 : 1);
  }

  protected onPointerDown(event: PointerEvent): void {
    const control = event.currentTarget as HTMLElement;
    control.setPointerCapture?.(event.pointerId);
    this.dragging.set(true);
    this.moveTo(event, control);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging()) this.moveTo(event, event.currentTarget as HTMLElement);
  }

  protected onPointerEnd(): void {
    this.dragging.set(false);
  }

  private moveTo(event: PointerEvent, control: HTMLElement): void {
    const { left, width } = control.getBoundingClientRect();
    if (width <= 0) return;
    this.value.set(clamp((event.clientX - left) / width));
  }

  private keyDelta(key: string): number | 'start' | 'end' | null {
    switch (key) {
      case 'ArrowRight':
      case 'ArrowUp':
        return STEP;
      case 'ArrowLeft':
      case 'ArrowDown':
        return -STEP;
      case 'PageUp':
        return LARGE_STEP;
      case 'PageDown':
        return -LARGE_STEP;
      case 'Home':
        return 'start';
      case 'End':
        return 'end';
      default:
        return null;
    }
  }
}
