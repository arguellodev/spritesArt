// Valores compartidos del contexto de idioma. Separados del componente
// Provider para que Fast Refresh siga funcionando: HMR exige que un archivo
// .jsx exporte sólo componentes — constantes/contextos van fuera.

import { createContext } from 'react';
import es from './locales/es';
import en from './locales/en';

export const DEFAULT_LANG = 'es';
export const LOCALES = { es, en };

export const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (k) => k,
  available: Object.keys(LOCALES),
});
