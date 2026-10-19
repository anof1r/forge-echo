import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntensitySlider } from './intensity-slider';

describe('IntensitySlider', () => {
  let fixture: ComponentFixture<IntensitySlider>;
  let control: HTMLElement;

  const setup = (value: number) => {
    fixture = TestBed.createComponent(IntensitySlider);
    fixture.componentRef.setInput('label', 'Volume');
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    control = fixture.nativeElement.querySelector('[role="slider"]');
    control.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 56, right: 200, bottom: 56, x: 0, y: 0, toJSON: () => ({}) });
  };

  const press = (key: string) => {
    control.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };

  const pointer = (type: string, clientX: number) => {
    control.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
    fixture.detectChanges();
  };

  it('exposes its state to assistive technology', () => {
    // Arrange
    setup(0.4);

    // Act
    const attributes = ['aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow'].map((name) => control.getAttribute(name));

    // Assert
    expect(attributes).toEqual(['Volume', '0', '100', '40']);
  });

  it('shows the value as a percentage', () => {
    // Arrange
    setup(0.65);

    // Act
    const text = fixture.nativeElement.textContent;

    // Assert
    expect(text).toContain('65%');
  });

  it('fills the track according to the value', () => {
    // Arrange
    setup(0.25);

    // Act
    const fill = fixture.nativeElement.querySelector('.slider__fill') as HTMLElement;

    // Assert
    expect(fill.style.width).toBe('25%');
  });

  it('raises the value with the right arrow key', () => {
    // Arrange
    setup(0.5);

    // Act
    press('ArrowRight');

    // Assert
    expect(fixture.componentInstance.value()).toBeCloseTo(0.55);
  });

  it('lowers the value with the left arrow key', () => {
    // Arrange
    setup(0.5);

    // Act
    press('ArrowLeft');

    // Assert
    expect(fixture.componentInstance.value()).toBeCloseTo(0.45);
  });

  it('never goes below zero or above one', () => {
    // Arrange
    setup(0.02);

    // Act
    press('ArrowLeft');
    const low = fixture.componentInstance.value();
    press('End');
    press('ArrowRight');
    const high = fixture.componentInstance.value();

    // Assert
    expect([low, high]).toEqual([0, 1]);
  });

  it('jumps to the ends with Home and End', () => {
    // Arrange
    setup(0.5);

    // Act
    press('Home');
    const start = fixture.componentInstance.value();
    press('End');

    // Assert
    expect([start, fixture.componentInstance.value()]).toEqual([0, 1]);
  });

  it('moves in larger steps with PageUp', () => {
    // Arrange
    setup(0.5);

    // Act
    press('PageUp');

    // Assert
    expect(fixture.componentInstance.value()).toBeCloseTo(0.6);
  });

  it('sets the value where the track is pressed', () => {
    // Arrange
    setup(0);

    // Act
    pointer('pointerdown', 150);

    // Assert
    expect(fixture.componentInstance.value()).toBeCloseTo(0.75);
  });

  it('follows the pointer while it is held down', () => {
    // Arrange
    setup(0);
    pointer('pointerdown', 20);

    // Act
    pointer('pointermove', 100);

    // Assert
    expect(fixture.componentInstance.value()).toBeCloseTo(0.5);
  });

  it('ignores pointer movement when nothing is pressed', () => {
    // Arrange
    setup(0.3);

    // Act
    pointer('pointermove', 180);

    // Assert
    expect(fixture.componentInstance.value()).toBeCloseTo(0.3);
  });

  it('stops following the pointer after release', () => {
    // Arrange
    setup(0);
    pointer('pointerdown', 40);
    pointer('pointerup', 40);

    // Act
    pointer('pointermove', 200);

    // Assert
    expect(fixture.componentInstance.value()).toBeCloseTo(0.2);
  });
});
