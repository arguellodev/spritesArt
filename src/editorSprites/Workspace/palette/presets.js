// presets.js — paletas predefinidas de la escena pixel-art.
// Cada paleta es un array de hex RGB ('#RRGGBB'). Se usan tal cual en el panel
// y se convierten a {r,g,b,a} cuando el usuario las selecciona.
//
// Fuentes de las paletas (todas de autores con uso público conocido):
//  - DB16: DawnBringer, 2005 (pixelartists estándar).
//  - PICO-8: Lexaloffle, consola de fantasía.
//  - Game Boy: Nintendo Game Boy original.
//  - Sweetie 16: GrafxKid.
//  - AAP-64: Adigun Polack.
//  - Endesga-32 / Endesga-64: Endesga.
//  - NES: Nintendo NES subset (común en editores).
//  - Resurrect-64: Kerrie Lake.

export const PALETTE_CATEGORIES = [
  { id: 'classic',  name: 'Clasicas',         hint: 'Estandares historicos del pixel-art' },
  { id: 'console',  name: 'Consolas Retro',   hint: 'Hardware real (NES, Game Boy)' },
  { id: 'fantasy',  name: 'Consolas Fantasy', hint: 'Consolas de fantasía y motores indie' },
  { id: 'modern',   name: 'Modernas',         hint: 'Paletas curadas por artistas contemporáneos' },
];

export const PALETTE_PRESETS = [
  {
    id: 'db16',
    name: 'DB16 (DawnBringer 16)',
    author: 'DawnBringer',
    category: 'classic',
    year: 2005,
    colors: [
      '#140c1c', '#442434', '#30346d', '#4e4a4e',
      '#854c30', '#346524', '#d04648', '#757161',
      '#597dce', '#d27d2c', '#8595a1', '#6daa2c',
      '#d2aa99', '#6dc2ca', '#dad45e', '#deeed6',
    ],
  },
  {
    id: 'pico8',
    name: 'PICO-8',
    author: 'Lexaloffle',
    category: 'fantasy',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
    ],
  },
  {
    id: 'gameboy',
    name: 'Game Boy DMG',
    author: 'Nintendo',
    category: 'console',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  {
    id: 'gameboy-pocket',
    name: 'Game Boy Pocket',
    author: 'Nintendo',
    category: 'console',
    colors: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
  },
  {
    id: 'sweetie16',
    name: 'Sweetie 16',
    author: 'GrafxKid',
    category: 'modern',
    colors: [
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
      '#ffcd75', '#a7f070', '#38b764', '#257179',
      '#29366f', '#3b5dc9', '#41a6f6', '#73eff7',
      '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
    ],
  },
  {
    id: 'aap64',
    name: 'AAP-64',
    author: 'Adigun Polack',
    category: 'modern',
    colors: [
      '#060608', '#141013', '#3b1725', '#73172d', '#b4202a', '#df3e23', '#fa6a0a', '#f9a31b',
      '#ffd541', '#fffc40', '#d6f264', '#9cdb43', '#59c135', '#14a02e', '#1a7a3e', '#24523b',
      '#122020', '#143464', '#285cc4', '#249fde', '#20d6c7', '#a6fcdb', '#ffffff', '#fef3c0',
      '#fad6b8', '#f5a097', '#e86a73', '#bc4a9b', '#793a80', '#403353', '#242234', '#221c1a',
      '#322b28', '#71413b', '#bb7547', '#dba463', '#f4d29c', '#dae0ea', '#b3b9d1', '#8b93af',
      '#6d758d', '#4a5462', '#333941', '#422433', '#5b3138', '#8e5252', '#ba756a', '#e9b5a3',
      '#e3e6ff', '#b9bffb', '#849be4', '#588dbe', '#477d85', '#23674e', '#328464', '#5daf8d',
      '#92dcba', '#cdf7e2', '#e4d2aa', '#c7b08b', '#a08662', '#796755', '#5a4e44', '#423934',
    ],
  },
  {
    id: 'endesga32',
    name: 'Endesga 32',
    author: 'Endesga',
    category: 'modern',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569',
    ],
  },
  {
    id: 'endesga64',
    name: 'Endesga 64',
    author: 'Endesga',
    category: 'modern',
    colors: [
      '#ff0040', '#131313', '#1b1b1b', '#272727', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4',
      '#ffffff', '#c7cfdd', '#92a1b9', '#657392', '#424c6e', '#2a2f4e', '#1a1932', '#0e071b',
      '#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f', '#f9e6cf',
      '#edab50', '#e07438', '#c64524', '#8e251d', '#ff5000', '#ed7614', '#ffa214', '#ffc825',
      '#ffeb57', '#d3fc7e', '#99e65f', '#5ac54f', '#33984b', '#1e6f50', '#134c4c', '#0c2e44',
      '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#0cf1ff', '#94fdff', '#fdd2ed', '#f389f5',
      '#db3ffd', '#7a09fa', '#3003d9', '#0c0293', '#03193f', '#3b1443', '#622461', '#93388f',
      '#ca52c9', '#c85086', '#f68187', '#f5555d', '#ea323c', '#c42430', '#891e2b', '#571c27',
    ],
  },
  {
    id: 'nes',
    name: 'NES (52 colores)',
    author: 'Nintendo',
    category: 'console',
    colors: [
      '#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400',
      '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#BCBCBC', '#0078F8',
      '#0058F8', '#6844FC', '#D800CC', '#E40058', '#F83800', '#E45C10', '#AC7C00', '#00B800',
      '#00A800', '#00A844', '#008888', '#000000', '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8',
      '#F878F8', '#F85898', '#F87858', '#FCA044', '#F8B800', '#B8F818', '#58D854', '#58F898',
      '#00E8D8', '#787878', '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8', '#F8B8F8', '#F8A4C0',
      '#F0D0B0', '#FCE0A8', '#F8D878', '#D8F878',
    ],
  },
  {
    id: 'resurrect64',
    name: 'Resurrect 64',
    author: 'Kerrie Lake',
    category: 'modern',
    colors: [
      '#2e222f', '#3e3546', '#625565', '#966c6c', '#ab947a', '#694f62', '#7f708a', '#9babb2',
      '#c7dcd0', '#ffffff', '#6e2727', '#b33831', '#ea4f36', '#f57d4a', '#ae2334', '#e83b3b',
      '#fb6b1d', '#f79617', '#f9c22b', '#7a3045', '#9e4539', '#cd683d', '#e6904e', '#fbb954',
      '#4c3e24', '#676633', '#a2a947', '#d5e04b', '#fbff86', '#165a4c', '#239063', '#1ebc73',
      '#91db69', '#cddf6c', '#313638', '#374e4a', '#547e64', '#92a984', '#b2ba90', '#0b5e65',
      '#0b8a8f', '#0eaf9b', '#30e1b9', '#8ff8e2', '#323353', '#484a77', '#4d65b4', '#4d9be6',
      '#8fd3ff', '#45293f', '#6b3e75', '#905ea9', '#a884f3', '#eaaded', '#753c54', '#a24b6f',
      '#cf657f', '#ed8099', '#831c5d', '#c32454', '#f04f78', '#f68181', '#fca790', '#fdcbb0',
    ],
  },
];

// Utilidades de conversión entre formatos.
// El editor usa {r, g, b, a}; los presets guardan '#RRGGBB'.
export function hexToRgba(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b, a: 255 };
}

export function rgbaToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getPresetById(id) {
  return PALETTE_PRESETS.find((p) => p.id === id) || null;
}

// Devuelve los presets agrupados por categoría preservando el orden de
// PALETTE_CATEGORIES. Presets con `category` desconocida se agrupan en 'misc'.
export function groupPresetsByCategory(presets = PALETTE_PRESETS) {
  const groups = new Map(PALETTE_CATEGORIES.map((c) => [c.id, { ...c, presets: [] }]));
  for (const p of presets) {
    const key = p.category && groups.has(p.category) ? p.category : 'misc';
    if (!groups.has(key)) {
      groups.set(key, { id: 'misc', name: 'Otras', hint: '', presets: [] });
    }
    groups.get(key).presets.push(p);
  }
  return Array.from(groups.values()).filter((g) => g.presets.length > 0);
}
