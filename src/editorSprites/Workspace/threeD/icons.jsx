// Iconos SVG inline (Lucide-style) usados por el visor 3D modal y el panel
// de capas 3D. Declarados a nivel de módulo (no dentro de componentes) para
// satisfacer la regla react-hooks/static-components y permitir memoización
// del React Compiler.

import React from "react";

const Icon = ({ d, size = 14, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d}
  </svg>
);

export const IconBox = (p) => <Icon {...p} d={<><path d="m21 16-9 5-9-5V8l9-5 9 5v8z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></>} />;
export const IconSliders = (p) => <Icon {...p} d={<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>} />;
export const IconGrid = (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>} />;
export const IconShapes = (p) => <Icon {...p} d={<><path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1z" /><rect x="3" y="14" width="7" height="7" rx="1" /><circle cx="17.5" cy="17.5" r="3.5" /></>} />;
export const IconPalette = (p) => <Icon {...p} d={<><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></>} />;
export const IconFilm = (p) => <Icon {...p} d={<><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></>} />;
export const IconDownload = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} />;
export const IconUpload = (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>} />;
export const IconChevronDown = (p) => <Icon {...p} d={<polyline points="6 9 12 15 18 9" />} />;
export const IconPlay = (p) => <Icon {...p} d={<polygon points="5 3 19 12 5 21 5 3" />} />;
export const IconPause = (p) => <Icon {...p} d={<><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>} />;
export const IconSend = (p) => <Icon {...p} d={<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>} />;
export const IconImage = (p) => <Icon {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>} />;
export const IconInfo = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>} />;
export const IconTrash = (p) => <Icon {...p} d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>} />;
export const IconCube = IconBox; // alias semántico para "Capa 3D"
export const IconRefresh = (p) => <Icon {...p} d={<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" /><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" /></>} />;

// Helper de sección colapsable con la estética del topToolbar/visor.
export const Section = ({ id, icon, title, open, onToggle, children }) => (
  <section className={`t3d-section ${open ? "t3d-section--open" : "t3d-section--collapsed"}`}>
    <button
      type="button"
      className="t3d-section__head"
      onClick={() => onToggle(id)}
      aria-expanded={open}
    >
      <span className="t3d-section__icon">{icon}</span>
      <span className="t3d-section__name">{title}</span>
      <IconChevronDown className="t3d-section__chevron" />
    </button>
    <div className="t3d-section__body">{children}</div>
  </section>
);
