import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Edit, Trash2, Users, Building2, MapPin, Briefcase, DollarSign, Calendar } from 'lucide-angular';
import { EmployeeService } from '../../services/employee.service';
import { Employee, CONTRACT_DEFAULT_BALANCES } from '../../models/types';
import { FiltersComponent, FilterState } from '../../shared/filters/filters.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FiltersComponent],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css',
})
export class EmployeeListComponent implements OnInit {
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.showModal()) return;

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.saveEmployee();
    } else if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      this.showModal.set(false);
    }
  }

  // Services and dependencies
  protected readonly employeeService = inject(EmployeeService);

  // Expose icons
  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly Users = Users;

  // Active Year State
  selectedYear = signal<number>(new Date().getFullYear());
  yearsList = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  // Filter State
  activeFilters = signal<FilterState>({
    search: '',
    service: '',
    team: '',
    work_site: '',
    contract_type: '',
  });

  // Unique options for filters dynamically extracted from employees list
  services = computed(() => {
    const list = this.employeeService.employees().map((e) => e.service);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  teams = computed(() => {
    const list = this.employeeService.employees().map((e) => e.team);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  workSites = computed(() => {
    const list = this.employeeService.employees().map((e) => e.work_site);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  profiles = computed(() => {
    const list = this.employeeService.employees().map((e) => e.profile);
    // Include the default options just in case database is empty or we want standard defaults
    const defaults = ['Développeur', 'Business Analyst', 'Alternant', 'Responsable'];
    const merged = [...defaults, ...list];
    return Array.from(new Set(merged)).filter(Boolean).sort();
  });

  companyNames = computed(() => {
    const list = this.employeeService.employees().map((e) => e.company_name);
    return Array.from(new Set(list)).filter((c): c is string => !!c).sort();
  });

  // Filtered employees list mapped with active year balances (returns undefined if not in DB)
  filteredEmployees = computed(() => {
    const filters = this.activeFilters();
    const activeYear = Number(this.selectedYear());

    return this.employeeService
      .employees()
      .filter((emp) => {
        // Search filter (first name, last name, or ESN name)
        if (filters.search) {
          const query = filters.search.toLowerCase();
          const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
          const matchesName = fullName.includes(query);
          const matchesCompany = emp.company_name?.toLowerCase().includes(query) || false;
          if (!matchesName && !matchesCompany) return false;
        }
        // Dropdown filters
        if (filters.service && emp.service !== filters.service) return false;
        if (filters.team && emp.team !== filters.team) return false;
        if (filters.work_site && emp.work_site !== filters.work_site) return false;
        if (filters.contract_type && emp.contract_type !== filters.contract_type) return false;

        return true;
      })
      .map((emp): Employee => {
        // Find balance for the selected year
        const balance = emp.cd_employee_balances?.find((b) => b.year === activeYear);

        return {
          ...emp,
          initial_cp: balance?.initial_cp,
          initial_rtt: balance?.initial_rtt,
          initial_exceptional: balance?.initial_exceptional,
        };
      });
  });

  // Modal State
  showModal = signal(false);
  isEditMode = signal(false);
  currentEmployeeId = signal<string | null>(null);

  // Form Fields
  firstName = signal('');
  lastName = signal('');
  service = signal('');
  team = signal(''); // Ilot
  workSite = signal('');
  contractType = signal<'Interne' | 'Externe'>('Interne');
  companyName = signal('');
  profile = signal<string>('Développeur');
  arrivalDate = signal<string>('');
  departureDate = signal<string>('');
  initialCP = signal(25.0);
  initialRTT = signal(10.0);
  initialExceptional = signal(0.0);

  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  // Combobox custom state for Teams
  showTeamDropdown = signal(false);

  // Computes filtered list based on typed value in "team" field
  filteredTeams = computed(() => {
    const query = this.team().toLowerCase().trim();
    // If query is empty OR if it matches exactly an existing team, show all teams
    if (!query || this.teams().some((t) => t.toLowerCase() === query)) {
      return this.teams();
    }
    return this.teams().filter((t) => t.toLowerCase().includes(query));
  });

  // Determines if the entered text is a new team that doesn't exist yet
  isNewTeam = computed(() => {
    const current = this.team().trim();
    if (!current) return false;
    return !this.teams().some((t) => t.toLowerCase() === current.toLowerCase());
  });

  onTeamSearch(val: string) {
    this.team.set(val);
    this.showTeamDropdown.set(true);
  }

  selectTeam(val: string) {
    this.team.set(val);
    this.showTeamDropdown.set(false);
  }

  toggleTeamDropdown(event: Event) {
    event.stopPropagation();
    this.showTeamDropdown.update((v) => !v);
  }

  closeTeamDropdown() {
    // Timeout to allow mousedown events on options to trigger first
    setTimeout(() => {
      this.showTeamDropdown.set(false);
    }, 200);
  }

  // Combobox custom state for Services
  showServiceDropdown = signal(false);

  // Computes filtered list based on typed value in "service" field
  filteredServices = computed(() => {
    const query = this.service().toLowerCase().trim();
    // If query is empty OR if it matches exactly an existing service, show all services
    if (!query || this.services().some((s) => s.toLowerCase() === query)) {
      return this.services();
    }
    return this.services().filter((s) => s.toLowerCase().includes(query));
  });

  // Determines if the entered text is a new service that doesn't exist yet
  isNewService = computed(() => {
    const current = this.service().trim();
    if (!current) return false;
    return !this.services().some((s) => s.toLowerCase() === current.toLowerCase());
  });

  onServiceSearch(val: string) {
    this.service.set(val);
    this.showServiceDropdown.set(true);
  }

  selectService(val: string) {
    this.service.set(val);
    this.showServiceDropdown.set(false);
  }

  toggleServiceDropdown(event: Event) {
    event.stopPropagation();
    this.showServiceDropdown.update((v) => !v);
  }

  closeServiceDropdown() {
    // Timeout to allow mousedown events on options to trigger first
    setTimeout(() => {
      this.showServiceDropdown.set(false);
    }, 200);
  }

  // Combobox custom state for ESN companies
  showCompanyDropdown = signal(false);

  // Computes filtered list based on typed value in "companyName" field
  filteredCompanies = computed(() => {
    const query = this.companyName().toLowerCase().trim();
    // If query is empty OR if it matches exactly an existing company, show all companies
    if (!query || this.companyNames().some((c) => c?.toLowerCase() === query)) {
      return this.companyNames();
    }
    return this.companyNames().filter((c) => c?.toLowerCase().includes(query));
  });

  // Determines if the entered text is a new company that doesn't exist yet
  isNewCompany = computed(() => {
    const current = this.companyName().trim();
    if (!current) return false;
    return !this.companyNames().some((c) => c?.toLowerCase() === current.toLowerCase());
  });

  onCompanySearch(val: string) {
    this.companyName.set(val);
    this.showCompanyDropdown.set(true);
  }

  selectCompany(val: string) {
    this.companyName.set(val);
    this.showCompanyDropdown.set(false);
  }

  toggleCompanyDropdown(event: Event) {
    event.stopPropagation();
    this.showCompanyDropdown.update((v) => !v);
  }

  closeCompanyDropdown() {
    // Timeout to allow mousedown events on options to trigger first
    setTimeout(() => {
      this.showCompanyDropdown.set(false);
    }, 200);
  }

  // Combobox custom state for workSites
  showWorkSiteDropdown = signal(false);
  
  // Computes filtered list based on typed value in "workSite" field
  filteredWorkSites = computed(() => {
    const query = this.workSite().toLowerCase().trim();
    // If query is empty OR if it matches exactly an existing site, show all sites
    if (!query || this.workSites().some(w => w.toLowerCase() === query)) {
      return this.workSites();
    }
    return this.workSites().filter(w => w.toLowerCase().includes(query));
  });

  // Determines if the entered text is a new site that doesn't exist yet
  isNewWorkSite = computed(() => {
    const current = this.workSite().trim();
    if (!current) return false;
    return !this.workSites().some(w => w.toLowerCase() === current.toLowerCase());
  });

  onWorkSiteSearch(val: string) {
    this.workSite.set(val);
    this.showWorkSiteDropdown.set(true);
  }

  selectWorkSite(val: string) {
    this.workSite.set(val);
    this.showWorkSiteDropdown.set(false);
  }

  toggleWorkSiteDropdown(event: Event) {
    event.stopPropagation();
    this.showWorkSiteDropdown.update(v => !v);
  }

  closeWorkSiteDropdown() {
    // Timeout to allow mousedown events on options to trigger first
    setTimeout(() => {
      this.showWorkSiteDropdown.set(false);
    }, 200);
  }

  // Combobox custom state for profiles
  showProfileDropdown = signal(false);
  
  // Computes filtered list based on typed value in "profile" field
  filteredProfiles = computed(() => {
    const query = this.profile().toLowerCase().trim();
    // If query is empty OR if it matches exactly an existing profile, show all profiles
    if (!query || this.profiles().some(p => p.toLowerCase() === query)) {
      return this.profiles();
    }
    return this.profiles().filter(p => p.toLowerCase().includes(query));
  });

  // Determines if the entered text is a new profile that doesn't exist yet
  isNewProfile = computed(() => {
    const current = this.profile().trim();
    if (!current) return false;
    return !this.profiles().some(p => p.toLowerCase() === current.toLowerCase());
  });

  onProfileSearch(val: string) {
    this.profile.set(val);
    this.showProfileDropdown.set(true);
  }

  selectProfile(val: string) {
    this.profile.set(val);
    this.showProfileDropdown.set(false);
  }

  toggleProfileDropdown(event: Event) {
    event.stopPropagation();
    this.showProfileDropdown.update(v => !v);
  }

  closeProfileDropdown() {
    // Timeout to allow mousedown events on options to trigger first
    setTimeout(() => {
      this.showProfileDropdown.set(false);
    }, 200);
  }

  ngOnInit() {
    this.employeeService.fetchEmployees();
  }

  handleFilterChange(newFilters: FilterState) {
    this.activeFilters.set(newFilters);
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.currentEmployeeId.set(null);
    this.resetFormFields();
    this.showModal.set(true);
  }

  openEditModal(emp: Employee) {
    if (!emp.id) return;
    this.isEditMode.set(true);
    this.currentEmployeeId.set(emp.id);

    // Fill form
    this.firstName.set(emp.first_name);
    this.lastName.set(emp.last_name);
    this.service.set(emp.service);
    this.team.set(emp.team);
    this.workSite.set(emp.work_site);
    this.contractType.set(emp.contract_type);
    this.companyName.set(emp.company_name || '');
    this.profile.set(emp.profile);
    this.arrivalDate.set(emp.arrival_date || '');
    this.departureDate.set(emp.departure_date || '');

    // Fill balances for selected year
    const activeYear = this.selectedYear();
    const balance = emp.cd_employee_balances?.find((b) => b.year === activeYear);
    const defaults =
      emp.contract_type === 'Interne'
        ? CONTRACT_DEFAULT_BALANCES.Interne
        : CONTRACT_DEFAULT_BALANCES.Externe;

    this.initialCP.set(balance ? balance.initial_cp : defaults.initial_cp);
    this.initialRTT.set(balance ? balance.initial_rtt : defaults.initial_rtt);
    this.initialExceptional.set(
      balance ? balance.initial_exceptional : defaults.initial_exceptional,
    );

    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  resetFormFields() {
    this.firstName.set('');
    this.lastName.set('');
    this.service.set('');
    this.team.set('');
    this.workSite.set('');
    this.contractType.set('Interne');
    this.companyName.set('');
    this.profile.set('Développeur');
    this.arrivalDate.set('');
    this.departureDate.set('');

    const defaults = CONTRACT_DEFAULT_BALANCES.Interne;
    this.initialCP.set(defaults.initial_cp);
    this.initialRTT.set(defaults.initial_rtt);
    this.initialExceptional.set(defaults.initial_exceptional);
    this.errorMessage.set(null);
  }

  onContractTypeChange(type: 'Interne' | 'Externe') {
    this.contractType.set(type);
    // Auto-update defaults only in Add mode (let users modify edit balances manually)
    if (!this.isEditMode()) {
      const defaults = CONTRACT_DEFAULT_BALANCES[type];
      this.initialCP.set(defaults.initial_cp);
      this.initialRTT.set(defaults.initial_rtt);
      this.initialExceptional.set(defaults.initial_exceptional);
    }
  }

  onYearChange(yearVal: any) {
    this.selectedYear.set(Number(yearVal));
  }

  async saveEmployee() {
    this.errorMessage.set(null);

    // Validation
    if (
      !this.firstName() ||
      !this.lastName() ||
      !this.service() ||
      !this.team() ||
      !this.workSite()
    ) {
      this.errorMessage.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (this.contractType() === 'Externe' && !this.companyName()) {
      this.errorMessage.set('Veuillez renseigner le nom de la société (ESN) pour les externes.');
      return;
    }

    const payload: Employee = {
      first_name: this.firstName(),
      last_name: this.lastName(),
      service: this.service(),
      team: this.team(),
      work_site: this.workSite(),
      contract_type: this.contractType(),
      company_name: this.contractType() === 'Externe' ? this.companyName() : undefined,
      profile: this.profile(),
      arrival_date: this.arrivalDate() || undefined,
      departure_date: this.departureDate() || undefined,
      initial_cp: this.initialCP(),
      initial_rtt: this.initialRTT(),
      initial_exceptional: this.initialExceptional(),
    };

    this.submitting.set(true);
    try {
      const activeYear = this.selectedYear();
      if (this.isEditMode()) {
        const id = this.currentEmployeeId();
        if (id) {
          await this.employeeService.updateEmployee(id, payload, activeYear);
        }
      } else {
        await this.employeeService.createEmployee(payload, activeYear);
      }
      this.showModal.set(false);
    } catch (err: any) {
      this.errorMessage.set(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      this.submitting.set(false);
    }
  }

  async deleteEmployee(emp: Employee) {
    if (!emp.id) return;
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer ${emp.first_name} ${emp.last_name} ? Cette action supprimera également toutes ses absences.`,
      )
    ) {
      try {
        await this.employeeService.deleteEmployee(emp.id);
      } catch (err: any) {
        alert('Erreur lors de la suppression : ' + err.message);
      }
    }
  }
}
