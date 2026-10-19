import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { AudioBackend } from './core/audio-backend';
import { STAGE_SOCKET } from './core/stage-state.service';

const testProviders = [
  provideRouter(routes),
  provideHttpClient(),
  provideHttpClientTesting(),
  { provide: STAGE_SOCKET, useValue: { on: () => undefined, emit: () => undefined } },
  { provide: AudioBackend, useValue: {} },
];

describe('App shell', () => {
  async function render(): Promise<RouterTestingHarness> {
    TestBed.configureTestingModule({ providers: testProviders });
    const harness = await RouterTestingHarness.create();
    return harness;
  }

  function host(): HTMLElement {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders });
  });

  it('shows the product name in the header', () => {
    // Arrange - no setup needed

    // Act
    const element = host();

    // Assert
    expect(element.querySelector('.app-header')?.textContent).toContain('Forge Echo');
  });

  it('offers the Stage and Library tabs', () => {
    // Arrange - no setup needed

    // Act
    const links = Array.from(host().querySelectorAll<HTMLAnchorElement>('nav a'));

    // Assert
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Stage', 'Library']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/stage', '/library']);
  });

  it('opens the Stage tab by default because it is used during play', async () => {
    // Arrange
    const harness = await render();

    // Act
    await harness.navigateByUrl('/');

    // Assert
    expect(TestBed.inject(Location).path()).toBe('/stage');
  });

  it('renders the Library tab', async () => {
    // Arrange
    const harness = await render();

    // Act
    await harness.navigateByUrl('/library');

    // Assert
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Library');
  });
});
