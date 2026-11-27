import { Component, input, model } from '@angular/core';

export interface ToggleOption {
  value: string;
  label: string;
}

// Segmented control for a small set of mutually exclusive modes.
@Component({
  selector: 'app-mode-toggle',
  templateUrl: './mode-toggle.html',
  styleUrl: './mode-toggle.scss',
})
export class ModeToggle {
  readonly label = input.required<string>();
  readonly options = input.required<ToggleOption[]>();
  readonly value = model<string>('');

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const options = this.options();
    this.value.set(options[(index + step + options.length) % options.length].value);
  }
}
