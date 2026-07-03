/**
 * Normalise une chaîne en supprimant les accents (diacritiques) et en la convertissant en minuscules.
 * Utile pour la recherche insensible à la casse et aux accents.
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
