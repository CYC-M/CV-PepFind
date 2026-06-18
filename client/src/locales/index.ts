import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import ar from './ar.json';
import fr from './fr.json';
import pt from './pt.json';
import ru from './ru.json';
import ja from './ja.json';

export const translations = {
  en, zh, es, ar, fr, pt, ru, ja
} as const;

export type Language = keyof typeof translations;

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

export const defaultLanguage: Language = 'en';

export function getTranslation(language: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
}

export function t(language: Language, key: string): string {
  return getTranslation(language, key);
}
