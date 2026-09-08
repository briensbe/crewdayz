## Context

L'export Triskell présente une granularité fine par identifiant/contrat/unité analytique. Lorsqu'un collaborateur externe devient interne (ou travaille sur plusieurs unités), il possède plusieurs identifiants dans Triskell (ex: ID 1203 en tant que prestataire ACENSI, et ID 1628 en tant qu'employé interne).

Dans Crewdayz, le collaborateur est unique et sa présence réelle (jours ouvrés déduits des absences) est calculée de manière globale pour son profil.

## Goals / Non-Goals

**Goals:**
- Regrouper toutes les lignes Triskell matchant un même collaborateur Crewdayz en une seule `ReconciliationRow` pour le mois sélectionné.
- Sommer les jours consommés déclarés sur ces différentes lignes avant d'évaluer l'écart $\Delta$.
- Déterminer intelligemment les métadonnées affichées (`sectionType`, `supplier`, `unit`) en fonction de la ligne Triskell active sur le mois (ou de la ligne majoritaire en cas de transition).
- Conserver la liste des sous-lignes Triskell (`sourceEntries`) dans chaque ligne de réconciliation pour permettre une transparence totale dans la modale d'inspection.
- Corriger les KPIs globaux et l'export Excel pour refléter cette consolidation sans fausser les totaux.

**Non-Goals:**
- Modifier la structure de la base de données ou les modèles Supabase.
- Fusionner des ressources non matchées ayant des noms différents.

## Decisions

### Decision 1 : Agrégation au niveau de `buildMonthReconciliation`

Plutôt que d'altérer `rawEntries` lors du parsing initial (ce qui ferait perdre la traçabilité des identifiants et mois d'origine), l'agrégation est effectuée au moment de la construction du résumé mensuel `buildMonthReconciliation`.

*Alternatives considérées :*
- Fusionner dès le parsing : rejeté car cela masquerait les identifiants Triskell d'origine et compliquerait l'analyse multi-mois si le découpage change.

### Decision 2 : Règle de sélection des métadonnées de section et fournisseur

Pour une ressource consolidée sur un mois donné :
1. Si une seule sous-ligne a `consumedDays > 0` : ses attributs (`sectionType`, `supplier`, `unit`, `resourceNameTriskell`) sont utilisés comme affichage principal.
2. Si plusieurs sous-lignes ont `consumedDays > 0` : la sous-ligne ayant la plus grande consommation est priorisée (avec possibilité d'indiquer la multiplicité dans le détail ou via un tag).
3. Si toutes les sous-lignes ont `0` jour consommé : la sous-ligne la plus récente ou interne est sélectionnée.

### Decision 3 : Enrichissement du modèle `ReconciliationRow`

Ajout d'un champ `sourceEntries: TriskellSourceEntry[]` dans `ReconciliationRow` :
```typescript
export interface TriskellSourceEntry {
  resourceId: string;
  resourceName: string;
  unit: string;
  supplier: string;
  sectionType: 'ESN' | 'Interne';
  consumedDays: number;
}
```
Cela permet à la modale de détail d'afficher un bloc "Décomposition Triskell" clair quand un collaborateur possède plusieurs lignes.

## Risks / Trade-offs

- **[Risque] Plusieurs ressources non matchées portant des libellés proches** → *Mitigation :* Seuls les collaborateurs Crewdayz formellement identifiés par `matchEmployee` sont regroupés. Les ressources non reconnues restent distinctes.
- **[Risque] Performance de groupement** → *Mitigation :* Le volume mensuel (quelques dizaines à centaines de lignes) est très faible ; un groupement par `Map<number, Group>` en mémoire s'exécute en < 1ms.
