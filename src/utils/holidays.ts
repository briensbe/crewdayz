/**
 * Calculates Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Returns true if the given Date object represents a French public holiday (jour férié).
 */
export function isFrenchPublicHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  // Fixed holidays
  if (month === 0 && day === 1) return true;   // Jour de l'An: Jan 1
  if (month === 4 && day === 1) return true;   // Fête du Travail: May 1
  if (month === 4 && day === 8) return true;   // Victoire 1945: May 8
  if (month === 6 && day === 14) return true;  // Fête Nationale: Jul 14
  if (month === 7 && day === 15) return true;  // Assomption: Aug 15
  if (month === 10 && day === 1) return true;  // Toussaint: Nov 1
  if (month === 10 && day === 11) return true; // Armistice 1918: Nov 11
  if (month === 11 && day === 25) return true; // Noël: Dec 25

  // Variable holidays based on Easter
  const easter = getEasterDate(year);
  
  // Easter Monday (Easter + 1 day)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  if (month === easterMonday.getMonth() && day === easterMonday.getDate()) return true;

  // Ascension Thursday (Easter + 39 days)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);
  if (month === ascension.getMonth() && day === ascension.getDate()) return true;

  // Pentecost Monday (Easter + 50 days)
  const pentecostMonday = new Date(easter);
  pentecostMonday.setDate(easter.getDate() + 50);
  if (month === pentecostMonday.getMonth() && day === pentecostMonday.getDate()) return true;

  return false;
}

/**
 * Returns the name of the French public holiday if the given Date object represents one, or null otherwise.
 */
export function getFrenchPublicHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  // Fixed holidays
  if (month === 0 && day === 1) return "Jour de l'An";
  if (month === 4 && day === 1) return "Fête du Travail";
  if (month === 4 && day === 8) return "Victoire 1945";
  if (month === 6 && day === 14) return "Fête Nationale";
  if (month === 7 && day === 15) return "Assomption";
  if (month === 10 && day === 1) return "Toussaint";
  if (month === 10 && day === 11) return "Armistice 1918";
  if (month === 11 && day === 25) return "Noël";

  // Variable holidays based on Easter
  const easter = getEasterDate(year);
  
  // Easter Monday (Easter + 1 day)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  if (month === easterMonday.getMonth() && day === easterMonday.getDate()) return "Lundi de Pâques";

  // Ascension Thursday (Easter + 39 days)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);
  if (month === ascension.getMonth() && day === ascension.getDate()) return "Ascension";

  // Pentecost Monday (Easter + 50 days)
  const pentecostMonday = new Date(easter);
  pentecostMonday.setDate(easter.getDate() + 50);
  if (month === pentecostMonday.getMonth() && day === pentecostMonday.getDate()) return "Lundi de Pentecôte";

  return null;
}
