"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { 
  detectLanguage, 
  storeLanguagePreference, 
  isValidLocale, 
  type SupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE 
} from "@/lib/utils/language-detection";

interface I18nContextProps {
  locale: SupportedLocale;
  t: (key: string) => string;
  setLocale: (locale: SupportedLocale) => void;
  isLoading: boolean;
  error: string | null;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: SupportedLocale;
  enableAutoDetection?: boolean;
  userAgent?: string;
}

export function I18nProvider({ 
  children, 
  defaultLocale = DEFAULT_LOCALE, // Now defaults to 'en'
  enableAutoDetection = true,
  userAgent
}: I18nProviderProps) {
  const searchParams = useSearchParams();
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect language on mount
  useEffect(() => {
    if (!enableAutoDetection) return;

    try {
      const detectedLocale = detectLanguage(searchParams, userAgent);
      if (detectedLocale && detectedLocale !== locale) {
        setLocaleState(detectedLocale);
      }
    } catch (err) {
      console.warn('Language detection failed:', err);
      setError('Language detection failed');
    }
  }, [searchParams, userAgent, enableAutoDetection, locale]);

  // Load translations when locale changes
  useEffect(() => {
    async function loadTranslations() {
      if (!isValidLocale(locale)) {
        setError(`Invalid locale: ${locale}`);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/locales/${locale}/${locale}.json`);
        
        if (!res.ok) {
          throw new Error(`Failed to load translations: ${res.status}`);
        }
        
        const data = await res.json();
        setTranslations(data);
      } catch (err) {
        console.error('Failed to load translations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load translations');
        setTranslations({});
      } finally {
        setIsLoading(false);
      }
    }

    loadTranslations();
  }, [locale]);

  // Handle URL parameter changes
  useEffect(() => {
    const paramLocale = searchParams.get("locale");
    if (paramLocale && isValidLocale(paramLocale) && paramLocale !== locale) {
      setLocaleState(paramLocale);
    }
  }, [searchParams, locale]);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!isValidLocale(newLocale)) {
      console.warn(`Invalid locale: ${newLocale}`);
      return;
    }

    setLocaleState(newLocale);
    storeLanguagePreference(newLocale);
  }, []);

  function t(key: string): string {
    return translations[key] || key;
  }

  const contextValue: I18nContextProps = {
    locale,
    t,
    setLocale,
    isLoading,
    error,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
} 