import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrimChange, TrimEditor } from './trim-editor';
import { WaveformFactory, WaveformHandlers, WaveformView } from './waveform';

class FakeView implements WaveformView {
  playTrim = vi.fn();
  stop = vi.fn();
  destroy = vi.fn();
}

describe('TrimEditor', () => {
  let view: FakeView;
  let handlers: WaveformHandlers;
  let create: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<TrimEditor>;
  let emitted: TrimChange[];

  const button = (name: string) => fixture.nativeElement.querySelector(`[data-test="${name}"]`) as HTMLButtonElement;

  beforeEach(() => {
    view = new FakeView();
    create = vi.fn().mockImplementation((_container, _url, _trim, given: WaveformHandlers) => {
      handlers = given;
      return view;
    });
    TestBed.configureTestingModule({ providers: [{ provide: WaveformFactory, useValue: { create } }] });
    fixture = TestBed.createComponent(TrimEditor);
    fixture.componentRef.setInput('url', '/api/tracks/t1/stream');
    fixture.componentRef.setInput('startMs', 1000);
    fixture.componentRef.setInput('endMs', 20000);
    emitted = [];
    fixture.componentInstance.trimChange.subscribe((change) => emitted.push(change));
    fixture.detectChanges();
  });

  it('draws the waveform of the track with its saved trim in seconds', () => {
    // Arrange - component rendered in beforeEach

    // Act
    const [, url, trim] = create.mock.calls[0];

    // Assert
    expect([url, trim]).toEqual(['/api/tracks/t1/stream', { start: 1, end: 20 }]);
  });

  it('reports a dragged region in milliseconds', () => {
    // Arrange
    handlers.ready(60);

    // Act
    handlers.trimChanged(1.25, 30);

    // Assert
    expect(emitted).toEqual([{ startMs: 1250, endMs: 30000 }]);
  });

  it('reports the end as the end of the file when the region reaches it', () => {
    // Arrange
    handlers.ready(60);

    // Act
    handlers.trimChanged(2, 60);

    // Assert
    expect(emitted).toEqual([{ startMs: 2000, endMs: null }]);
  });

  it('previews the trimmed part and stops on the second tap', () => {
    // Arrange
    handlers.ready(60);

    // Act
    button('trim-preview').click();
    fixture.detectChanges();
    const label = button('trim-preview').textContent;
    button('trim-preview').click();

    // Assert
    expect(view.playTrim).toHaveBeenCalledTimes(1);
    expect(view.stop).toHaveBeenCalledTimes(1);
    expect(label).toContain('Stop');
  });

  it('goes back to the play label when the preview ends', () => {
    // Arrange
    handlers.ready(60);
    button('trim-preview').click();

    // Act
    handlers.finished();
    fixture.detectChanges();

    // Assert
    expect(button('trim-preview').textContent).toContain('Play');
  });

  it('tells the user when the waveform cannot be drawn', () => {
    // Arrange - component rendered in beforeEach

    // Act
    handlers.failed();
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.querySelector('[data-test="trim-error"]')).not.toBeNull();
  });

  it('releases the waveform when destroyed', () => {
    // Arrange - component rendered in beforeEach

    // Act
    fixture.destroy();

    // Assert
    expect(view.destroy).toHaveBeenCalledTimes(1);
  });
});
