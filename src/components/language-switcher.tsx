"use client";
import { useI18n } from './i18n-provider';
import { Globe, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { 
  getSupportedLocalesWithNames, 
  getLocaleDisplayName,
  type SupportedLocale 
} from '@/lib/utils/language-detection';

const languages = getSupportedLocalesWithNames();

export function LanguageSwitcher() {
  const { locale, setLocale, isLoading } = useI18n();
  const [open, setOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        className={`flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 p-1 ${open ? 'pointer-events-none' : ''}`}
        aria-label="Select language"
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading || isChanging}
      >
        {isLoading || isChanging ? (
          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        ) : (
          <Globe className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 min-w-[8rem] rounded-xl shadow-xl bg-background border z-50 animate-fade-in overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={async () => {
                if (lang.code === locale) {
                  setOpen(false);
                  return;
                }

                setIsChanging(true);
                try {
                  // Update locale in i18n provider
                  setLocale(lang.code as SupportedLocale);
                  
                  // Update user preference in database
                  await fetch('/api/users/me', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: lang.code }),
                  });
                  
                  // Update document attributes for RTL/LTR
                  if (lang.code === 'ar') {
                    document.documentElement.dir = 'rtl';
                    document.documentElement.lang = 'ar';
                    document.body.classList.add('rtl-layout');
                  } else {
                    document.documentElement.dir = 'ltr';
                    document.documentElement.lang = lang.code;
                    document.body.classList.remove('rtl-layout');
                  }
                } catch (error) {
                  console.error('Failed to change language:', error);
                } finally {
                  setIsChanging(false);
                  setOpen(false);
                }
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                locale === lang.code 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              aria-pressed={locale === lang.code}
              aria-label={`Switch to ${lang.nativeName}`}
              type="button"
              disabled={isChanging}
            >
              <div className="flex flex-col">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs opacity-75">{lang.name}</span>
              </div>
              {locale === lang.code && (
                <div className="w-2 h-2 rounded-full bg-current" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 