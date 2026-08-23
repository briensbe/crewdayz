import { TestBed } from '@angular/core/testing';
import { ThemeService, THEME_STORAGE_KEY } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark-mode');
  });

  it('should be created with default system preference', () => {
    expect(service).toBeTruthy();
    expect(service.preference()).toBe('system');
  });

  it('should update preference and effectiveTheme when setPreference is called', () => {
    service.setPreference('dark');
    expect(service.preference()).toBe('dark');
    expect(service.effectiveTheme()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);

    service.setPreference('light');
    expect(service.preference()).toBe('light');
    expect(service.effectiveTheme()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
  });

  it('should toggle theme between light and dark', () => {
    service.setPreference('light');
    expect(service.effectiveTheme()).toBe('light');

    service.toggleTheme();
    expect(service.effectiveTheme()).toBe('dark');
    expect(service.preference()).toBe('dark');

    service.toggleTheme();
    expect(service.effectiveTheme()).toBe('light');
    expect(service.preference()).toBe('light');
  });

  it('should read stored preference from localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const newService = new ThemeService();
    expect(newService.preference()).toBe('dark');
    expect(newService.effectiveTheme()).toBe('dark');
  });
});
