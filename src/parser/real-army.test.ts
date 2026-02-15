import { describe, it, expect, beforeAll } from 'vitest';
import { parseArmyList } from './army-list-parser.ts';
import { enrichArmyList } from '../matching/enrichment.ts';
import { loadWahapediaData } from '../data/index.ts';

// Exact army list from the user's Warhammer app export
const REAL_ARMY = `Tide of muscle  (2000 Points)
Orks
War Horde
Strike Force (2,000 Points)
CHARACTERS
Beastboss (95 Points)
 \u2022 1x Beast Snagga klaw
 \u2022 1x Beastchoppa
 \u2022 1x Shoota
 \u2022 Enhancements: Kunnin\u2019 but Brutal
Ghazghkull Thraka (235 Points)
 \u2022 1x Ghazghkull Thraka
    \u2022 Warlord
    \u25E6 1x Gork\u2019s Klaw
    \u25E6 1x Mork\u2019s Roar
 \u2022 1x Makari
    \u25E6 1x Makari\u2019s stabba
Warboss (75 Points)
 \u2022 1x Kombi-weapon
 \u2022 1x Power klaw
 \u2022 1x Twin sluggas
Warboss (75 Points)
 \u2022 1x Kombi-weapon
 \u2022 1x Power klaw
 \u2022 1x Twin sluggas
Zodgrod Wortsnagga (90 Points)
 \u2022 1x Da Grabzappa
 \u2022 1x Squigstoppa
BATTLELINE
Beast Snagga Boyz (95 Points)
 \u2022 9x Beast Snagga Boy
    \u25E6 9x Choppa
    \u25E6 9x Slugga
 \u2022 1x Beast Snagga Nob
    \u25E6 1x Power snappa
    \u25E6 1x Slugga
Boyz (80 Points)
 \u2022 9x Boy
    \u25E6 9x Choppa
    \u25E6 9x Slugga
 \u2022 1x Boss Nob
    \u25E6 1x Power klaw
    \u25E6 1x Slugga
Boyz (80 Points)
 \u2022 9x Boy
    \u25E6 9x Choppa
    \u25E6 9x Slugga
 \u2022 1x Boss Nob
    \u25E6 1x Power klaw
    \u25E6 1x Slugga
Boyz (80 Points)
 \u2022 9x Boy
    \u25E6 9x Choppa
    \u25E6 9x Slugga
 \u2022 1x Boss Nob
    \u25E6 1x Power klaw
    \u25E6 1x Slugga
DEDICATED TRANSPORTS
Trukk (70 Points)
 \u2022 1x Big shoota
 \u2022 1x Spiked wheels
Trukk (70 Points)
 \u2022 1x Big shoota
 \u2022 1x Spiked wheels
OTHER DATASHEETS
Battlewagon (160 Points)
 \u2022 1x Grabbin\u2019 klaw
 \u2022 1x Kannon
 \u2022 1x Lobba
 \u2022 1x Tracks and wheels
 \u2022 1x \u2018Ard Case
Battlewagon (160 Points)
 \u2022 1x Grabbin\u2019 klaw
 \u2022 1x Kannon
 \u2022 1x Lobba
 \u2022 1x Tracks and wheels
 \u2022 1x \u2018Ard Case
Flash Gitz (80 Points)
 \u2022 1x Kaptin
    \u25E6 1x Choppa
    \u25E6 1x Snazzgun
 \u2022 4x Flash Git
    \u25E6 4x Choppa
    \u25E6 4x Snazzgun
Flash Gitz (80 Points)
 \u2022 1x Kaptin
    \u25E6 1x Choppa
    \u25E6 1x Snazzgun
 \u2022 4x Flash Git
    \u25E6 4x Choppa
    \u25E6 4x Snazzgun
Gretchin (80 Points)
 \u2022 20x Gretchin
    \u25E6 20x Close combat weapon
    \u25E6 20x Grot blasta
 \u2022 2x Runtherd
    \u25E6 2x Runtherd tools
    \u25E6 2x Slugga
Gretchin (40 Points)
 \u2022 10x Gretchin
    \u25E6 10x Close combat weapon
    \u25E6 10x Grot blasta
 \u2022 1x Runtherd
    \u25E6 1x Runtherd tools
    \u25E6 1x Slugga
Kommandos (120 Points)
 \u2022 9x Kommando
    \u25E6 1x Breacha ram
    \u25E6 1x Burna
    \u25E6 4x Choppa
    \u25E6 4x Close combat weapon
    \u25E6 2x Kustom shoota
    \u25E6 1x Rokkit launcha
    \u25E6 4x Slugga
 \u2022 1x Boss Nob
    \u25E6 1x Power klaw
    \u25E6 1x Slugga
Nobz (105 Points)
 \u2022 1x Boss Nob
    \u25E6 1x Power klaw
    \u25E6 1x Slugga
 \u2022 4x Nob
    \u25E6 4x Power klaw
    \u25E6 4x Slugga
Stormboyz (65 Points)
 \u2022 4x Stormboy
    \u25E6 4x Choppa
    \u25E6 4x Slugga
 \u2022 1x Boss Nob
    \u25E6 1x Power klaw
    \u25E6 1x Slugga
Warbikers (65 Points)
 \u2022 2x Warbiker
    \u25E6 2x Choppa
    \u25E6 2x Close combat weapon
    \u25E6 2x Twin dakkagun
 \u2022 1x Boss Nob on Warbike
    \u25E6 1x Close combat weapon
    \u25E6 1x Power klaw
    \u25E6 1x Twin dakkagun
Exported with App Version: v1.46.2 (1), Data Version: v732`;

describe('real army list - Tide of muscle', () => {
  const parsed = parseArmyList(REAL_ARMY);

  it('parses header correctly', () => {
    expect(parsed.armyName).toBe('Tide of muscle');
    expect(parsed.totalPoints).toBe(2000);
    expect(parsed.faction).toBe('Orks');
    expect(parsed.detachment).toBe('War Horde');
    expect(parsed.gameSize).toBe('Strike Force (2,000 Points)');
  });

  it('parses all units', () => {
    const names = parsed.units.map(u => `${u.role}: ${u.name} (${u.points})`);
    console.log('Parsed units:', names);
    // 5 chars + 4 battleline + 2 transports + 10 other = 21
    expect(parsed.units.length).toBe(21);
  });

  it('assigns correct roles', () => {
    const chars = parsed.units.filter(u => u.role === 'characters');
    const battle = parsed.units.filter(u => u.role === 'battleline');
    const trans = parsed.units.filter(u => u.role === 'dedicated_transports');
    const other = parsed.units.filter(u => u.role === 'other');
    expect(chars).toHaveLength(5);
    expect(battle).toHaveLength(4);
    expect(trans).toHaveLength(2);
    expect(other).toHaveLength(10);
  });

  it('detects Ghazghkull as warlord', () => {
    const ghaz = parsed.units.find(u => u.name === 'Ghazghkull Thraka');
    expect(ghaz).toBeDefined();
    expect(ghaz!.isWarlord).toBe(true);
  });

  it('parses Beastboss enhancement', () => {
    const bb = parsed.units.find(u => u.name === 'Beastboss');
    expect(bb).toBeDefined();
    expect(bb!.enhancement).toContain('Kunnin');
  });

  it('parses Battlewagon flat weapon list including \u2018Ard Case', () => {
    const bws = parsed.units.filter(u => u.name === 'Battlewagon');
    expect(bws).toHaveLength(2);
    for (const bw of bws) {
      // In flat format, all items become weapons on implicit model
      const weaponNames = bw.models[0].weapons.map(w => w.name);
      expect(weaponNames).toContain('\u2018Ard Case');
    }
  });

  it('parses Beastboss as flat weapon list (no sub-model)', () => {
    const bb = parsed.units.find(u => u.name === 'Beastboss')!;
    console.log('Beastboss models:', JSON.stringify(bb.models, null, 2));
    // Beastboss has weapons listed directly as bullets (no model sub-grouping)
    // The parser should still capture the weapons
    const allWeapons = bb.models.flatMap(m => m.weapons);
    const weaponNames = [...allWeapons.map(w => w.name), ...bb.models.map(m => m.name)];
    console.log('Beastboss all items:', weaponNames);
  });

  it('parses Ghazghkull with 2 sub-models', () => {
    const ghaz = parsed.units.find(u => u.name === 'Ghazghkull Thraka')!;
    expect(ghaz.models.length).toBe(2);
    expect(ghaz.models[0].name).toBe('Ghazghkull Thraka');
    expect(ghaz.models[1].name).toBe('Makari');
    expect(ghaz.models[0].weapons.map(w => w.name)).toContain('Gork\u2019s Klaw');
    expect(ghaz.models[0].weapons.map(w => w.name)).toContain('Mork\u2019s Roar');
  });
});

describe('real army enrichment', () => {
  beforeAll(async () => {
    await loadWahapediaData();
  });

  it('enriches the full army list', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);

    console.log('Enriched army:', enriched.armyName);
    console.log('Faction:', enriched.factionId, enriched.factionName);
    console.log('Detachment:', enriched.detachment?.name);
    console.log('Faction ability:', enriched.factionAbility?.name);

    expect(enriched.factionId).toBe('ORK');
    expect(enriched.factionName).toBe('Orks');
    expect(enriched.detachment).not.toBeNull();
    expect(enriched.detachment!.name).toBe('War Horde');
    expect(enriched.factionAbility).not.toBeNull();
  });

  it('resolves Beastboss datasheet and stats', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);
    const bb = enriched.units.find(u => u.name === 'Beastboss');
    expect(bb).toBeDefined();
    expect(bb!.datasheetId).not.toBeNull();

    console.log('Beastboss stats:', bb!.modelStats);
    console.log('Beastboss weapons:', bb!.weapons.map(w => `${w.name} (${w.A} ${w.S} ${w.AP} ${w.D})`));
    console.log('Beastboss warnings:', bb!.matchWarnings);
  });

  it('resolves Ghazghkull weapons (Gork\u2019s Klaw profiles)', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);
    const ghaz = enriched.units.find(u => u.name === 'Ghazghkull Thraka');
    expect(ghaz).toBeDefined();
    expect(ghaz!.datasheetId).not.toBeNull();

    const klaw = ghaz!.weapons.filter(w => w.name.includes('Klaw'));
    console.log('Gork\u2019s Klaw profiles:', klaw.map(w => `${w.profileName}: A=${w.A} S=${w.S} AP=${w.AP} D=${w.D}`));
    // Should have 2 profiles: strike + sweep
    expect(klaw.length).toBeGreaterThanOrEqual(2);
  });

  it('matches Kunnin\u2019 but Brutal enhancement', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);
    const bb = enriched.units.find(u => u.name === 'Beastboss');
    expect(bb!.enhancement).not.toBeNull();
    console.log('Enhancement:', bb!.enhancement);
    expect(bb!.enhancement!.description.length).toBeGreaterThan(0);
  });

  it('resolves transport capacity for Trukks and Battlewagons', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);

    const trukks = enriched.units.filter(u => u.name === 'Trukk');
    expect(trukks).toHaveLength(2);
    for (const t of trukks) {
      expect(t.transportCapacity).not.toBeNull();
      console.log(`${t.displayName} capacity:`, t.transportCapacity?.baseCapacity);
    }

    const bws = enriched.units.filter(u => u.name === 'Battlewagon');
    expect(bws).toHaveLength(2);
    for (const bw of bws) {
      console.log(`${bw.displayName} capacity:`, bw.transportCapacity?.baseCapacity);
      console.log(`${bw.displayName} equipment:`, bw.equipment);
    }
  });

  it('moves unmatched weapons to equipment (\u2018Ard Case)', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);
    const bws = enriched.units.filter(u => u.name === 'Battlewagon');
    expect(bws).toHaveLength(2);
    for (const bw of bws) {
      expect(bw.equipment).toContain('\u2018Ard Case');
      // 'Ard Case should NOT be in the weapons list
      expect(bw.weapons.every(w => !w.name.includes('Ard Case'))).toBe(true);
    }
  });

  it('logs all match warnings', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);
    const allWarnings = enriched.units.flatMap(u =>
      u.matchWarnings.map(w => `${u.displayName}: ${w}`)
    );
    console.log('All match warnings:', allWarnings);
  });

  it('builds correct modelCountByProfile for Boyz and Ghazghkull', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);

    // Boyz: should have BOY=9, BOSS NOB=1 (10 total)
    const boyz = enriched.units.find(u => u.name === 'Boyz');
    expect(boyz).toBeDefined();
    expect(boyz!.modelCount).toBe(10);
    expect(boyz!.modelCountByProfile['boy']).toBe(9);
    expect(boyz!.modelCountByProfile['boss nob']).toBe(1);

    // Ghazghkull: should have GHAZGHKULL THRAKA=1, MAKARI=1 (2 total)
    const ghaz = enriched.units.find(u => u.name === 'Ghazghkull Thraka');
    expect(ghaz).toBeDefined();
    expect(ghaz!.modelCount).toBe(2);
    expect(ghaz!.modelCountByProfile['ghazghkull thraka']).toBe(1);
    expect(ghaz!.modelCountByProfile['makari']).toBe(1);
  });

  it('assigns duplicate display names', () => {
    const parsed = parseArmyList(REAL_ARMY);
    const enriched = enrichArmyList(parsed);
    const boyz = enriched.units.filter(u => u.name === 'Boyz');
    expect(boyz).toHaveLength(3);
    expect(boyz[0].displayName).toBe('Boyz #1');
    expect(boyz[1].displayName).toBe('Boyz #2');
    expect(boyz[2].displayName).toBe('Boyz #3');
  });
});
