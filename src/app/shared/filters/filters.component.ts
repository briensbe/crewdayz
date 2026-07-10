import { Component, input, output, signal, OnInit, computed, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X, Filter } from 'lucide-angular';

export interface FilterState {
  search: string;
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

  // Active filter state
  search = signal('');
  selectedService = signal<string[]>([]);
  selectedTeam = signal<string[]>([]);
  selectedWorkSite = signal<string[]>([]);
  selectedContractType = signal<string[]>([]);
  selectedProfile = signal<string[]>([]);
  onlyActive = signal(true);

  // Dropdown states
  openServiceDropdown = signal(false);
  openTeamDropdown = signal(false);
  openWorkSiteDropdown = signal(false);
  openContractTypeDropdown = signal(false);
  openProfileDropdown = signal(false);

  // Active filter helper labels
  activeFilterLabels = computed(() => {
    const labels: { key: keyof FilterState; label: string; value: string }[] = [];
    if (this.search()) labels.push({ key: 'search', label: 'Recherche', value: this.search() });
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeAllDropdowns();
    }
  }

  closeAllDropdowns() {
    this.openServiceDropdown.set(false);
    this.openTeamDropdown.set(false);
    this.openWorkSiteDropdown.set(false);
    this.openContractTypeDropdown.set(false);
    this.openProfileDropdown.set(false);
  }

  toggleDropdown(dropdown: 'service' | 'team' | 'work_site' | 'contract_type' | 'profile', event: MouseEvent) {
    event.stopPropagation();
    if (dropdown === 'service') {
      this.openServiceDropdown.update((val) => !val);
      this.openTeamDropdown.set(false);
      this.openWorkSiteDropdown.set(false);
      this.openContractTypeDropdown.set(false);
      this.openProfileDropdown.set(false);
    } else if (dropdown === 'team') {
      this.openTeamDropdown.update((val) => !val);
      this.openServiceDropdown.set(false);
      this.openWorkSiteDropdown.set(false);
      this.openContractTypeDropdown.set(false);
      this.openProfileDropdown.set(false);
    } else if (dropdown === 'work_site') {
      this.openWorkSiteDropdown.update((val) => !val);
      this.openServiceDropdown.set(false);
      this.openTeamDropdown.set(false);
      this.openContractTypeDropdown.set(false);
      this.openProfileDropdown.set(false);
    } else if (dropdown === 'contract_type') {
      this.openContractTypeDropdown.update((val) => !val);
      this.openServiceDropdown.set(false);
      this.openTeamDropdown.set(false);
      this.openWorkSiteDropdown.set(false);
      this.openProfileDropdown.set(false);
    } else if (dropdown === 'profile') {
      this.openProfileDropdown.update((val) => !val);
      this.openServiceDropdown.set(false);
      this.openTeamDropdown.set(false);
      this.openWorkSiteDropdown.set(false);
      this.openContractTypeDropdown.set(false);
    }
  }

  ngOnInit() {
    const initial = this.initialFilters();
    if (initial) {
      this.search.set(initial.search || '');
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
      service: this.selectedService(),
      team: this.selectedTeam(),
      work_site: this.selectedWorkSite(),
      contract_type: this.selectedContractType(),
      profile: this.selectedProfile(),
      onlyActive: this.onlyActive(),
    });
  }

  toggleService(val: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedService.update((vals) => (checked ? [...vals, val] : vals.filter((v) => v !== val)));
    this.onFilterChange();
  }

  toggleTeam(val: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedTeam.update((vals) => (checked ? [...vals, val] : vals.filter((v) => v !== val)));
    this.onFilterChange();
  }

  toggleWorkSite(val: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedWorkSite.update((vals) => (checked ? [...vals, val] : vals.filter((v) => v !== val)));
    this.onFilterChange();
  }

  toggleContractType(val: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedContractType.update((vals) => (checked ? [...vals, val] : vals.filter((v) => v !== val)));
    this.onFilterChange();
  }

  toggleProfile(val: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedProfile.update((vals) => (checked ? [...vals, val] : vals.filter((v) => v !== val)));
    this.onFilterChange();
  }

  clearFilter(key: keyof FilterState) {
    if (key === 'search') this.search.set('');
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
    this.selectedService.set([]);
    this.selectedTeam.set([]);
    this.selectedWorkSite.set([]);
    this.selectedContractType.set([]);
    this.selectedProfile.set([]);
    this.onlyActive.set(true);
    this.onFilterChange();
  }
}
