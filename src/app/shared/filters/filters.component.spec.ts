import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FiltersComponent, FilterState } from './filters.component';
import { Employee } from '../../models/types';

describe('FiltersComponent', () => {
  let component: FiltersComponent;
  let fixture: ComponentFixture<FiltersComponent>;

  const mockEmployees: Employee[] = [
    {
      id: 'emp-1',
      first_name: 'Jean',
      last_name: 'Dupont',
      company_name: 'Acme Corp',
      service: 'IT',
      team: 'Dev',
      work_site: 'Paris',
      contract_type: 'Interne',
      profile: 'Senior',
      created_at: '2026-01-01',
    },
    {
      id: 'emp-2',
      first_name: 'Alice',
      last_name: 'Martin',
      company_name: 'Globex',
      service: 'Marketing',
      team: 'Growth',
      work_site: 'Lyon',
      contract_type: 'Externe',
      profile: 'Lead',
      created_at: '2026-01-01',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FiltersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('employees', mockEmployees);
    fixture.componentRef.setInput('services', ['IT', 'Marketing']);
    fixture.componentRef.setInput('teams', ['Dev', 'Growth']);
    fixture.componentRef.setInput('workSites', ['Paris', 'Lyon']);
    fixture.componentRef.setInput('contractTypes', ['Interne', 'Externe']);
    fixture.componentRef.setInput('profiles', ['Senior', 'Lead']);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.hasOpenDropdown()).toBe(false);
  });

  it('should open and close dropdown on toggleDropdown', () => {
    const event = new MouseEvent('click');
    component.toggleDropdown('service', event);
    expect(component.activeDropdown()).toBe('service');
    expect(component.openServiceDropdown()).toBe(true);
    expect(component.hasOpenDropdown()).toBe(true);

    // Toggling the same dropdown closes it
    component.toggleDropdown('service', event);
    expect(component.activeDropdown()).toBeNull();
    expect(component.openServiceDropdown()).toBe(false);
    expect(component.hasOpenDropdown()).toBe(false);
  });

  it('should ensure mutually exclusive open dropdowns (only one open at a time)', () => {
    const event = new MouseEvent('click');
    component.toggleDropdown('service', event);
    expect(component.activeDropdown()).toBe('service');
    expect(component.openServiceDropdown()).toBe(true);

    component.toggleDropdown('team', event);
    expect(component.activeDropdown()).toBe('team');
    expect(component.openServiceDropdown()).toBe(false);
    expect(component.openTeamDropdown()).toBe(true);
  });

  it('should close any open dropdown when ESC key is pressed on the document', () => {
    component.toggleDropdown('employee', new MouseEvent('click'));
    expect(component.hasOpenDropdown()).toBe(true);

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(component.activeDropdown()).toBeNull();
    expect(component.hasOpenDropdown()).toBe(false);
    expect(component.openEmployeeDropdown()).toBe(false);
  });

  it('should close dropdown when ESC is pressed on any of the filter types', () => {
    const dropdownTypes: Array<'employee' | 'pinned' | 'service' | 'team' | 'work_site' | 'contract_type'> = [
      'employee',
      'pinned',
      'service',
      'team',
      'work_site',
      'contract_type',
    ];

    for (const type of dropdownTypes) {
      component.toggleDropdown(type, new MouseEvent('click'));
      expect(component.activeDropdown()).toBe(type);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);
      expect(component.activeDropdown()).toBeNull();
    }
  });

  it('should close open dropdown when clicking outside', () => {
    component.toggleDropdown('work_site', new MouseEvent('click'));
    expect(component.activeDropdown()).toBe('work_site');

    // Simulate click outside the component host element
    const outsideClick = new MouseEvent('click', { bubbles: true });
    document.body.dispatchEvent(outsideClick);
    fixture.detectChanges();

    expect(component.activeDropdown()).toBeNull();
  });

  it('should clear search input when ESC is pressed in the header search input', () => {
    component.search.set('Jean');
    fixture.detectChanges();

    const searchInput = fixture.debugElement.query(By.css('.header-search-input'));
    expect(searchInput).toBeTruthy();

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    searchInput.nativeElement.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(component.search()).toBe('');
  });

  it('should filter employees case-insensitively and accent-insensitively in Collaborateurs dropdown', () => {
    // Upper case search
    component.employeeSearch.set('ALICE');
    let filtered = component.filteredEmployeesForDropdown();
    expect(filtered.length).toBe(1);
    expect(filtered[0].first_name).toBe('Alice');

    // Lower case search
    component.employeeSearch.set('dupont');
    filtered = component.filteredEmployeesForDropdown();
    expect(filtered.length).toBe(1);
    expect(filtered[0].first_name).toBe('Jean');

    // Reversed full name search (first_name last_name)
    component.employeeSearch.set('jean dupont');
    filtered = component.filteredEmployeesForDropdown();
    expect(filtered.length).toBe(1);
    expect(filtered[0].first_name).toBe('Jean');

    // Filter by company (case-insensitive)
    component.employeeSearch.set('GLOBEX');
    filtered = component.filteredEmployeesForDropdown();
    expect(filtered.length).toBe(1);
    expect(filtered[0].first_name).toBe('Alice');
  });

  it('should filter employees case-insensitively and accent-insensitively in Hors filtre dropdown', () => {
    // Upper case search in pinned dropdown
    component.pinnedSearch.set('ALICE');
    let filtered = component.filteredEmployeesForPinnedDropdown();
    expect(filtered.length).toBe(1);
    expect(filtered[0].first_name).toBe('Alice');

    // Reversed name search
    component.pinnedSearch.set('Martin Alice');
    filtered = component.filteredEmployeesForPinnedDropdown();
    expect(filtered.length).toBe(1);
    expect(filtered[0].first_name).toBe('Alice');

    // Company search
    component.pinnedSearch.set('acme');
    filtered = component.filteredEmployeesForPinnedDropdown();
    expect(filtered.length).toBe(1);
    expect(filtered[0].first_name).toBe('Jean');
  });

  it('should toggle selection and emit filterChange', () => {
    let emitted: FilterState | undefined;
    component.filterChange.subscribe((state) => {
      emitted = state;
    });

    const event = { target: { checked: true } } as unknown as Event;
    component.toggleService('IT', event);

    expect(component.selectedService()).toEqual(['IT']);
    expect(emitted?.service).toEqual(['IT']);

    const uncheckEvent = { target: { checked: false } } as unknown as Event;
    component.toggleService('IT', uncheckEvent);

    expect(component.selectedService()).toEqual([]);
    expect(emitted?.service).toEqual([]);
  });

  it('should reset all filters and clear search on resetFilters', () => {
    component.search.set('test');
    component.selectedService.set(['IT']);
    component.selectedTeam.set(['Dev']);

    component.resetFilters();

    expect(component.search()).toBe('');
    expect(component.selectedService()).toEqual([]);
    expect(component.selectedTeam()).toEqual([]);
    expect(component.onlyActive()).toBe(true);
  });
});
