import { TestBed } from '@angular/core/testing';
import { Icon, ICON_NAMES } from './icon';
import { IconButton } from './icon-button';

describe('Icon', () => {
  it.each(ICON_NAMES)('draws the %s icon as a hidden decorative svg', (name) => {
    // Arrange
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', name);

    // Act
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;

    // Assert
    expect([svg.getAttribute('aria-hidden'), svg.querySelectorAll('path, circle, rect').length > 0]).toEqual(['true', true]);
  });
});

describe('IconButton', () => {
  it('names the button for assistive technology', () => {
    // Arrange
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('icon', 'stop');
    fixture.componentRef.setInput('label', 'Stop');

    // Act
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    // Assert
    expect([button.getAttribute('aria-label'), button.querySelector('svg')]).toEqual(['Stop', expect.anything()]);
  });

  it('shows the label text only when asked to', () => {
    // Arrange
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('icon', 'stop');
    fixture.componentRef.setInput('label', 'Stop');
    fixture.componentRef.setInput('showLabel', true);

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.textContent).toContain('Stop');
  });
});
