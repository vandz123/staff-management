"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Locale, getTranslator } from "@/lib/i18n";

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: "vi",
  setLocale: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Locale | null;
    if (saved === "en" || saved === "vi") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("lang", newLocale);
  }, []);

  const t = useCallback(
    (key: string) => getTranslator(locale)(key),
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
