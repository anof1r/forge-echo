import { Component, input } from '@angular/core';
import { Icon, IconName } from './icon';

// Quiet secondary action: an icon, optionally with its label.
@Component({
  selector: 'app-icon-button',
  imports: [Icon],
  template: `
    <button type="button" class="icon-button" [attr.aria-label]="label()">
      <app-icon [name]="icon()" />
      @if (showLabel()) {
        <span>{{ label() }}</span>
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-width: var(--tap-size);
      min-height: var(--tap-size);
      padding: 0 var(--space-3);
      border: 0;
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--text-muted);
      font: inherit;
      font-size: var(--text-sm);
      transition:
        background var(--motion-fast) var(--ease),
        color var(--motion-fast) var(--ease);

      &:hover,
      &:active {
        background: var(--surface-raised);
        color: var(--text);
      }

      &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px var(--accent-glow);
      }
    }
  `,
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly showLabel = input(false);
}
