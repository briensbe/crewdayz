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

/**
 * Vérifie si une chaîne cible contient une sous-chaîne de recherche,
 * de manière insensible à la casse et aux accents.
 */
export function includesNormalized(
  target: string | null | undefined,
  query: string | null | undefined
): boolean {
  const normQuery = normalizeString(query).trim();
  if (!normQuery) return true;
  if (!target) return false;
  return normalizeString(target).includes(normQuery);
}

/**
 * Vérifie si au moins une des chaînes cibles contient la sous-chaîne de recherche,
 * de manière insensible à la casse et aux accents.
 */
export function matchesSearch(
  targets: (string | null | undefined)[],
  query: string | null | undefined
): boolean {
  const normQuery = normalizeString(query).trim();
  if (!normQuery) return true;
  return targets.some((t) => includesNormalized(t, normQuery));
}

/**
 * Vérifie si un collaborateur correspond à une requête de recherche textuelle,
 * de manière insensible à la casse et aux accents.
 * Recherche sur: "Nom Prénom", "Prénom Nom", et le nom de l'entreprise si présent.
 */
export function matchesEmployeeSearch(
  emp: { first_name?: string | null; last_name?: string | null; company_name?: string | null },
  query: string | null | undefined
): boolean {
  const normQuery = normalizeString(query).trim();
  if (!normQuery) return true;

  const lastName = emp.last_name || '';
  const firstName = emp.first_name || '';
  const fullName = `${lastName} ${firstName}`.trim();
  const reversedFullName = `${firstName} ${lastName}`.trim();

  return (
    includesNormalized(fullName, normQuery) ||
    includesNormalized(reversedFullName, normQuery) ||
    includesNormalized(emp.company_name, normQuery)
  );
}
