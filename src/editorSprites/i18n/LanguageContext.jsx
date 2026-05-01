import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageContext, DEFAULT_LANG, LOCALES } from './languageContextValue';

const STORAGE_KEY = 'pixcalli.lang';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return LOCALES[saved] ? saved : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  const setLang = useCallback((next) => {
    if (!LOCALES[next]) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage bloqueado (modo privado, etc.) — el cambio sigue valiendo en memoria.
    }
  }, []);

  // Refleja el idioma en <html lang> para a11y / screen readers.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = useCallback(
    (key) => {
      const dict = LOCALES[lang] ?? LOCALES[DEFAULT_LANG];
      // Fallback a la clave cruda: si falta una traducción no rompe la UI,
      // y deja claro en pantalla qué string hay que añadir.
      return dict[key] ?? LOCALES[DEFAULT_LANG][key] ?? key;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, available: Object.keys(LOCALES) }),
    [lang, setLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// `useI18n` vive en `./useI18n` para mantener Fast Refresh feliz —
// este .jsx sólo exporta el componente Provider.
