export interface TeamStyle {
  background: string;
  color: string;
  borderColor: string;
}

const TEAM_PALETTE: TeamStyle[] = [
  { background: 'hsl(220, 85%, 96%)', color: 'hsl(220, 85%, 30%)', borderColor: 'hsl(220, 85%, 90%)' }, // Bleu
  { background: 'hsl(145, 80%, 96%)', color: 'hsl(145, 80%, 25%)', borderColor: 'hsl(145, 80%, 90%)' }, // Vert (Émeraude)
  { background: 'hsl(270, 80%, 96%)', color: 'hsl(270, 80%, 30%)', borderColor: 'hsl(270, 80%, 90%)' }, // Violet
  { background: 'hsl(35, 90%, 95%)',  color: 'hsl(35, 90%, 25%)',  borderColor: 'hsl(35, 90%, 88%)' },  // Ambre/Orange
  { background: 'hsl(325, 80%, 96%)', color: 'hsl(325, 80%, 30%)', borderColor: 'hsl(325, 80%, 90%)' }, // Rose/Fuchsia
  { background: 'hsl(180, 75%, 95%)', color: 'hsl(180, 75%, 25%)', borderColor: 'hsl(180, 75%, 88%)' }, // Turquoise/Teal
  { background: 'hsl(15, 85%, 96%)',  color: 'hsl(15, 85%, 30%)',  borderColor: 'hsl(15, 85%, 90%)' },  // Corail
  { background: 'hsl(295, 75%, 96%)', color: 'hsl(295, 75%, 30%)', borderColor: 'hsl(295, 75%, 90%)' }, // Mauve
  { background: 'hsl(80, 65%, 94%)',  color: 'hsl(80, 75%, 23%)',  borderColor: 'hsl(80, 65%, 85%)' },  // Tilleul/Vert Olive
  { background: 'hsl(200, 80%, 95%)', color: 'hsl(200, 85%, 28%)', borderColor: 'hsl(200, 80%, 88%)' }, // Cyan
  { background: 'hsl(345, 80%, 96%)', color: 'hsl(345, 80%, 30%)', borderColor: 'hsl(345, 80%, 90%)' }, // Rouge Rubis
  { background: 'hsl(50, 80%, 94%)',  color: 'hsl(50, 85%, 25%)',  borderColor: 'hsl(50, 80%, 85%)' }   // Or/Jaune doré
];

// Dictionnaire de surcharges pour forcer une couleur spécifique par équipe (index de 0 à 11)
// Couleurs : 0=Bleu, 1=Émeraude, 2=Violet, 3=Ambre, 4=Rose, 5=Turquoise, 6=Corail, 7=Mauve, 8=Olive, 9=Cyan, 10=Rubis, 11=Or
const TEAM_OVERRIDES: Record<string, number> = {
  'artémis': 0, // Force le bleu (index 0) pour éviter la collision avec "Autre" (index 11/Or)
  'artemis': 0  // Version sans accent par sécurité
};

export function getTeamStyle(teamName: string): TeamStyle {
  if (!teamName) {
    return {
      background: 'var(--background)',
      color: 'var(--text-muted)',
      borderColor: 'var(--border-light)'
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
