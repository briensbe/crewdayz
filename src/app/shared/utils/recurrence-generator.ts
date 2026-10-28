import { isFrenchPublicHoliday } from '../../../utils/holidays';

export interface RecurrenceConfig {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weekInterval: number; // e.g. 1 = every week, 2 = every 2 weeks
  selectedDays: number[]; // 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 0 = Sunday
  period: 'full' | 'morning' | 'afternoon';
  existingAbsences?: Array<{ date: string; period: 'full' | 'morning' | 'afternoon' }>;
}

export interface RecurringDateItem {
  date: string;
  period: 'full' | 'morning' | 'afternoon';
}

export interface SkippedDateItem {
  date: string;
  reason: 'holiday' | 'existing_absence';
  period: 'full' | 'morning' | 'afternoon';
}

export interface RecurrenceResult {
  datesToCreate: RecurringDateItem[];
  skippedHolidays: SkippedDateItem[];
  skippedConflicts: SkippedDateItem[];
  totalGenerated: number;
}

/**
 * Returns the Monday (at 00:00:00) for the week containing the given date.
 */
function getMondayOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Checks whether an existing absence conflicts with the requested target period.
 */
function hasConflict(
  existingPeriod: 'full' | 'morning' | 'afternoon',
  targetPeriod: 'full' | 'morning' | 'afternoon',
): boolean {
  if (existingPeriod === 'full' || targetPeriod === 'full') {
    return true;
  }
  return existingPeriod === targetPeriod;
}

/**
 * Pure generator function to calculate all recurring dates within a date range,
 * skipping French public holidays and conflicting existing absences.
 */
export function generateRecurringDates(config: RecurrenceConfig): RecurrenceResult {
  const datesToCreate: RecurringDateItem[] = [];
  const skippedHolidays: SkippedDateItem[] = [];
  const skippedConflicts: SkippedDateItem[] = [];

  if (!config.startDate || !config.endDate || !config.selectedDays || config.selectedDays.length === 0) {
    return {
      datesToCreate: [],
      skippedHolidays: [],
      skippedConflicts: [],
      totalGenerated: 0,
    };
  }

  const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = config.endDate.split('-').map(Number);

  const startDate = new Date(startYear, startMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

  if (endDate < startDate) {
    return {
      datesToCreate: [],
      skippedHolidays: [],
      skippedConflicts: [],
      totalGenerated: 0,
    };
  }

  const weekInterval = Math.max(1, config.weekInterval || 1);
  const startMonday = getMondayOfWeek(startDate);

  // Index existing absences by date for O(1) lookup
  const absenceMap = new Map<string, Array<'full' | 'morning' | 'afternoon'>>();
  if (config.existingAbsences) {
    for (const abs of config.existingAbsences) {
      const list = absenceMap.get(abs.date) || [];
      list.push(abs.period);
      absenceMap.set(abs.date, list);
    }
  }

  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    if (config.selectedDays.includes(dayOfWeek)) {
      // Calculate relative week index from the start Monday
      const currentMonday = getMondayOfWeek(current);
      const diffMs = currentMonday.getTime() - startMonday.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);

      if (diffWeeks % weekInterval === 0) {
        const y = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const dateStr = `${y}-${mm}-${dd}`;

        // 1. Check if public holiday
        if (isFrenchPublicHoliday(current)) {
          skippedHolidays.push({
            date: dateStr,
            reason: 'holiday',
            period: config.period,
          });
        } else {
          // 2. Check for conflicts with existing absences
          const existingPeriods = absenceMap.get(dateStr);
          const isConflicting = existingPeriods?.some((ep) => hasConflict(ep, config.period));

          if (isConflicting) {
            skippedConflicts.push({
              date: dateStr,
              reason: 'existing_absence',
              period: config.period,
            });
          } else {
            datesToCreate.push({
              date: dateStr,
              period: config.period,
            });
          }
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    datesToCreate,
    skippedHolidays,
    skippedConflicts,
    totalGenerated: datesToCreate.length,
  };
}
