import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Umbrella, MapPin, Users, Calendar, Search, ArrowRight, Info } from 'lucide-angular';
import { SchoolHolidayService } from '../../services/school-holiday.service';
import { EmployeeService } from '../../services/employee.service';
import { SchoolHolidayPeriod } from '../../models/types';

interface SiteStats {
  label: string;
  zone: string;
  employeeCount: number;
}

interface PeriodWithStatus extends SchoolHolidayPeriod {
  zones: string[];
  status: 'passed' | 'current' | 'upcoming';
  statusLabel: string;
}

@Component({
  selector: 'app-holidays-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './holidays-view.component.html',
  styleUrl: './holidays-view.component.css'
})
export class HolidaysViewComponent {
  // Services
  protected readonly holidayService = inject(SchoolHolidayService);
  protected readonly employeeService = inject(EmployeeService);

  // Expose Icons
  readonly Umbrella = Umbrella;
  readonly MapPin = MapPin;
  readonly Users = Users;
  readonly Calendar = Calendar;
  readonly Search = Search;
  readonly ArrowRight = ArrowRight;
  readonly Info = Info;

  // Selected State
  selectedZone = signal<string>('All');
  searchQuery = signal<string>('');
  selectedSite = signal<string | null>(null);
  hidePassedHolidays = signal<boolean>(true);

  // Get active year
  currentYear = new Date().getFullYear();

  // Zones list helper
  zones = computed(() => {
    const config = this.holidayService.config();
    if (!config || !config.zones) return [];
    return Object.keys(config.zones);
  });

  // Unique sites from configuration
  configuredSites = computed<SiteStats[]>(() => {
    const config = this.holidayService.config();
    const employees = this.employeeService.employees();
    if (!config) return [];

    const associations = config.siteAssociations || {};
    return Object.entries(associations).map(([site, zone]) => {
      const count = employees.filter(emp => emp.work_site === site).length;
      return {
        label: site,
        zone,
        employeeCount: count
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  });

  // Employees for the selected site
  selectedSiteEmployees = computed(() => {
    const site = this.selectedSite();
    if (!site) return [];
    return this.employeeService.employees()
      .filter(emp => emp.work_site === site)
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
  });

  // Flat list of holiday periods with status and zone mapping
  allPeriods = computed<PeriodWithStatus[]>(() => {
    const config = this.holidayService.config();
    if (!config || !config.zones) return [];

    const todayStr = this.formatDateStr(new Date());
    const list: PeriodWithStatus[] = [];

    Object.entries(config.zones).forEach(([zoneName, periods]) => {
      periods.forEach(p => {
        let status: 'passed' | 'current' | 'upcoming' = 'upcoming';
        let statusLabel = 'À venir';

        if (todayStr > p.end) {
          status = 'passed';
          statusLabel = 'Passé';
        } else if (todayStr >= p.start && todayStr <= p.end) {
          status = 'current';
          statusLabel = 'En cours';
        }

        const existing = list.find(item => item.name === p.name && item.start === p.start && item.end === p.end);
        if (existing) {
          if (!existing.zones.includes(zoneName)) {
            existing.zones.push(zoneName);
          }
        } else {
          list.push({
            name: p.name,
            start: p.start,
            end: p.end,
            zones: [zoneName],
            status,
            statusLabel
          });
        }
      });
    });

    // Sort by start date
    return list.sort((a, b) => a.start.localeCompare(b.start));
  });

  // Filtered holiday periods
  filteredPeriods = computed(() => {
    const zoneFilter = this.selectedZone();
    const query = this.searchQuery().toLowerCase().trim();
    const hidePassed = this.hidePassedHolidays();
    let periods = this.allPeriods();

    if (zoneFilter !== 'All') {
      periods = periods.filter(p => p.zones.includes(zoneFilter));
    }

    if (hidePassed) {
      periods = periods.filter(p => p.status !== 'passed');
    }

    if (query) {
      periods = periods.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.zones.some(z => z.toLowerCase().includes(query)) ||
        p.start.includes(query) ||
        p.end.includes(query)
      );
    }

    return periods;
  });

  // Quick stats computed
  stats = computed(() => {
    const sites = this.configuredSites();
    const periods = this.allPeriods();
    
    const activeVacationSitesCount = sites.filter(site => 
      this.holidayService.isHolidayForSite(new Date(), site.label)
    ).length;

    const currentHolidaysCount = periods.filter(p => p.status === 'current').length;

    return {
      totalSites: sites.length,
      activeVacationSitesCount,
      currentHolidaysCount
    };
  });

  selectSite(siteName: string) {
    if (this.selectedSite() === siteName) {
      this.selectedSite.set(null); // toggle off
    } else {
      this.selectedSite.set(siteName);
    }
  }

  getZoneColorClass(zone: string): string {
    switch (zone) {
      case 'Zone A': return 'zone-a';
      case 'Zone B': return 'zone-b';
      case 'Zone C': return 'zone-c';
      default: return '';
    }
  }

  private formatDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Format date to French human readable form
  formatFrenchDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
  }
}
