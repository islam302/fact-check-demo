import React, { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first, then default to Arabic
    const saved = localStorage.getItem('language');
    if (saved === 'arabic' || saved === 'english') {
      return saved;
    }
    return 'arabic'; // Default to Arabic
  });

  const isArabic = language === 'arabic';

  useEffect(() => {
    // Apply language to document
    if (language === 'arabic') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }

    // Save to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    // Toggle between arabic and english
    setLanguage(prev => (prev === 'arabic' ? 'english' : 'arabic'));
  };

  const value = {
    isArabic,
    toggleLanguage,
    language,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
