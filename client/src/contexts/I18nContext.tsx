import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, languages, defaultLanguage, t } from '@/locales';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languages: typeof languages;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // 从localStorage读取语言设置，默认为英文
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv-pepfind-language') as Language | null;
      return saved || defaultLanguage;
    }
    return defaultLanguage;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv-pepfind-language', lang);
    }
  };

  const translate = (key: string): string => {
    return t(language, key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translate, languages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
