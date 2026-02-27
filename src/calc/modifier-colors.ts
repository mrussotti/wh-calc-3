/** Color mapping for modifier levels — visual distinction by source scope */

export type ModifierColorLevel = 'army' | 'unit' | 'source' | 'weapon' | 'model';

interface ModifierColors {
  text: string;
  bg: string;
  border: string;
}

const colorMap: Record<ModifierColorLevel, ModifierColors> = {
  army: {
    text: 'var(--accent-green-l)',
    bg: 'var(--accent-green-d)',
    border: 'var(--accent-green)',
  },
  unit: {
    text: 'var(--accent-blue-l)',
    bg: 'rgba(74, 144, 217, 0.15)',
    border: 'var(--accent-blue)',
  },
  source: {
    text: 'var(--role-char)',
    bg: 'rgba(176, 124, 207, 0.15)',
    border: 'var(--role-char)',
  },
  weapon: {
    text: 'var(--accent-orange)',
    bg: 'rgba(217, 123, 42, 0.15)',
    border: 'var(--accent-orange)',
  },
  model: {
    text: 'var(--accent-gold)',
    bg: 'rgba(201, 168, 76, 0.2)',
    border: 'var(--accent-gold)',
  },
};

export function getModifierLevelColor(level: ModifierColorLevel): ModifierColors {
  return colorMap[level];
}
