// Modos de fusión de capa estilo Aseprite, mapeados 1:1 a los strings
// que acepta CanvasRenderingContext2D.globalCompositeOperation.
// 'normal' es alias visible de 'source-over'.

export const DEFAULT_BLEND_MODE = 'normal';

export const BLEND_MODES = [
  { id: 'normal',       label: 'Normal',         group: 'normal'    },
  { id: 'darken',       label: 'Oscurecer',      group: 'darken'    },
  { id: 'multiply',     label: 'Multiplicar',    group: 'darken'    },
  { id: 'color-burn',   label: 'Sobreexponer',   group: 'darken'    },
  { id: 'lighten',      label: 'Aclarar',        group: 'lighten'   },
  { id: 'screen',       label: 'Pantalla',       group: 'lighten'   },
  { id: 'color-dodge',  label: 'Subexponer',     group: 'lighten'   },
  { id: 'overlay',      label: 'Superposición',  group: 'contrast'  },
  { id: 'hard-light',   label: 'Luz fuerte',     group: 'contrast'  },
  { id: 'soft-light',   label: 'Luz suave',      group: 'contrast'  },
  { id: 'difference',   label: 'Diferencia',     group: 'compare'   },
  { id: 'exclusion',    label: 'Exclusión',      group: 'compare'   },
  { id: 'hue',          label: 'Tono',           group: 'component' },
  { id: 'saturation',   label: 'Saturación',     group: 'component' },
  { id: 'color',        label: 'Color',          group: 'component' },
  { id: 'luminosity',   label: 'Luminosidad',    group: 'component' },
];

export const BLEND_GROUP_LABELS = {
  normal:    null,
  darken:    'Oscurecer',
  lighten:   'Aclarar',
  contrast:  'Contraste',
  compare:   'Comparar',
  component: 'Componente',
};

// Alias retro-compat: el spec original usa el nombre BLEND_GROUPS.
export const BLEND_GROUPS = BLEND_GROUP_LABELS;

const BLEND_MODE_IDS = new Set(BLEND_MODES.map(m => m.id));

export function isValidBlendMode(id) {
  return typeof id === 'string' && BLEND_MODE_IDS.has(id);
}

export function getBlendModeLabel(id) {
  const mode = BLEND_MODES.find(m => m.id === id);
  return mode ? mode.label : 'Normal';
}

// Convierte un id a string para canvas. 'normal' -> 'source-over'.
export function toCompositeOperation(id) {
  if (!isValidBlendMode(id)) return 'source-over';
  return id === 'normal' ? 'source-over' : id;
}
