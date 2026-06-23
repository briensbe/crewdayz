import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

let supabaseUrl = '';
let supabaseKey = '';

// 1. Déterminer si un fichier d'environnement spécifique a été fourni via --env-file
const args = process.argv.slice(2);
const envFileArgIndex = args.indexOf('--env-file');
let envFilePath = '';
if (envFileArgIndex !== -1 && args[envFileArgIndex + 1]) {
  envFilePath = args[envFileArgIndex + 1];
}

if (!envFilePath) {
  console.error(`
Erreur : L'option --env-file est obligatoire.
Vous devez spécifier un fichier d'environnement :
   npx tsx scripts/import-excel.ts <chemin_fichier_excel> --env-file .env.development
   npx tsx scripts/import-excel.ts <chemin_fichier_excel> --env-file .env.production
`);
  process.exit(1);
}

const targetEnvPath = path.resolve(process.cwd(), envFilePath);

if (fs.existsSync(targetEnvPath)) {
  console.log(`Lecture des identifiants depuis le fichier : ${targetEnvPath}`);
  const content = fs.readFileSync(targetEnvPath, 'utf-8');

  // Détection du format : si le fichier contient des "=" (format .env), on le parse comme un .env
  if (content.includes('SUPABASE_URL=') || content.includes('SUPABASE_KEY=') || content.includes('SUPABASE_SERVICE_ROLE_KEY=') || content.includes('SUPABASE_SECRET_KEY=')) {
    const urlMatch = content.match(/^SUPABASE_URL\s*=\s*(.*)$/m);
    const keyMatch = content.match(/^SUPABASE_SECRET_KEY\s*=\s*(.*)$/m) || content.match(/^SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)$/m) || content.match(/^SUPABASE_KEY\s*=\s*(.*)$/m);
    if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim().replace(/^["']|["']$/g, '');
    if (keyMatch && keyMatch[1]) supabaseKey = keyMatch[1].trim().replace(/^["']|["']$/g, '');
  } else {
    // Sinon on le parse comme un fichier TypeScript d'environnement Angular (format key: 'value')
    const urlMatch = content.match(/supabaseUrl\s*:\s*["']([^"']+)["']/);
    const keyMatch = content.match(/supabaseKey\s*:\s*["']([^"']+)["']/);
    if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1];
    if (keyMatch && keyMatch[1]) supabaseKey = keyMatch[1];
  }
} else if (envFilePath) {
  console.error(`Erreur : Le fichier d'environnement spécifié n'existe pas : ${targetEnvPath}`);
  process.exit(1);
}

// 2. Validation finale des identifiants
if (!supabaseUrl || !supabaseKey) {
  console.error(`
Erreur : Identifiants Supabase manquants.
Veuillez soit :
1. Créer un fichier d'environnement (ex: .env.dev) contenant :
   SUPABASE_URL=votre_url
   SUPABASE_SECRET_KEY=votre_cle_secrete (ou ancienne clé service_role)
2. Spécifier un fichier de dev Angular :
   npx tsx scripts/import-excel.ts <chemin_fichier_excel> --env-file src/environments/environment.ts
`);
  process.exit(1);
}

// Initialisation du client Supabase avec le schéma "crewdayz"
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'crewdayz'
  }
});

// Normaliser un nom pour la comparaison
function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^\d+/, '')                  // Suppression du préfixe numérique (ex: "00")
    .normalize('NFD')                     // Décomposition des accents
    .replace(/[\u0300-\u036f]/g, '')     // Suppression des accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')           // Remplacement des caractères non alpha-numériques par un espace (ex: tirets, apostrophes)
    .replace(/\s+/g, ' ')                 // Remplacement des espaces multiples par un seul espace
    .trim();
}

const monthMap: { [key: string]: number } = {
  'janvier': 1, 'février': 2, 'fevrier': 2, 'mars': 3, 'avril': 4,
  'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8, 'aout': 8,
  'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12, 'decembre': 12
};

async function main() {
  // Récupérer le chemin du fichier Excel (premier argument restant qui n'est pas --env-file ou sa valeur)
  const remainingArgs = process.argv.slice(2);
  const envFileIndex = remainingArgs.indexOf('--env-file');
  if (envFileIndex !== -1) {
    remainingArgs.splice(envFileIndex, 2);
  }
  const excelFilePath = remainingArgs[0] || path.join('private', 'ClasseurTempPour Insert SQL.xlsx');

  const absolutePath = path.resolve(process.cwd(), excelFilePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Erreur : Le fichier Excel n'existe pas au chemin : ${absolutePath}`);
    process.exit(1);
  }

  // Détection ou définition de l'année à importer
  const yearMatch = excelFilePath.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
  console.log(`Année ciblée pour l'importation : ${year}`);

  // 1. Récupération des employés existants en base
  console.log("Chargement des employés depuis la table crewdayz.cd_employees...");
  const { data: employees, error: empError } = await supabase
    .from('cd_employees')
    .select('id, first_name, last_name');

  if (empError) {
    console.error("Erreur lors de la récupération des employés :", empError);
    process.exit(1);
  }

  console.log(`${employees?.length || 0} employés chargés depuis la base de données.`);

  // Construction d'une table de hachage des employés normalisée
  const employeeLookup = new Map<string, string>(); // Nom normalisé -> UUID
  for (const emp of employees || []) {
    const combinedName1 = normalizeName(`${emp.first_name} ${emp.last_name}`);
    const combinedName2 = normalizeName(`${emp.last_name} ${emp.first_name}`);
    employeeLookup.set(combinedName1, emp.id);
    employeeLookup.set(combinedName2, emp.id);
  }

  // 2. Lecture du fichier Excel
  console.log(`Lecture du fichier Excel : ${absolutePath}...`);
  const workbook = xlsx.readFile(absolutePath);
  const sheetNames = workbook.SheetNames;

  // Filtrer pour ne garder que les onglets correspondant aux 12 mois
  const monthSheets = sheetNames.filter(name => monthMap[name.toLowerCase()] !== undefined);
  console.log(`Onglets de mois détectés à importer (${monthSheets.length}) :`, monthSheets);

  if (monthSheets.length === 0) {
    console.error("Aucun onglet de mois valide trouvé dans l'Excel.");
    process.exit(1);
  }

  const recordsToInsert: any[] = [];

  // Traiter chaque onglet de mois
  for (const sheetName of monthSheets) {
    const monthNum = monthMap[sheetName.toLowerCase()];
    console.log(`\nTraitement de l'onglet : ${sheetName} (Mois : ${monthNum})...`);

    const worksheet = workbook.Sheets[sheetName];
    // Conversion en tableau 2D pour un accès positionnel direct et robuste
    const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    // A. Recherche de la ligne d'en-tête (qui contient la colonne "Noms")
    let headerRowIndex = -1;
    let nameColIndex = -1;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const colIdx = row.findIndex((cell: any) => {
        if (typeof cell !== 'string') return false;
        const norm = cell.trim().toLowerCase();
        return norm === 'noms' || norm === 'nom';
      });
      if (colIdx !== -1) {
        headerRowIndex = r;
        nameColIndex = colIdx;
        break;
      }
    }

    if (headerRowIndex === -1 || nameColIndex === -1) {
      console.warn(`Attention : Impossible de trouver la colonne 'Noms' dans l'onglet ${sheetName}. Feuille ignorée.`);
      continue;
    }

    const headerRow = rows[headerRowIndex];
    // B. Identification des colonnes des jours (valeurs numériques entre 1 et 31 après la colonne 'Noms')
    const dayColumns: { colIndex: number; dayNum: number }[] = [];
    for (let c = nameColIndex + 1; c < headerRow.length; c++) {
      const val = headerRow[c];
      if (val !== undefined && val !== null) {
        const num = parseInt(val.toString().trim(), 10);
        if (!isNaN(num) && num >= 1 && num <= 31) {
          dayColumns.push({ colIndex: c, dayNum: num });
        }
      }
    }

    console.log(`  Ligne en-tête trouvée à l'index : ${headerRowIndex}, Colonne 'Noms' à l'index : ${nameColIndex}`);
    console.log(`  Nombre de colonnes de jours identifiées : ${dayColumns.length}`);

    // C. Traitement des lignes d'employés
    let employeesProcessed = 0;
    let absencesProcessed = 0;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;

      const rawNameVal = row[nameColIndex];
      if (rawNameVal === undefined || rawNameVal === null) continue;

      const rawName = String(rawNameVal).trim();
      if (rawName === '') continue;

      // Ignorer les lignes de totaux, légendes ou récapitulatifs à la fin
      const lowerName = rawName.toLowerCase();
      if (lowerName.includes('solde') || lowerName.includes('total') || lowerName.includes('nb j') || lowerName.includes('legende') || lowerName.includes('légende')) {
        continue;
      }

      employeesProcessed++;

      // Correspondance avec l'UUID de l'employé
      const cleanedName = normalizeName(rawName);
      const employeeId = employeeLookup.get(cleanedName) || null;
      const importStatus = employeeId ? 'OK' : 'A_REVOIR';

      // Parcourir chaque jour pour extraire les absences
      for (const dayCol of dayColumns) {
        const cellValue = row[dayCol.colIndex];
        if (cellValue === undefined || cellValue === null || String(cellValue).trim() === '') {
          continue;
        }

        // Traduction de la valeur de la cellule en absence
        const strVal = String(cellValue).trim().replace(',', '.');
        const numVal = parseFloat(strVal);

        let period = 'full';
        let category = 'Autre';
        let comment: string | null = null;

        if (!isNaN(numVal)) {
          // Si c'est 0 (présence ou pas d'absence), on ignore
          if (numVal === 0) continue;

          if (numVal === 1) {
            period = 'full';
          } else if (numVal === 0.5) {
            period = 'morning'; // Par défaut pour un 0.5
          } else {
            period = 'full';
            comment = `Valeur Excel numérique inconnue : ${cellValue}`;
          }
        } else {
          // Gestion des cas particuliers (ex: '?')
          period = 'full';
          comment = `Valeur Excel non-numérique : ${cellValue}`;
        }

        // Construire la date
        const jsDate = new Date(year, monthNum - 1, dayCol.dayNum);
        if (jsDate.getFullYear() !== year || jsDate.getMonth() !== monthNum - 1 || jsDate.getDate() !== dayCol.dayNum) {
          continue;
        }

        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayCol.dayNum).padStart(2, '0')}`;

        recordsToInsert.push({
          employee_id: employeeId,
          date: dateStr,
          period: period,
          category: category,
          comment: comment,
          raw_name: rawName,
          import_status: importStatus
        });

        absencesProcessed++;
      }
    }

    console.log(`  -> ${employeesProcessed} lignes d'employés lues.`);
    console.log(`  -> ${absencesProcessed} absences extraites pour ce mois.`);
  }

  // 3. Insertion en base de données
  console.log(`\nInsertion en base de données... Nombre total de lignes d'absences à insérer : ${recordsToInsert.length}`);

  if (recordsToInsert.length === 0) {
    console.log("Aucune absence à insérer.");
    process.exit(0);
  }

  // Nettoyage de la table temporaire avant l'insertion
  console.log("Vidage préalable de la table crewdayz.cd_absences_import...");
  const { error: deleteError } = await supabase
    .from('cd_absences_import')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Astuce pour tout supprimer sans clause WHERE vide

  if (deleteError) {
    console.error("Erreur lors du vidage de la table temporaire :", deleteError.message);
    process.exit(1);
  }

  // Insertion par lots (batch) de 1000 lignes pour éviter de saturer la payload d'API Supabase
  const batchSize = 1000;
  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);
    console.log(`Insertion du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(recordsToInsert.length / batchSize)} (${batch.length} lignes)...`);
    
    const { error: insertError } = await supabase
      .from('cd_absences_import')
      .insert(batch);

    if (insertError) {
      console.error("Erreur lors de l'insertion du lot :", insertError.message);
      process.exit(1);
    }
  }

  console.log("\nImportation terminée avec succès !");
  console.log(`Au total : ${recordsToInsert.length} enregistrements insérés dans crewdayz.cd_absences_import.`);
}

main().catch(err => {
  console.error("Une erreur s'est produite lors de l'exécution du script :", err);
  process.exit(1);
});
