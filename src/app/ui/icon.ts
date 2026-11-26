import { Component, input } from '@angular/core';

export const ICON_NAMES = ['stage', 'library', 'effects', 'settings', 'stop', 'play', 'pause', 'volume', 'hold', 'follow'] as const;
export type IconName = (typeof ICON_NAMES)[number];

// Thin-stroke line icons, drawn for this app on a 24px grid.
@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('stage') {
          <circle cx="12" cy="12" r="2.2" />
          <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9" />
        }
        @case ('library') {
          <rect x="4.5" y="5" width="15" height="4.5" rx="1.5" />
          <rect x="4.5" y="14.5" width="15" height="4.5" rx="1.5" />
          <path d="M8 7.25h.01M8 16.75h.01" />
        }
        @case ('effects') {
          <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.6 2.6M15.4 15.4 18 18M18 6l-2.6 2.6M8.6 15.4 6 18" />
        }
        @case ('settings') {
          <path d="M5 8h8M17 8h2M5 16h2M11 16h8" />
          <circle cx="15" cy="8" r="2" />
          <circle cx="9" cy="16" r="2" />
        }
        @case ('stop') {
          <rect x="7" y="7" width="10" height="10" rx="2.2" />
        }
        @case ('play') {
          <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" />
        }
        @case ('pause') {
          <path d="M8.5 6v12M15.5 6v12" stroke-width="2.5" />
        }
        @case ('volume') {
          <path d="M5 10v4h3l4 3.5v-11L8 10H5Z" />
          <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
        }
        @case ('hold') {
          <path d="M9 6.5v11M15 6.5v11" />
        }
        @case ('follow') {
          <path d="M6 12h9M12 8l4 4-4 4" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}
