import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SchoolHolidaysConfig, SchoolHolidayPeriod } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class SchoolHolidayService {
  private readonly http = inject(HttpClient);
  
  // Expose configuration as a read-only signal
  private readonly _config = signal<SchoolHolidaysConfig | null>(null);
  public readonly config = this._config.asReadonly();

  constructor() {
    this.loadConfig();
  }

  /**
   * Loads school holiday configuration from assets.
   */
  public loadConfig(): void {
    this.http.get<SchoolHolidaysConfig>('assets/school-holidays.json').subscribe({
      next: (data) => {
        this._config.set(data);
      },
      error: (err) => {
        console.error('Failed to load school holidays config:', err);
      }
    });
  }

  /**
   * Returns the school holiday zone for a given work site.
   */
  public getZoneForSite(siteLabel: string): string | null {
    const currentConfig = this._config();
    if (!currentConfig || !currentConfig.siteAssociations) {
      return null;
    }
    return currentConfig.siteAssociations[siteLabel] || null;
  }

  /**
   * Helper to format Date to YYYY-MM-DD in local time
   */
  private formatDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Checks if a given date (Date or string in YYYY-MM-DD format) is a school holiday for a given zone.
   */
  public isHolidayInZone(date: Date | string, zone: string): boolean {
    const currentConfig = this._config();
    if (!currentConfig || !currentConfig.zones || !currentConfig.zones[zone]) {
      return false;
    }

    const dateStr = typeof date === 'string' ? date : this.formatDateStr(date);
    const periods = currentConfig.zones[zone];

    return periods.some(period => dateStr >= period.start && dateStr <= period.end);
  }

  /**
   * Returns the holiday name if the date is a school holiday in a given zone, or null otherwise.
   */
  public getHolidayNameInZone(date: Date | string, zone: string): string | null {
    const currentConfig = this._config();
    if (!currentConfig || !currentConfig.zones || !currentConfig.zones[zone]) {
      return null;
    }

    const dateStr = typeof date === 'string' ? date : this.formatDateStr(date);
    const periods = currentConfig.zones[zone];

    const matchingPeriod = periods.find(period => dateStr >= period.start && dateStr <= period.end);
    return matchingPeriod ? matchingPeriod.name : null;
  }

  /**
   * Checks if a given date is a school holiday for the zone associated with a given work site.
   */
  public isHolidayForSite(date: Date | string, siteLabel: string): boolean {
    const zone = this.getZoneForSite(siteLabel);
    if (!zone) {
      return false;
    }
    return this.isHolidayInZone(date, zone);
  }

  /**
   * Returns the holiday name if a given date is a school holiday for the zone associated with a given work site, or null otherwise.
   */
  public getHolidayNameForSite(date: Date | string, siteLabel: string): string | null {
    const zone = this.getZoneForSite(siteLabel);
    if (!zone) {
      return null;
    }
    return this.getHolidayNameInZone(date, zone);
  }
}
