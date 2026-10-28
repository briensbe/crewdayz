import { generateRecurringDates, RecurrenceConfig } from './recurrence-generator';

describe('RecurrenceGenerator', () => {
  it('should return empty result if no days are selected or dates are missing', () => {
    const config: RecurrenceConfig = {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      weekInterval: 1,
      selectedDays: [],
      period: 'full',
    };

    const res = generateRecurringDates(config);
    expect(res.datesToCreate.length).toBe(0);
    expect(res.totalGenerated).toBe(0);
  });

  it('should return empty result if endDate is before startDate', () => {
    const config: RecurrenceConfig = {
      startDate: '2025-02-01',
      endDate: '2025-01-01',
      weekInterval: 1,
      selectedDays: [3],
      period: 'full',
    };

    const res = generateRecurringDates(config);
    expect(res.datesToCreate.length).toBe(0);
  });

  it('should generate weekly recurring Wednesdays (80%) and skip French public holiday (2025-01-01)', () => {
    // Jan 1 2025 is a Wednesday and a French Public Holiday (Jour de l'An).
    // Wednesdays in Jan 2025: Jan 1 (holiday), Jan 8, Jan 15, Jan 22, Jan 29.
    const config: RecurrenceConfig = {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      weekInterval: 1,
      selectedDays: [3], // Wednesday
      period: 'full',
    };

    const res = generateRecurringDates(config);

    expect(res.skippedHolidays.length).toBe(1);
    expect(res.skippedHolidays[0].date).toBe('2025-01-01');

    expect(res.datesToCreate.map((d) => d.date)).toEqual([
      '2025-01-08',
      '2025-01-15',
      '2025-01-22',
      '2025-01-29',
    ]);
    expect(res.totalGenerated).toBe(4);
    expect(res.skippedConflicts.length).toBe(0);
  });

  it('should support multi-week interval (every 2 weeks)', () => {
    // Start on Friday Jan 3 2025 (Week 0).
    // Fridays in Jan 2025: Jan 3, Jan 10, Jan 17, Jan 24, Jan 31.
    // Interval = 2: Jan 3 (week 0), Jan 17 (week 2), Jan 31 (week 4).
    const config: RecurrenceConfig = {
      startDate: '2025-01-03',
      endDate: '2025-01-31',
      weekInterval: 2,
      selectedDays: [5], // Friday
      period: 'afternoon',
    };

    const res = generateRecurringDates(config);

    expect(res.datesToCreate.map((d) => d.date)).toEqual(['2025-01-03', '2025-01-17', '2025-01-31']);
    expect(res.datesToCreate[0].period).toBe('afternoon');
    expect(res.totalGenerated).toBe(3);
  });

  it('should detect and skip conflicting existing absences', () => {
    // Jan 8 has existing full absence, Jan 15 has morning absence
    const config: RecurrenceConfig = {
      startDate: '2025-01-01',
      endDate: '2025-01-22',
      weekInterval: 1,
      selectedDays: [3], // Wednesday
      period: 'full',
      existingAbsences: [
        { date: '2025-01-08', period: 'full' },
        { date: '2025-01-15', period: 'morning' },
      ],
    };

    const res = generateRecurringDates(config);

    // Jan 1 is holiday
    expect(res.skippedHolidays.map((s) => s.date)).toEqual(['2025-01-01']);

    // Jan 8 and Jan 15 conflict with requested 'full' period
    expect(res.skippedConflicts.map((s) => s.date)).toEqual(['2025-01-08', '2025-01-15']);

    // Only Jan 22 is created
    expect(res.datesToCreate.map((d) => d.date)).toEqual(['2025-01-22']);
  });

  it('should allow afternoon recurring absence if existing absence is morning only', () => {
    const config: RecurrenceConfig = {
      startDate: '2025-01-08',
      endDate: '2025-01-08',
      weekInterval: 1,
      selectedDays: [3], // Wednesday
      period: 'afternoon',
      existingAbsences: [{ date: '2025-01-08', period: 'morning' }],
    };

    const res = generateRecurringDates(config);

    expect(res.skippedConflicts.length).toBe(0);
    expect(res.datesToCreate.length).toBe(1);
    expect(res.datesToCreate[0].date).toBe('2025-01-08');
    expect(res.datesToCreate[0].period).toBe('afternoon');
  });

  it('should correctly select multiple days of week (e.g. Wednesday and Friday)', () => {
    const config: RecurrenceConfig = {
      startDate: '2025-01-06', // Monday
      endDate: '2025-01-12', // Sunday
      weekInterval: 1,
      selectedDays: [3, 5], // Wednesday & Friday
      period: 'morning',
    };

    const res = generateRecurringDates(config);

    expect(res.datesToCreate.map((d) => d.date)).toEqual(['2025-01-08', '2025-01-10']);
    expect(res.datesToCreate.every((d) => d.period === 'morning')).toBe(true);
  });
});
