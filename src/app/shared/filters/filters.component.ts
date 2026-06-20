import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X, Filter } from 'lucide-angular';

export interface FilterState {
  search: string;
  service: string;
  team: string;
  work_site: string;
  contract_type: string;
}

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css'
})
export class FiltersComponent implements OnInit {
  // Available filter options generated from the dataset
  services = input<string[]>([]);
  teams = input<string[]>([]);
  workSites = input<string[]>([]);
  contractTypes = input<string[]>(['Interne', 'Externe']);

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
  selectedService = signal('');
  selectedTeam = signal('');
  selectedWorkSite = signal('');
  selectedContractType = signal('');

  ngOnInit() {
    const initial = this.initialFilters();
    if (initial) {
      this.search.set(initial.search || '');
      this.selectedService.set(initial.service || '');
      this.selectedTeam.set(initial.team || '');
      this.selectedWorkSite.set(initial.work_site || '');
      this.selectedContractType.set(initial.contract_type || '');
    }
  }

  onFilterChange() {
    this.filterChange.emit({
      search: this.search(),
      service: this.selectedService(),
      team: this.selectedTeam(),
      work_site: this.selectedWorkSite(),
      contract_type: this.selectedContractType()
    });
  }

  resetFilters() {
    this.search.set('');
    this.selectedService.set('');
    this.selectedTeam.set('');
    this.selectedWorkSite.set('');
    this.selectedContractType.set('');
    this.onFilterChange();
  }
}
