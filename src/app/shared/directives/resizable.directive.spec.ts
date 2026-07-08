import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ResizableDirective } from './resizable.directive';

@Component({
  template: `
    <table>
      <thead>
        <tr>
          <th [(appResizable)]="width" [minWidth]="100" [maxWidth]="300" id="target-th">Column</th>
        </tr>
      </thead>
    </table>
  `,
  imports: [ResizableDirective],
})
class TestComponent {
  width = signal(150);
}

describe('ResizableDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [TestComponent, ResizableDirective],
    }).createComponent(TestComponent);

    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the resizer element inside the host th', () => {
    const thElement = fixture.debugElement.query(By.css('#target-th'));
    const resizerElement = thElement.query(By.css('.resizer'));
    expect(resizerElement).toBeTruthy();
  });

  it('should set positioning relative if it is not sticky', () => {
    const thElement = fixture.debugElement.query(By.css('#target-th'));
    const style = window.getComputedStyle(thElement.nativeElement);
    expect(thElement.nativeElement.style.position).toBe('relative');
  });

  it('should clamp the width to minWidth and maxWidth during resize', () => {
    // Mock requestAnimationFrame to run synchronously using Vitest's vi
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    const thElement = fixture.debugElement.query(By.css('#target-th'));
    const resizerElement = thElement.query(By.css('.resizer'));

    // Test minWidth clamp (drag left by 100px: 150px -> 50px, clamped to 100px)
    let mousedownEvent = new MouseEvent('mousedown', { clientX: 150 });
    resizerElement.nativeElement.dispatchEvent(mousedownEvent);

    let mousemoveEvent = new MouseEvent('mousemove', { clientX: 50 });
    document.dispatchEvent(mousemoveEvent);

    // Release mouse first to trigger the signal update
    let mouseupEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseupEvent);

    expect(component.width()).toBe(100);

    // Test maxWidth clamp (drag right by 250px: 150px -> 400px, clamped to 300px)
    mousedownEvent = new MouseEvent('mousedown', { clientX: 150 });
    resizerElement.nativeElement.dispatchEvent(mousedownEvent);

    mousemoveEvent = new MouseEvent('mousemove', { clientX: 400 });
    document.dispatchEvent(mousemoveEvent);

    // Release mouse first to trigger the signal update
    mouseupEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseupEvent);

    expect(component.width()).toBe(300);
  });
});
