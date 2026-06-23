import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { isFrenchPublicHoliday } from '../src/utils/holidays';

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
   npx tsx scripts/process-import.ts <raw_name> --env-file .env.development
   npx tsx scripts/process-import.ts <raw_name> --env-file .env.production
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
} else {
  console.error(`Erreur : Le fichier d'environnement spécifié n'existe pas : ${targetEnvPath}`);
  process.exit(1);
}

// 2. Validation finale des identifiants
if (!supabaseUrl || !supabaseKey) {
  console.error(`Erreur : Identifiants Supabase manquants dans le fichier d'environnement.`);
  process.exit(1);
}

// Initialisation du client Supabase avec le schéma "crewdayz"
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'crewdayz'
  }
});

// Normaliser un nom pour la comparaison (identique à import-excel.ts)
function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^\d+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  // Récupérer le nom de l'employé brut (premier argument restant qui n'est pas --env-file ou sa valeur)
  const remainingArgs = process.argv.slice(2);
  const envFileIndex = remainingArgs.indexOf('--env-file');
  if (envFileIndex !== -1) {
    remainingArgs.splice(envFileIndex, 2);
  }
  const rawNameParam = remainingArgs[0];

  if (!rawNameParam) {
    console.error("Erreur : Vous devez spécifier le nom brut de l'employé à importer en paramètre (ex: '00Benoît BRIENS').");
    process.exit(1);
  }

  console.log(`\n=== Démarrage du traitement d'importation pour : "${rawNameParam}" ===`);

  // 1. Récupération des enregistrements de la table d'import
  const { data: importRecords, error: importError } = await supabase
    .from('cd_absences_import')
    .select('*')
    .eq('raw_name', rawNameParam);

  if (importError) {
    console.error("Erreur lors de la lecture de la table d'import :", importError.message);
    process.exit(1);
  }

  if (!importRecords || importRecords.length === 0) {
    console.log(`Aucun enregistrement d'absence trouvé dans cd_absences_import pour le raw_name : "${rawNameParam}".`);
    process.exit(0);
  }

  console.log(`Nombre d'enregistrements d'import trouvés : ${importRecords.length}`);

  // 2. Recherche et chargement de l'employé
  // Si le premier record a un employee_id, on l'utilise, sinon on cherche par le nom normalisé
  let employeeId = importRecords[0].employee_id;
  let employee: any = null;

  if (employeeId) {
    const { data: empData, error: empError } = await supabase
      .from('cd_employees')
      .select('id, first_name, last_name, arrival_date, departure_date')
      .eq('id', employeeId)
      .single();

    if (!empError && empData) {
      employee = empData;
    }
  }

  // Fallback si non trouvé par ID : recherche par nom normalisé
  if (!employee) {
    const { data: allEmployees, error: allEmpError } = await supabase
      .from('cd_employees')
      .select('id, first_name, last_name, arrival_date, departure_date');

    if (allEmpError) {
      console.error("Erreur lors du chargement des employés :", allEmpError.message);
      process.exit(1);
    }

    const targetNorm = normalizeName(rawNameParam);
    employee = allEmployees?.find(emp => {
      const norm1 = normalizeName(`${emp.first_name} ${emp.last_name}`);
      const norm2 = normalizeName(`${emp.last_name} ${emp.first_name}`);
      return norm1 === targetNorm || norm2 === targetNorm;
    });
  }

  if (!employee) {
    console.error(`Erreur : Le collaborateur correspondant à "${rawNameParam}" n'a pas été trouvé dans cd_employees.`);
    process.exit(1);
  }

  employeeId = employee.id;
  console.log(`Collaborateur identifié : ${employee.first_name} ${employee.last_name} (ID: ${employeeId})`);
  console.log(`  - Date d'arrivée : ${employee.arrival_date || 'Non renseignée'}`);
  console.log(`  - Date de départ : ${employee.departure_date || 'Non renseignée'}`);

  // 3. Charger les absences existantes réelles du collaborateur en base
  const { data: existingAbsences, error: existingError } = await supabase
    .from('cd_absences')
    .select('date, period')
    .eq('employee_id', employeeId);

  if (existingError) {
    console.error("Erreur lors du chargement des absences existantes :", existingError.message);
    process.exit(1);
  }

  // Ensemble des dates déjà renseignées
  const existingDates = new Set(existingAbsences?.map(abs => abs.date) || []);

  const recordsToInsert: any[] = [];
  let ignoredCount = 0;

  // 4. Parcourir chaque enregistrement d'import
  for (const record of importRecords) {
    const dateStr = record.date;
    const recordDate = new Date(dateStr);

    // Règle A : Vérification de doublon
    if (existingDates.has(dateStr)) {
      console.error(`date déjà renseignée : ${dateStr}`);
      ignoredCount++;
      continue;
    }

    // Règle B : Jour férié
    if (isFrenchPublicHoliday(recordDate)) {
      console.log(`date un jour férié ${dateStr} ignorée`);
      ignoredCount++;
      continue;
    }

    // Règle C : Date avant l'arrivée du collaborateur
    if (employee.arrival_date && dateStr < employee.arrival_date) {
      console.log(`date avant arrivée : ${dateStr} ignorée`);
      ignoredCount++;
      continue;
    }

    // Règle D : Date après le départ du collaborateur
    if (employee.departure_date && dateStr > employee.departure_date) {
      console.log(`date après départ : ${dateStr} ignorée`);
      ignoredCount++;
      continue;
    }

    // Si toutes les règles passent, on prépare l'absence pour l'insertion réelle
    recordsToInsert.push({
      employee_id: employeeId,
      date: dateStr,
      period: record.period,
      category: record.category || 'Autre',
      comment: record.comment
    });
  }

  // 5. Insertion dans cd_absences
  if (recordsToInsert.length === 0) {
    console.log(`\nAucune nouvelle absence à insérer (${ignoredCount} ignorées).`);
    process.exit(0);
  }

  console.log(`\nInsertion de ${recordsToInsert.length} absences dans la table cd_absences (et ${ignoredCount} ignorées)...`);
  
  const { error: insertError } = await supabase
    .from('cd_absences')
    .insert(recordsToInsert);

  if (insertError) {
    console.error("Erreur lors de l'insertion finale des absences :", insertError.message);
    process.exit(1);
  }

  console.log("Importation et validation des absences terminées avec succès !");
}

main().catch(err => {
  console.error("Une erreur s'est produite lors de l'exécution du script :", err);
  process.exit(1);
});
