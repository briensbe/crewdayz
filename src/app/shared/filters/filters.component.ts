import { Component, input, output, signal, OnInit, computed, HostListener, ElementRef, inject, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X, Filter, Pin } from 'lucide-angular';
import { Employee } from '../../models/types';
import { matchesEmployeeSearch } from '../utils/string-utils';

export type FilterDropdownType =
  | 'employee'
  | 'pinned'
  | 'service'
  | 'team'
  | 'work_site'
  | 'contract_type'
  | 'profile';

export interface FilterState {
  search: string;
  employees?: string[];
  pinnedEmployees?: string[];
  service: string[];
  team: string[];
  work_site: string[];
  contract_type: string[];
  profile?: string[];
  onlyActive?: boolean;
}

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
})
export class FiltersComponent implements OnInit {
  private elementRef = inject(ElementRef);

  // Available filter options generated from the dataset
  employees = input<Employee[]>([]);
  services = input<string[]>([]);
  teams = input<string[]>([]);
  workSites = input<string[]>([]);
  contractTypes = input<string[]>(['Interne', 'Externe']);
  profiles = input<string[]>([]);

  // Initial filter state passed from parent
  initialFilters = input<FilterState>();

  // Emits the filter state whenever it changes
  filterChange = output<FilterState>();

  // Expose icons
  readonly Search = Search;
  readonly X = X;
  readonly Filter = Filter;
  readonly Pin = Pin;

  // Active filter state
  search = signal('');
  selectedEmployees = signal<string[]>([]);
  selectedPinnedEmployees = signal<string[]>([]);
  selectedService = signal<string[]>([]);
  selectedTeam = signal<string[]>([]);
  selectedWorkSite = signal<string[]>([]);
  selectedContractType = signal<string[]>([]);
  selectedProfile = signal<string[]>([]);
  onlyActive = signal(true);

  // Dropdown states managed cleanly via a single source of truth (DRY / Single Responsibility)
  readonly activeDropdown = signal<FilterDropdownType | null>(null);
  readonly hasOpenDropdown = computed(() => this.activeDropdown() !== null);

  readonly openEmployeeDropdown = computed(() => this.activeDropdown() === 'employee');
  readonly openPinnedDropdown = computed(() => this.activeDropdown() === 'pinned');
  readonly openServiceDropdown = computed(() => this.activeDropdown() === 'service');
  readonly openTeamDropdown = computed(() => this.activeDropdown() === 'team');
  readonly openWorkSiteDropdown = computed(() => this.activeDropdown() === 'work_site');
  readonly openContractTypeDropdown = computed(() => this.activeDropdown() === 'contract_type');
  readonly openProfileDropdown = computed(() => this.activeDropdown() === 'profile');

  // Search inputs inside dropdowns
  employeeSearch = signal('');
  pinnedSearch = signal('');

  // Active filter helper labels
  activeFilterLabels = computed(() => {
    const labels: { key: keyof FilterState; label: string; value: string }[] = [];
    if (this.search()) labels.push({ key: 'search', label: 'Recherche', value: this.search() });
    
    if (this.selectedEmployees().length > 0) {
      const names = this.selectedEmployees().map(id => {
        const emp = this.employees().find(e => e.id === id);
        return emp ? `${emp.last_name.toUpperCase()} ${emp.first_name}` : id;
      });
      labels.push({ key: 'employees', label: 'Collaborateurs', value: names.join(', ') });
    }
    
    if (this.selectedService().length > 0)
      labels.push({ key: 'service', label: 'Service', value: this.selectedService().join(', ') });
    if (this.selectedTeam().length > 0)
      labels.push({ key: 'team', label: 'Équipe', value: this.selectedTeam().join(', ') });
    if (this.selectedWorkSite().length > 0)
      labels.push({ key: 'work_site', label: 'Site', value: this.selectedWorkSite().join(', ') });
    if (this.selectedContractType().length > 0)
      labels.push({ key: 'contract_type', label: 'Contrat', value: this.selectedContractType().join(', ') });
    if (this.selectedProfile().length > 0)
      labels.push({ key: 'profile', label: 'Profil', value: this.selectedProfile().join(', ') });
    return labels;
  });

  // Pinned employees helper for badges
  pinnedEmployeeItems = computed(() => {
    return this.selectedPinnedEmployees().map((id) => {
      const emp = this.employees().find((e) => e.id === id);
      return {
        id,
        name: emp ? `${emp.last_name.toUpperCase()} ${emp.first_name}` : id,
      };
    });
  });

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKeydown(event?: Event) {
    if (this.hasOpenDropdown()) {
      event?.preventDefault();
      event?.stopPropagation();
      this.closeAllDropdowns();
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeAllDropdowns();
    }
  }

  closeAllDropdowns() {
    if (this.activeDropdown() !== null) {
      this.activeDropdown.set(null);
      this.employeeSearch.set('');
      this.pinnedSearch.set('');
    }
  }

  toggleDropdown(dropdown: FilterDropdownType, event?: Event) {
    event?.stopPropagation();
    this.activeDropdown.update((current) => (current === dropdown ? null : dropdown));
    this.employeeSearch.set('');
    this.pinnedSearch.set('');
  }

  clearSearch(event?: Event) {
    if (this.search()) {
      event?.preventDefault();
      event?.stopPropagation();
      this.search.set('');
      this.onFilterChange();
    }
  }

  ngOnInit() {
    const initial = this.initialFilters();
    if (initial) {
      this.search.set(initial.search || '');
      this.selectedEmployees.set(initial.employees || []);
      this.selectedPinnedEmployees.set(initial.pinnedEmployees || []);
      this.selectedService.set(initial.service || []);
      this.selectedTeam.set(initial.team || []);
      this.selectedWorkSite.set(initial.work_site || []);
      this.selectedContractType.set(initial.contract_type || []);
      this.selectedProfile.set(initial.profile || []);
      this.onlyActive.set(initial.onlyActive !== undefined ? initial.onlyActive : true);
    }
  }

  onFilterChange() {
    this.filterChange.emit({
      search: this.search(),
      employees: this.selectedEmployees(),
      pinnedEmployees: this.selectedPinnedEmployees(),
      service: this.selectedService(),
      team: this.selectedTeam(),
      work_site: this.selectedWorkSite(),
      contract_type: this.selectedContractType(),
      profile: this.selectedProfile(),
      onlyActive: this.onlyActive(),
    });
  }

  private toggleItem(targetSignal: WritableSignal<string[]>, val: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    targetSignal.update((vals) => (checked ? [...vals, val] : vals.filter((v) => v !== val)));
    this.onFilterChange();
  }

  toggleEmployee(val: string, event: Event) {
    this.toggleItem(this.selectedEmployees, val, event);
  }

  togglePinnedEmployee(val: string, event: Event) {
    this.toggleItem(this.selectedPinnedEmployees, val, event);
  }

  unpinEmployee(id: string) {
    this.selectedPinnedEmployees.update((vals) => vals.filter((v) => v !== id));
    this.onFilterChange();
  }

  clearPinnedEmployees() {
    this.selectedPinnedEmployees.set([]);
    this.onFilterChange();
  }

  getEmployeeName(id: string): string {
    const emp = this.employees().find((e) => e.id === id);
    return emp ? `${emp.last_name.toUpperCase()} ${emp.first_name}` : id;
  }

  private filterEmployees(employees: Employee[], searchTerm: string): Employee[] {
    const trimmed = searchTerm.trim();
    let result = employees;
    if (trimmed) {
      result = employees.filter((emp) => matchesEmployeeSearch(emp, trimmed));
    }
    return [...result].sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  filteredEmployeesForDropdown = computed(() =>
    this.filterEmployees(this.employees(), this.employeeSearch())
  );

  filteredEmployeesForPinnedDropdown = computed(() =>
    this.filterEmployees(this.employees(), this.pinnedSearch())
  );

  toggleService(val: string, event: Event) {
    this.toggleItem(this.selectedService, val, event);
  }

  toggleTeam(val: string, event: Event) {
    this.toggleItem(this.selectedTeam, val, event);
  }

  toggleWorkSite(val: string, event: Event) {
    this.toggleItem(this.selectedWorkSite, val, event);
  }

  toggleContractType(val: string, event: Event) {
    this.toggleItem(this.selectedContractType, val, event);
  }

  toggleProfile(val: string, event: Event) {
    this.toggleItem(this.selectedProfile, val, event);
  }

  clearFilter(key: keyof FilterState) {
    if (key === 'search') this.search.set('');
    if (key === 'employees') this.selectedEmployees.set([]);
    if (key === 'pinnedEmployees') this.selectedPinnedEmployees.set([]);
    if (key === 'service') this.selectedService.set([]);
    if (key === 'team') this.selectedTeam.set([]);
    if (key === 'work_site') this.selectedWorkSite.set([]);
    if (key === 'contract_type') this.selectedContractType.set([]);
    if (key === 'profile') this.selectedProfile.set([]);
    if (key === 'onlyActive') this.onlyActive.set(false);
    this.onFilterChange();
  }

  resetFilters() {
    this.search.set('');
    this.selectedEmployees.set([]);
    this.selectedPinnedEmployees.set([]);
    this.selectedService.set([]);
    this.selectedTeam.set([]);
    this.selectedWorkSite.set([]);
    this.selectedContractType.set([]);
    this.selectedProfile.set([]);
    this.onlyActive.set(true);
    this.onFilterChange();
  }
}

