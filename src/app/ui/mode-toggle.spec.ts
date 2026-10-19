import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModeToggle } from './mode-toggle';

describe('ModeToggle', () => {
  let fixture: ComponentFixture<ModeToggle>;

  const setup = (value: string) => {
    fixture = TestBed.createComponent(ModeToggle);
    fixture.componentRef.setInput('label', 'Playback mode');
    fixture.componentRef.setInput('options', [
      { value: 'auto', label: 'Follow scenes' },
      { value: 'manual', label: 'Hold' },
    ]);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  };

  const radios = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[role="radio"]'));

  it('renders one radio per option inside a labelled group', () => {
    // Arrange
    setup('auto');

    // Act
    const group = fixture.nativeElement.querySelector('[role="radiogroup"]') as HTMLElement;

    // Assert
    expect([group.getAttribute('aria-label'), radios().map((radio) => radio.textContent?.trim())]).toEqual([
      'Playback mode',
      ['Follow scenes', 'Hold'],
    ]);
  });

  it('marks only the selected option as checked', () => {
    // Arrange
    setup('manual');

    // Act
    const checked = radios().map((radio) => radio.getAttribute('aria-checked'));

    // Assert
    expect(checked).toEqual(['false', 'true']);
  });

  it('selects an option on tap', () => {
    // Arrange
    setup('auto');

    // Act
    radios()[1].click();

    // Assert
    expect(fixture.componentInstance.value()).toBe('manual');
  });

  it('moves the selection with the arrow keys', () => {
    // Arrange
    setup('auto');

    // Act
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    // Assert
    expect(fixture.componentInstance.value()).toBe('manual');
  });

  it('wraps around at the ends', () => {
    // Arrange
    setup('auto');

    // Act
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

    // Assert
    expect(fixture.componentInstance.value()).toBe('manual');
  });

  it('keeps only the selected option in the tab order', () => {
    // Arrange
    setup('manual');

    // Act
    const tabIndexes = radios().map((radio) => radio.tabIndex);

    // Assert
    expect(tabIndexes).toEqual([-1, 0]);
  });
});
