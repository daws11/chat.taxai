"use client";
import { useI18n } from './i18n-provider';
import { Globe } from 'lucide-react';

const languages = [
  { code: "en", label: "EN" },
  { code: "ar", label: "ع" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex rounded-md border bg-background overflow-hidden">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={`px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50
              ${locale === lang.code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}
            `}
            aria-pressed={locale === lang.code}
            aria-label={`Switch to ${lang.label}`}
            type="button"
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
} 