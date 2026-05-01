import { useContext } from 'react';
import { LanguageContext } from './languageContextValue';

export function useI18n() {
  return useContext(LanguageContext);
}
