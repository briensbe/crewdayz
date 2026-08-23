export interface TeamStyle {
  background: string;
  color: string;
  borderColor: string;
}

const TEAM_PALETTE: TeamStyle[] = [
  { background: 'var(--team-bg-0)', color: 'var(--team-color-0)', borderColor: 'var(--team-border-0)' }, // Bleu
  { background: 'var(--team-bg-1)', color: 'var(--team-color-1)', borderColor: 'var(--team-border-1)' }, // Vert (Émeraude)
  { background: 'var(--team-bg-2)', color: 'var(--team-color-2)', borderColor: 'var(--team-border-2)' }, // Violet
  { background: 'var(--team-bg-3)', color: 'var(--team-color-3)', borderColor: 'var(--team-border-3)' }, // Ambre/Orange
  { background: 'var(--team-bg-4)', color: 'var(--team-color-4)', borderColor: 'var(--team-border-4)' }, // Rose/Fuchsia
  { background: 'var(--team-bg-5)', color: 'var(--team-color-5)', borderColor: 'var(--team-border-5)' }, // Turquoise/Teal
  { background: 'var(--team-bg-6)', color: 'var(--team-color-6)', borderColor: 'var(--team-border-6)' }, // Corail
  { background: 'var(--team-bg-7)', color: 'var(--team-color-7)', borderColor: 'var(--team-border-7)' }, // Mauve
  { background: 'var(--team-bg-8)', color: 'var(--team-color-8)', borderColor: 'var(--team-border-8)' }, // Tilleul/Vert Olive
  { background: 'var(--team-bg-9)', color: 'var(--team-color-9)', borderColor: 'var(--team-border-9)' }, // Cyan
  { background: 'var(--team-bg-10)', color: 'var(--team-color-10)', borderColor: 'var(--team-border-10)' }, // Rouge Rubis
  { background: 'var(--team-bg-11)', color: 'var(--team-color-11)', borderColor: 'var(--team-border-11)' }, // Or/Jaune doré
];

// Dictionnaire de surcharges pour forcer une couleur spécifique par équipe (index de 0 à 11)
// Couleurs : 0=Bleu, 1=Émeraude, 2=Violet, 3=Ambre, 4=Rose, 5=Turquoise, 6=Corail, 7=Mauve, 8=Olive, 9=Cyan, 10=Rubis, 11=Or
const TEAM_OVERRIDES: Record<string, number> = {
  artémis: 0, // Force le bleu (index 0) pour éviter la collision avec "Autre" (index 11/Or)
  artemis: 0, // Version sans accent par sécurité
};

export function getTeamStyle(teamName: string): TeamStyle {
  if (!teamName) {
    return {
      background: 'var(--background)',
      color: 'var(--text-muted)',
      borderColor: 'var(--border-light)',
    };
  }

  const cleanName = teamName.trim().toLowerCase();

  // Si l'équipe a une couleur forcée par surcharge
  if (cleanName in TEAM_OVERRIDES) {
    return TEAM_PALETTE[TEAM_OVERRIDES[cleanName]];
  }

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % TEAM_PALETTE.length;
  return TEAM_PALETTE[index];
}
