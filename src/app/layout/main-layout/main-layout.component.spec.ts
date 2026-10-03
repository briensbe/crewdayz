import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [provideRouter([]), provideHttpClient()],
    });
  });

  it('should create the main layout component', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render app layout, sidebar, main content and release notes', async () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-layout')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('main.main-content')).toBeTruthy();
    expect(compiled.querySelector('app-release-notes')).toBeTruthy();
  });
});
