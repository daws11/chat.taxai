/**
 * Language detection utilities for automatic language selection
 */

export type SupportedLocale = 'ar' | 'en';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['ar', 'en'];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Language detection preferences with priority order
 */
interface LanguageDetectionConfig {
  // Priority sources for language detection
  sources: {
    urlParam: boolean;
    localStorage: boolean;
    browserLanguage: boolean;
    userAgent: boolean;
    default: boolean;
  };
  // Fallback locale if detection fails
  fallbackLocale: SupportedLocale;
  // Cache detection results
  cacheResults: boolean;
}

const DEFAULT_CONFIG: LanguageDetectionConfig = {
  sources: {
    urlParam: true,
    localStorage: true,
    browserLanguage: true,
    userAgent: false,
    default: true,
  },
  fallbackLocale: DEFAULT_LOCALE,
  cacheResults: true,
};

// Cache for detection results
let detectionCache: { [key: string]: SupportedLocale } = {};

/**
 * Detects browser language from navigator.language
 */
export function detectBrowserLanguage(): SupportedLocale | null {
  if (typeof window === 'undefined') return null;

  try {
    const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
    if (!browserLang) return null;

    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Check if it's a supported locale
    if (SUPPORTED_LOCALES.includes(langCode as SupportedLocale)) {
      return langCode as SupportedLocale;
    }

    // Try to map common language codes to supported locales
    const languageMap: { [key: string]: SupportedLocale } = {
      'ar': 'ar',
      'en': 'en',
      'us': 'en',
      'gb': 'en',
      'ae': 'en', // UAE default to English
      'sa': 'en', // Saudi Arabia default to English
      'eg': 'en', // Egypt default to English
    };

    return languageMap[langCode] || null;
  } catch (error) {
    console.warn('Error detecting browser language:', error);
    return null;
  }
}

/**
 * Detects language from URL parameters
 */
export function detectUrlLanguage(searchParams: URLSearchParams): SupportedLocale | null {
  try {
    const localeParam = searchParams.get('locale');
    if (localeParam && SUPPORTED_LOCALES.includes(localeParam as SupportedLocale)) {
      return localeParam as SupportedLocale;
    }
    return null;
  } catch (error) {
    console.warn('Error detecting URL language:', error);
    return null;
  }
}

/**
 * Detects language from localStorage
 */
export function detectStoredLanguage(): SupportedLocale | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('preferred-locale');
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale;
    }
    return null;
  } catch (error) {
    console.warn('Error detecting stored language:', error);
    return null;
  }
}

/**
 * Detects language from user agent (for server-side detection)
 */
export function detectUserAgentLanguage(userAgent: string): SupportedLocale | null {
  try {
    // Simple user agent language detection
    const arabicKeywords = ['ar', 'arabic', 'عربي'];
    const englishKeywords = ['en', 'english'];
    
    const lowerUA = userAgent.toLowerCase();
    
    for (const keyword of arabicKeywords) {
      if (lowerUA.includes(keyword)) {
        return 'ar';
      }
    }
    
    for (const keyword of englishKeywords) {
      if (lowerUA.includes(keyword)) {
        return 'en';
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Error detecting user agent language:', error);
    return null;
  }
}

/**
 * Comprehensive language detection with multiple sources
 */
export function detectLanguage(
  searchParams?: URLSearchParams,
  userAgent?: string,
  config: Partial<LanguageDetectionConfig> = {}
): SupportedLocale {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const cacheKey = `${searchParams?.toString() || ''}-${userAgent || ''}`;
  
  // Return cached result if available
  if (finalConfig.cacheResults && detectionCache[cacheKey]) {
    return detectionCache[cacheKey];
  }

  let detectedLocale: SupportedLocale | null = null;

  // 1. URL Parameter (highest priority)
  if (finalConfig.sources.urlParam && searchParams) {
    detectedLocale = detectUrlLanguage(searchParams);
    if (detectedLocale) {
      return cacheResult(cacheKey, detectedLocale, finalConfig.cacheResults);
    }
  }

  // 2. LocalStorage (user preference)
  if (finalConfig.sources.localStorage) {
    detectedLocale = detectStoredLanguage();
    if (detectedLocale) {
      return cacheResult(cacheKey, detectedLocale, finalConfig.cacheResults);
    }
  }

  // 3. Browser Language
  if (finalConfig.sources.browserLanguage) {
    detectedLocale = detectBrowserLanguage();
    if (detectedLocale) {
      return cacheResult(cacheKey, detectedLocale, finalConfig.cacheResults);
    }
  }

  // 4. User Agent (server-side)
  if (finalConfig.sources.userAgent && userAgent) {
    detectedLocale = detectUserAgentLanguage(userAgent);
    if (detectedLocale) {
      return cacheResult(cacheKey, detectedLocale, finalConfig.cacheResults);
    }
  }

  // 5. Default fallback
  if (finalConfig.sources.default) {
    return cacheResult(cacheKey, finalConfig.fallbackLocale, finalConfig.cacheResults);
  }

  return finalConfig.fallbackLocale;
}

/**
 * Caches detection result
 */
function cacheResult(
  cacheKey: string, 
  locale: SupportedLocale, 
  cacheResults: boolean
): SupportedLocale {
  if (cacheResults) {
    detectionCache[cacheKey] = locale;
  }
  return locale;
}

/**
 * Stores user's language preference
 */
export function storeLanguagePreference(locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('preferred-locale', locale);
  } catch (error) {
    console.warn('Error storing language preference:', error);
  }
}

/**
 * Clears language detection cache
 */
export function clearLanguageCache(): void {
  detectionCache = {};
}

/**
 * Gets all supported locales with their display names
 */
export function getSupportedLocalesWithNames(): Array<{ code: SupportedLocale; name: string; nativeName: string }> {
  return [
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];
}

/**
 * Validates if a locale is supported
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Gets locale display name
 */
export function getLocaleDisplayName(locale: SupportedLocale, inLocale: SupportedLocale = 'en'): string {
  const locales = getSupportedLocalesWithNames();
  const localeInfo = locales.find(l => l.code === locale);
  
  if (!localeInfo) return locale;
  
  return inLocale === 'ar' ? localeInfo.nativeName : localeInfo.name;
}
