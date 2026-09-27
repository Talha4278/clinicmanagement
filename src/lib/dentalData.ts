import { ToothFinding, ToothSurface } from './types';

export interface ToothInfo {
  number: number;
  name: string;
  shortName: string;
  quadrant: 'Upper Right' | 'Upper Left' | 'Lower Left' | 'Lower Right';
  arch: 'Upper' | 'Lower';
  side: 'Right' | 'Left';
  type: 'Incisor' | 'Canine' | 'Premolar' | 'Molar';
  isChild?: boolean;
}

export const ADULT_TEETH_UPPER_RIGHT: ToothInfo[] = [
  { number: 18, name: 'Upper Right Third Molar (Wisdom)', shortName: 'UR 3rd Molar', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Molar' },
  { number: 17, name: 'Upper Right Second Molar', shortName: 'UR 2nd Molar', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Molar' },
  { number: 16, name: 'Upper Right First Molar', shortName: 'UR 1st Molar', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Molar' },
  { number: 15, name: 'Upper Right Second Premolar', shortName: 'UR 2nd Premolar', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Premolar' },
  { number: 14, name: 'Upper Right First Premolar', shortName: 'UR 1st Premolar', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Premolar' },
  { number: 13, name: 'Upper Right Canine (Cuspid)', shortName: 'UR Canine', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Canine' },
  { number: 12, name: 'Upper Right Lateral Incisor', shortName: 'UR Lat Incisor', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Incisor' },
  { number: 11, name: 'Upper Right Central Incisor', shortName: 'UR Cent Incisor', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Incisor' },
];

export const ADULT_TEETH_UPPER_LEFT: ToothInfo[] = [
  { number: 21, name: 'Upper Left Central Incisor', shortName: 'UL Cent Incisor', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Incisor' },
  { number: 22, name: 'Upper Left Lateral Incisor', shortName: 'UL Lat Incisor', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Incisor' },
  { number: 23, name: 'Upper Left Canine (Cuspid)', shortName: 'UL Canine', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Canine' },
  { number: 24, name: 'Upper Left First Premolar', shortName: 'UL 1st Premolar', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Premolar' },
  { number: 25, name: 'Upper Left Second Premolar', shortName: 'UL 2nd Premolar', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Premolar' },
  { number: 26, name: 'Upper Left First Molar', shortName: 'UL 1st Molar', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Molar' },
  { number: 27, name: 'Upper Left Second Molar', shortName: 'UL 2nd Molar', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Molar' },
  { number: 28, name: 'Upper Left Third Molar (Wisdom)', shortName: 'UL 3rd Molar', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Molar' },
];

export const ADULT_TEETH_LOWER_RIGHT: ToothInfo[] = [
  { number: 48, name: 'Lower Right Third Molar (Wisdom)', shortName: 'LR 3rd Molar', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Molar' },
  { number: 47, name: 'Lower Right Second Molar', shortName: 'LR 2nd Molar', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Molar' },
  { number: 46, name: 'Lower Right First Molar', shortName: 'LR 1st Molar', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Molar' },
  { number: 45, name: 'Lower Right Second Premolar', shortName: 'LR 2nd Premolar', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Premolar' },
  { number: 44, name: 'Lower Right First Premolar', shortName: 'LR 1st Premolar', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Premolar' },
  { number: 43, name: 'Lower Right Canine (Cuspid)', shortName: 'LR Canine', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Canine' },
  { number: 42, name: 'Lower Right Lateral Incisor', shortName: 'LR Lat Incisor', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Incisor' },
  { number: 41, name: 'Lower Right Central Incisor', shortName: 'LR Cent Incisor', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Incisor' },
];

export const ADULT_TEETH_LOWER_LEFT: ToothInfo[] = [
  { number: 31, name: 'Lower Left Central Incisor', shortName: 'LL Cent Incisor', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Incisor' },
  { number: 32, name: 'Lower Left Lateral Incisor', shortName: 'LL Lat Incisor', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Incisor' },
  { number: 33, name: 'Lower Left Canine (Cuspid)', shortName: 'LL Canine', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Canine' },
  { number: 34, name: 'Lower Left First Premolar', shortName: 'LL 1st Premolar', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Premolar' },
  { number: 35, name: 'Lower Left Second Premolar', shortName: 'LL 2nd Premolar', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Premolar' },
  { number: 36, name: 'Lower Left First Molar', shortName: 'LL 1st Molar', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Molar' },
  { number: 37, name: 'Lower Left Second Molar', shortName: 'LL 2nd Molar', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Molar' },
  { number: 38, name: 'Lower Left Third Molar (Wisdom)', shortName: 'LL 3rd Molar', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Molar' },
];

// ─── CHILD / PRIMARY TEETH (20 TEETH) ────────────────────────────────
export const CHILD_TEETH_UPPER_RIGHT: ToothInfo[] = [
  { number: 55, name: 'Primary Upper Right Second Molar', shortName: 'PUR 2nd Molar', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Molar', isChild: true },
  { number: 54, name: 'Primary Upper Right First Molar', shortName: 'PUR 1st Molar', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Molar', isChild: true },
  { number: 53, name: 'Primary Upper Right Canine', shortName: 'PUR Canine', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Canine', isChild: true },
  { number: 52, name: 'Primary Upper Right Lateral Incisor', shortName: 'PUR Lat Incisor', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Incisor', isChild: true },
  { number: 51, name: 'Primary Upper Right Central Incisor', shortName: 'PUR Cent Incisor', quadrant: 'Upper Right', arch: 'Upper', side: 'Right', type: 'Incisor', isChild: true },
];

export const CHILD_TEETH_UPPER_LEFT: ToothInfo[] = [
  { number: 61, name: 'Primary Upper Left Central Incisor', shortName: 'PUL Cent Incisor', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Incisor', isChild: true },
  { number: 62, name: 'Primary Upper Left Lateral Incisor', shortName: 'PUL Lat Incisor', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Incisor', isChild: true },
  { number: 63, name: 'Primary Upper Left Canine', shortName: 'PUL Canine', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Canine', isChild: true },
  { number: 64, name: 'Primary Upper Left First Molar', shortName: 'PUL 1st Molar', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Molar', isChild: true },
  { number: 65, name: 'Primary Upper Left Second Molar', shortName: 'PUL 2nd Molar', quadrant: 'Upper Left', arch: 'Upper', side: 'Left', type: 'Molar', isChild: true },
];

export const CHILD_TEETH_LOWER_RIGHT: ToothInfo[] = [
  { number: 85, name: 'Primary Lower Right Second Molar', shortName: 'PLR 2nd Molar', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Molar', isChild: true },
  { number: 84, name: 'Primary Lower Right First Molar', shortName: 'PLR 1st Molar', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Molar', isChild: true },
  { number: 83, name: 'Primary Lower Right Canine', shortName: 'PLR Canine', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Canine', isChild: true },
  { number: 82, name: 'Primary Lower Right Lateral Incisor', shortName: 'PLR Lat Incisor', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Incisor', isChild: true },
  { number: 81, name: 'Primary Lower Right Central Incisor', shortName: 'PLR Cent Incisor', quadrant: 'Lower Right', arch: 'Lower', side: 'Right', type: 'Incisor', isChild: true },
];

export const CHILD_TEETH_LOWER_LEFT: ToothInfo[] = [
  { number: 71, name: 'Primary Lower Left Central Incisor', shortName: 'PLL Cent Incisor', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Incisor', isChild: true },
  { number: 72, name: 'Primary Lower Left Lateral Incisor', shortName: 'PLL Lat Incisor', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Incisor', isChild: true },
  { number: 73, name: 'Primary Lower Left Canine', shortName: 'PLL Canine', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Canine', isChild: true },
  { number: 74, name: 'Primary Lower Left First Molar', shortName: 'PLL 1st Molar', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Molar', isChild: true },
  { number: 75, name: 'Primary Lower Left Second Molar', shortName: 'PLL 2nd Molar', quadrant: 'Lower Left', arch: 'Lower', side: 'Left', type: 'Molar', isChild: true },
];

export const ALL_TEETH_MAP: Record<number, ToothInfo> = {};
[
  ...ADULT_TEETH_UPPER_RIGHT,
  ...ADULT_TEETH_UPPER_LEFT,
  ...ADULT_TEETH_LOWER_RIGHT,
  ...ADULT_TEETH_LOWER_LEFT,
  ...CHILD_TEETH_UPPER_RIGHT,
  ...CHILD_TEETH_UPPER_LEFT,
  ...CHILD_TEETH_LOWER_RIGHT,
  ...CHILD_TEETH_LOWER_LEFT,
].forEach((t) => {
  ALL_TEETH_MAP[t.number] = t;
});

export function getToothInfo(num: number): ToothInfo {
  return ALL_TEETH_MAP[num] || {
    number: num,
    name: `Tooth #${num}`,
    shortName: `#${num}`,
    quadrant: 'Upper Right',
    arch: 'Upper',
    side: 'Right',
    type: 'Molar',
  };
}

export interface FindingConfig {
  label: string;
  code: ToothFinding;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  badgeClass: string;
}

export const FINDINGS_CONFIG: Record<ToothFinding, FindingConfig> = {
  sound: {
    label: 'Sound / Healthy',
    code: 'sound',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: 'Normal anatomical tooth structure with no defects',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  caries: {
    label: 'Caries / Cavity',
    code: 'caries',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    description: 'Active tooth decay or demineralization requiring restoration',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  filling: {
    label: 'Filling / Restoration',
    code: 'filling',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    description: 'Composite, amalgam or GIC restoration present',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  rct: {
    label: 'Root Canal (RCT)',
    code: 'rct',
    color: '#9333ea',
    bgColor: '#faf5ff',
    borderColor: '#e9d5ff',
    description: 'Endodontically treated root canals with obturation',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  crown: {
    label: 'Crown / Cap',
    code: 'crown',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'Prosthetic full coverage crown or bridge abutment',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  extraction: {
    label: 'Indicated Extraction',
    code: 'extraction',
    color: '#be123c',
    bgColor: '#fff1f2',
    borderColor: '#fecdd3',
    description: 'Non-restorable tooth requiring surgical or simple extraction',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  implant: {
    label: 'Dental Implant',
    code: 'implant',
    color: '#0891b2',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    description: 'Osseointegrated endosteal titanium dental fixture',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  missing: {
    label: 'Missing Tooth',
    code: 'missing',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    description: 'Congenitally absent or previously extracted tooth',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
  },
};

export const TOOTH_SURFACES: { code: ToothSurface; label: string; full: string }[] = [
  { code: 'O', label: 'O', full: 'Occlusal / Incisal' },
  { code: 'M', label: 'M', full: 'Mesial' },
  { code: 'D', label: 'D', full: 'Distal' },
  { code: 'B', label: 'B', full: 'Buccal / Facial' },
  { code: 'L', label: 'L', full: 'Lingual / Palatal' },
];
