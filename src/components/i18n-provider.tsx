"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface I18nContextProps {
  locale: string;
  t: (key: string) => string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export function I18nProvider({ children, defaultLocale = "en" }: { children: ReactNode; defaultLocale?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<string>(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    const paramLocale = searchParams.get("locale");
    if (paramLocale && paramLocale !== locale) {
      setLocale(paramLocale);
    }
  }, [searchParams, locale]);

  useEffect(() => {
    async function loadTranslations() {
      try {
        const res = await fetch(`/locales/${locale}/${locale}.json`);
        const data = await res.json();
        setTranslations(data);
      } catch {
        setTranslations({});
      }
    }
    loadTranslations();
  }, [locale]);

  function t(key: string): string {
    return translations[key] || key;
  }

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
} 