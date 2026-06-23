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
    console.error(`Erreur: Le fichier Excel n'existe pas au chemin : ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Lecture du fichier Excel : ${absolutePath}...`);
  
  // Lecture du classeur Excel
  const workbook = xlsx.readFile(absolutePath);
  const sheetNames = workbook.SheetNames;
  
  console.log('Feuilles trouvées dans le classeur :', sheetNames);

  if (sheetNames.length === 0) {
    console.error("Aucune feuille de calcul n'a été trouvée.");
    process.exit(1);
  }

  // Lecture de la première feuille de calcul
  const firstSheetName = sheetNames[0];
  console.log(`Lecture de la feuille : "${firstSheetName}"`);
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Conversion en format JSON pour inspection
  const rawData: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: null });
  
  console.log(`Nombre total de lignes lues : ${rawData.length}`);
  console.log('Aperçu des 5 premières lignes :');
  console.dir(rawData.slice(0, 5), { depth: null, colors: true });

  console.log('\nPrêt pour les prochaines étapes (insertion, mapping, etc.).');
}

main().catch(err => {
  console.error("Une erreur s'est produite lors de l'exécution du script :", err);
  process.exit(1);
});
