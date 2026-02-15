/**
 * Downloads Wahapedia CSV data files and converts them to indexed JSON.
 * Run with: npm run fetch-data
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../src/data/generated');

const BASE_URL = 'https://wahapedia.ru/wh40k10ed';

const CSV_FILES = [
  'Factions',
  'Detachments',
  'Datasheets',
  'Datasheets_models',
  'Datasheets_wargear',
  'Datasheets_abilities',
  'Datasheets_keywords',
  'Datasheets_leader',
  'Enhancements',
  'Detachment_abilities',
  'Stratagems',
  'Abilities',
  'Last_update',
] as const;

function parsePipeCsv(raw: string): Record<string, string>[] {
  // Strip BOM
  const text = raw.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return [];

  // Parse header — remove trailing pipe
  const header = lines[0].replace(/\|$/, '').split('|');

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].replace(/\|$/, '').split('|');
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = fields[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

function normalizeName(name: string): string {
  return name
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")  // smart quotes → straight
    .replace(/[\u201C\u201D]/g, '"')                 // smart double quotes
    .trim()
    .toLowerCase();
}

async function fetchCsv(name: string): Promise<string> {
  const url = `${BASE_URL}/${name}.csv`;
  console.log(`  Fetching ${url}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return resp.text();
}

async function main() {
  console.log('Fetching Wahapedia data...\n');

  // Ensure output directory exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Fetch all CSVs in parallel
  const rawData: Record<string, string> = {};
  const results = await Promise.allSettled(
    CSV_FILES.map(async name => {
      rawData[name] = await fetchCsv(name);
    })
  );

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      console.error(`Failed to fetch ${CSV_FILES[i]}: ${(results[i] as PromiseRejectedResult).reason}`);
      process.exit(1);
    }
  }

  console.log('\nParsing CSVs...');

  // Parse each CSV
  const parsed: Record<string, Record<string, string>[]> = {};
  for (const name of CSV_FILES) {
    parsed[name] = parsePipeCsv(rawData[name]);
    console.log(`  ${name}: ${parsed[name].length} rows`);
  }

  console.log('\nBuilding indexes...');

  // === Factions: keyed by faction_id ===
  const factions: Record<string, Record<string, string>> = {};
  for (const row of parsed['Factions']) {
    factions[row['id']] = row;
  }

  // === Detachments: keyed by detachment_id ===
  const detachments: Record<string, Record<string, string>> = {};
  for (const row of parsed['Detachments']) {
    detachments[row['id']] = row;
  }

  // === Datasheets: keyed by datasheet_id ===
  const datasheets: Record<string, Record<string, string>> = {};
  for (const row of parsed['Datasheets']) {
    datasheets[row['id']] = row;
  }

  // === Models: grouped by datasheet_id ===
  const models: Record<string, Record<string, string>[]> = {};
  for (const row of parsed['Datasheets_models']) {
    const id = row['datasheet_id'];
    if (!models[id]) models[id] = [];
    models[id].push(row);
  }

  // === Wargear: grouped by datasheet_id ===
  const wargear: Record<string, Record<string, string>[]> = {};
  for (const row of parsed['Datasheets_wargear']) {
    const id = row['datasheet_id'];
    if (!wargear[id]) wargear[id] = [];
    wargear[id].push(row);
  }

  // === Abilities: grouped by datasheet_id ===
  const abilities: Record<string, Record<string, string>[]> = {};
  for (const row of parsed['Datasheets_abilities']) {
    const id = row['datasheet_id'];
    if (!abilities[id]) abilities[id] = [];
    abilities[id].push(row);
  }

  // === Keywords: grouped by datasheet_id ===
  const keywords: Record<string, Record<string, string>[]> = {};
  for (const row of parsed['Datasheets_keywords']) {
    const id = row['datasheet_id'];
    if (!keywords[id]) keywords[id] = [];
    keywords[id].push(row);
  }

  // === Leaders: leader_id → array of attached_id ===
  const leaders: Record<string, string[]> = {};
  for (const row of parsed['Datasheets_leader']) {
    const leaderId = row['leader_id'];
    if (!leaders[leaderId]) leaders[leaderId] = [];
    leaders[leaderId].push(row['attached_id']);
  }

  // === Enhancements: grouped by detachment_id ===
  const enhancements: Record<string, Record<string, string>[]> = {};
  for (const row of parsed['Enhancements']) {
    const id = row['detachment_id'];
    if (!enhancements[id]) enhancements[id] = [];
    enhancements[id].push(row);
  }

  // === Detachment Abilities: grouped by detachment_id ===
  const detachmentAbilities: Record<string, Record<string, string>[]> = {};
  for (const row of parsed['Detachment_abilities']) {
    const id = row['detachment_id'];
    if (!detachmentAbilities[id]) detachmentAbilities[id] = [];
    detachmentAbilities[id].push(row);
  }

  // === Stratagems: grouped by detachment_id ===
  const stratagems: Record<string, Record<string, string>[]> = {};
  for (const row of parsed['Stratagems']) {
    const id = row['detachment_id'];
    if (!stratagems[id]) stratagems[id] = [];
    stratagems[id].push(row);
  }

  // === Ability refs: keyed by ability_id ===
  const abilityRefs: Record<string, Record<string, string>> = {};
  for (const row of parsed['Abilities']) {
    abilityRefs[row['id']] = row;
  }

  // === Datasheet name index: faction_id → normalized_name → datasheet_id ===
  const datasheetIndex: Record<string, Record<string, string>> = {};
  for (const row of parsed['Datasheets']) {
    const factionId = row['faction_id'];
    if (!datasheetIndex[factionId]) datasheetIndex[factionId] = {};
    datasheetIndex[factionId][normalizeName(row['name'])] = row['id'];
  }

  // === Last update timestamp ===
  const lastUpdate = parsed['Last_update'][0]?.['last_update'] ?? 'unknown';

  // Build the final data object
  const data = {
    factions,
    detachments,
    datasheets,
    models,
    wargear,
    abilities,
    keywords,
    leaders,
    enhancements,
    detachmentAbilities,
    stratagems,
    abilityRefs,
    datasheetIndex,
    lastUpdate,
  };

  // Write as JSON
  const outPath = path.join(OUT_DIR, 'wahapedia.json');
  fs.writeFileSync(outPath, JSON.stringify(data));
  const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`\nWrote ${outPath} (${sizeKb} KB)`);
  console.log(`Last updated: ${lastUpdate}`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
