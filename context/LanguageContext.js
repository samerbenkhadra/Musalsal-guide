import React, { createContext, useContext, useState } from 'react';
import { getLocales } from 'expo-localization';

const LanguageContext = createContext();

const getDeviceLanguage = () => {
  try {
    const locales = getLocales();
    const primary = locales?.[0]?.languageCode;
    return primary === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getDeviceLanguage);
  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
