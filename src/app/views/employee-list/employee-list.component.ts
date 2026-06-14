import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
  styleUrl: './employee-list.component.css'
  })
export class EmployeeListComponent implements OnInit {
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
    contract_type: ''
  });

  // Unique options for filters dynamically extracted from employees list
  services = computed(() => {
    const list = this.employeeService.employees().map(e => e.service);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  teams = computed(() => {
    const list = this.employeeService.employees().map(e => e.team);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  workSites = computed(() => {
    const list = this.employeeService.employees().map(e => e.work_site);
    return Array.from(new Set(list)).filter(Boolean).sort();
  });

  // Filtered employees list mapped with active year balances (returns undefined if not in DB)
  filteredEmployees = computed(() => {
    const filters = this.activeFilters();
    const activeYear = Number(this.selectedYear());

    return this.employeeService.employees().filter(emp => {
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
    }).map(emp => {
      // Find balance for the selected year
      const balance = emp.cd_employee_balances?.find(b => b.year === activeYear);

      return {
        ...emp,
        initial_cp: balance?.initial_cp,
        initial_rtt: balance?.initial_rtt,
        initial_exceptional: balance?.initial_exceptional
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
  profile = signal<'Développeur' | 'Business Analyst'>('Développeur');
  initialCP = signal(25.0);
  initialRTT = signal(10.0);
  initialExceptional = signal(0.0);

  errorMessage = signal<string | null>(null);
  submitting = signal(false);

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
    
    // Fill balances for selected year
    const activeYear = this.selectedYear();
    const balance = emp.cd_employee_balances?.find(b => b.year === activeYear);
    const defaults = emp.contract_type === 'Interne'
      ? CONTRACT_DEFAULT_BALANCES.Interne
      : CONTRACT_DEFAULT_BALANCES.Externe;

    this.initialCP.set(balance ? balance.initial_cp : defaults.initial_cp);
    this.initialRTT.set(balance ? balance.initial_rtt : defaults.initial_rtt);
    this.initialExceptional.set(balance ? balance.initial_exceptional : defaults.initial_exceptional);

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
    if (!this.firstName() || !this.lastName() || !this.service() || !this.team() || !this.workSite()) {
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
      initial_cp: this.initialCP(),
      initial_rtt: this.initialRTT(),
      initial_exceptional: this.initialExceptional()
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
      this.errorMessage.set(err.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      this.submitting.set(false);
    }
  }

  async deleteEmployee(emp: Employee) {
    if (!emp.id) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${emp.first_name} ${emp.last_name} ? Cette action supprimera également toutes ses absences.`)) {
      try {
        await this.employeeService.deleteEmployee(emp.id);
      } catch (err: any) {
        alert('Erreur lors de la suppression : ' + err.message);
      }
    }
  }
}
