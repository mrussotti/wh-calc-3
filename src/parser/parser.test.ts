import { describe, it, expect } from 'vitest';
import { parseArmyList } from './army-list-parser.ts';

const SAMPLE_ORKS_ARMY = `Da Green Tide (2000 Points)
Orks
War Horde
Strike Force (2000 Points)

CHARACTERS

Beastboss (80 Points)
\u2022 1x Beastchoppa
  \u25E6 1x Beastchoppa
  \u25E6 1x Slugga

Big Mek with Shokk Attack Gun (70 Points)
\u2022 1x Big Mek with Shokk Attack Gun
  \u25E6 1x Close combat weapon
  \u25E6 1x Shokk attack gun

Ghazghkull Thraka (235 Points)
\u2022 Warlord
\u2022 1x Ghazghkull Thraka
  \u25E6 1x Gork\u2019s Klaw
  \u25E6 1x Mork\u2019s Roar
\u2022 1x Makari
  \u25E6 1x Makari\u2019s Stabba

Painboy (70 Points)
\u2022 1x Painboy
  \u25E6 1x \u2018Urty Syringe
  \u25E6 1x Power Klaw

Warboss (65 Points)
\u2022 Enhancements: Kunnin\u2019 but Brutal
\u2022 1x Warboss
  \u25E6 1x Attack Squig
  \u25E6 1x Kombi-weapon
  \u25E6 1x Power Klaw

Warboss in Mega Armour (95 Points)
\u2022 1x Warboss in Mega Armour
  \u25E6 1x \u2018Uge Choppa
  \u25E6 1x Kombi-weapon

Weirdboy (55 Points)
\u2022 1x Weirdboy
  \u25E6 1x Close combat weapon
  \u25E6 1x Smite

BATTLELINE

Boyz (75 Points)
\u2022 1x Boss Nob
  \u25E6 1x Choppa
  \u25E6 1x Slugga
\u2022 9x Boy
  \u25E6 9x Choppa
  \u25E6 9x Slugga

Boyz (75 Points)
\u2022 1x Boss Nob
  \u25E6 1x Choppa
  \u25E6 1x Slugga
\u2022 9x Boy
  \u25E6 9x Choppa
  \u25E6 9x Slugga

Boyz (75 Points)
\u2022 1x Boss Nob
  \u25E6 1x Choppa
  \u25E6 1x Slugga
\u2022 9x Boy
  \u25E6 9x Choppa
  \u25E6 9x Slugga

Gretchin (40 Points)
\u2022 10x Gretchin
  \u25E6 10x Close combat weapon
  \u25E6 10x Grot Blasta

DEDICATED TRANSPORTS

Battlewagon (165 Points)
\u2022 1x Battlewagon
  \u25E6 1x Deff Rolla
  \u25E6 1x Kannon
\u2022 1x \u2018Ard Case

Trukk (55 Points)
\u2022 1x Trukk
  \u25E6 1x Big Shoota
  \u25E6 1x Spiked Ram

Trukk (55 Points)
\u2022 1x Trukk
  \u25E6 1x Big Shoota
  \u25E6 1x Spiked Ram

OTHER DATASHEETS

Deff Dread (150 Points)
\u2022 1x Deff Dread
  \u25E6 2x Dread Klaw
  \u25E6 2x Big Shoota

Flash Gitz (90 Points)
\u2022 1x Kaptin
  \u25E6 1x Git-findaz
  \u25E6 1x Close combat weapon
\u2022 4x Flash Git
  \u25E6 4x Snazzgun
  \u25E6 4x Close combat weapon

Lootas (55 Points)
\u2022 1x Spanner
  \u25E6 1x Big Shoota
  \u25E6 1x Close combat weapon
\u2022 4x Loota
  \u25E6 4x Deffgun
  \u25E6 4x Close combat weapon

Meganobz (180 Points)
\u2022 2x Meganob with Kombi-weapon and Power Klaw
  \u25E6 2x Kombi-weapon
  \u25E6 2x Power Klaw
\u2022 1x Meganob with 2 Kill Sawz
  \u25E6 2x Kill Saw

Nob with Waaagh! Banner (70 Points)
\u2022 1x Nob with Waaagh! Banner
  \u25E6 1x Kustom Shoota
  \u25E6 1x Waaagh! Banner

Stormboyz (65 Points)
\u2022 1x Boss Nob
  \u25E6 1x Choppa
  \u25E6 1x Slugga
\u2022 4x Stormboy
  \u25E6 4x Choppa
  \u25E6 4x Slugga

Exported with App Version: v1.24.0 (52), Data Version: v420`;

describe('parseArmyList', () => {
  const result = parseArmyList(SAMPLE_ORKS_ARMY);

  it('parses army header correctly', () => {
    expect(result.armyName).toBe('Da Green Tide');
    expect(result.totalPoints).toBe(2000);
    expect(result.faction).toBe('Orks');
    expect(result.detachment).toBe('War Horde');
    expect(result.gameSize).toBe('Strike Force (2000 Points)');
  });

  it('parses all 20 units', () => {
    expect(result.units).toHaveLength(20);
  });

  it('assigns correct roles', () => {
    const roles = result.units.map(u => u.role);
    const chars = roles.filter(r => r === 'characters');
    const battle = roles.filter(r => r === 'battleline');
    const trans = roles.filter(r => r === 'dedicated_transports');
    const other = roles.filter(r => r === 'other');
    expect(chars).toHaveLength(7);
    expect(battle).toHaveLength(4);
    expect(trans).toHaveLength(3);
    expect(other).toHaveLength(6);
  });

  it('parses Ghazghkull with warlord designation', () => {
    const ghaz = result.units.find(u => u.name === 'Ghazghkull Thraka');
    expect(ghaz).toBeDefined();
    expect(ghaz!.isWarlord).toBe(true);
    expect(ghaz!.points).toBe(235);
    expect(ghaz!.models).toHaveLength(2);
    expect(ghaz!.models[0].name).toBe('Ghazghkull Thraka');
    expect(ghaz!.models[1].name).toBe('Makari');
  });

  it('parses Ghazghkull weapons with smart quotes', () => {
    const ghaz = result.units.find(u => u.name === 'Ghazghkull Thraka')!;
    const ghazModel = ghaz.models[0];
    expect(ghazModel.weapons).toHaveLength(2);
    expect(ghazModel.weapons[0].name).toBe('Gork\u2019s Klaw');
    expect(ghazModel.weapons[1].name).toBe('Mork\u2019s Roar');
  });

  it('parses Warboss with enhancement', () => {
    const warboss = result.units.find(u => u.name === 'Warboss');
    expect(warboss).toBeDefined();
    expect(warboss!.enhancement).toBe('Kunnin\u2019 but Brutal');
    expect(warboss!.points).toBe(65);
  });

  it('parses Boyz with multiple model types', () => {
    const boyz = result.units.filter(u => u.name === 'Boyz');
    expect(boyz).toHaveLength(3);
    const first = boyz[0];
    expect(first.models).toHaveLength(2);
    expect(first.models[0].name).toBe('Boss Nob');
    expect(first.models[0].count).toBe(1);
    expect(first.models[1].name).toBe('Boy');
    expect(first.models[1].count).toBe(9);
  });

  it('parses Meganobz with different model loadouts', () => {
    const meganobz = result.units.find(u => u.name === 'Meganobz');
    expect(meganobz).toBeDefined();
    expect(meganobz!.models).toHaveLength(2);
    expect(meganobz!.models[0].name).toBe('Meganob with Kombi-weapon and Power Klaw');
    expect(meganobz!.models[0].count).toBe(2);
    expect(meganobz!.models[1].name).toBe('Meganob with 2 Kill Sawz');
    expect(meganobz!.models[1].count).toBe(1);
  });

  it('detects Battlewagon equipment', () => {
    const bw = result.units.find(u => u.name === 'Battlewagon');
    expect(bw).toBeDefined();
    expect(bw!.equipment).toContain('\u2018Ard Case');
  });

  it('parses transport units', () => {
    const trukks = result.units.filter(u => u.name === 'Trukk');
    expect(trukks).toHaveLength(2);
    expect(trukks[0].role).toBe('dedicated_transports');
  });

  it('assigns unique IDs to each unit', () => {
    const ids = result.units.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('parses Gretchin correctly', () => {
    const gretchin = result.units.find(u => u.name === 'Gretchin');
    expect(gretchin).toBeDefined();
    expect(gretchin!.models).toHaveLength(1);
    expect(gretchin!.models[0].name).toBe('Gretchin');
    expect(gretchin!.models[0].count).toBe(10);
    expect(gretchin!.models[0].weapons).toHaveLength(2);
  });

  it('ignores footer line', () => {
    // The footer "Exported with App Version..." should not create a unit
    const allNames = result.units.map(u => u.name);
    expect(allNames.every(n => !n.includes('Exported'))).toBe(true);
  });
});
