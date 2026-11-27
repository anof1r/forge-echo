import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from './shared/ui/icon';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <header class="app-header">
      <span class="app-header__brand">Forge Echo</span>
    </header>
    <main class="app-main">
      <router-outlet />
    </main>
    <nav class="tabs" aria-label="Main">
      <a class="tabs__link" routerLink="/stage" routerLinkActive="tabs__link--active"><app-icon name="stage" /><span>Stage</span></a>
      <a class="tabs__link" routerLink="/library" routerLinkActive="tabs__link--active"><app-icon name="library" /><span>Library</span></a>
    </nav>
  `,
})
export class App {}
