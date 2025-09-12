# Language Detection Implementation

## Overview
This document describes the implementation of automatic language detection for the TaxAI application, with English as the default language.

## Features

### 1. **Automatic Language Detection**
- Detects user's preferred language from multiple sources
- Prioritizes user preferences over system defaults
- Falls back to English as the default language

### 2. **Detection Sources (Priority Order)**
1. **URL Parameters** - `?locale=en` or `?locale=ar`
2. **Local Storage** - User's previously selected language
3. **Browser Language** - `navigator.language`
4. **User Agent** - Server-side detection (optional)
5. **Default Fallback** - English (`en`)

### 3. **Supported Languages**
- **English** (`en`) - Default language
- **Arabic** (`ar`) - RTL support

## Configuration

### Default Language
```typescript
export const DEFAULT_LOCALE: SupportedLocale = 'en';
```

### Language Detection Priority
```typescript
const DEFAULT_CONFIG: LanguageDetectionConfig = {
  sources: {
    urlParam: true,        // Check URL parameters first
    localStorage: true,    // Check stored preferences
    browserLanguage: true, // Check browser language
    userAgent: false,      // Server-side detection (disabled)
    default: true,         // Fallback to default
  },
  fallbackLocale: 'en',    // English as fallback
  cacheResults: true,      // Cache detection results
};
```

## Usage

### Basic Usage
```typescript
import { I18nProvider } from '@/components/i18n-provider';

function App() {
  return (
    <I18nProvider enableAutoDetection={true}>
      <YourApp />
    </I18nProvider>
  );
}
```

### Advanced Usage
```typescript
import { I18nProvider } from '@/components/i18n-provider';

function App({ userAgent }: { userAgent?: string }) {
  return (
    <I18nProvider 
      defaultLocale="en"
      enableAutoDetection={true}
      userAgent={userAgent}
    >
      <YourApp />
    </I18nProvider>
  );
}
```

### Using the Hook
```typescript
import { useI18n } from '@/components/i18n-provider';

function MyComponent() {
  const { locale, t, setLocale, isLoading, error } = useI18n();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <p>Current language: {locale}</p>
      <p>Translation: {t('welcome')}</p>
      <button onClick={() => setLocale('ar')}>
        Switch to Arabic
      </button>
    </div>
  );
}
```

## Language Detection Logic

### 1. URL Parameter Detection
```typescript
// Example: https://example.com?locale=ar
const detected = detectUrlLanguage(searchParams);
// Returns: 'ar'
```

### 2. Browser Language Detection
```typescript
// Detects from navigator.language
const detected = detectBrowserLanguage();
// Examples:
// 'en-US' -> 'en'
// 'ar-SA' -> 'ar'
// 'fr-FR' -> null (unsupported)
```

### 3. Stored Preference Detection
```typescript
// Detects from localStorage
const detected = detectStoredLanguage();
// Returns stored preference or null
```

### 4. Comprehensive Detection
```typescript
// Combines all sources with priority
const detected = detectLanguage(searchParams, userAgent);
// Returns the highest priority detected language
```

## Regional Defaults

### Country-to-Language Mapping
```typescript
const languageMap = {
  'ar': 'ar',  // Arabic
  'en': 'en',  // English
  'us': 'en',  // United States -> English
  'gb': 'en',  // United Kingdom -> English
  'ae': 'en',  // UAE -> English (changed from Arabic)
  'sa': 'en',  // Saudi Arabia -> English (changed from Arabic)
  'eg': 'en',  // Egypt -> English (changed from Arabic)
};
```

## RTL/LTR Support

### Automatic Document Updates
When language changes, the system automatically updates:
- `document.documentElement.dir` - 'rtl' for Arabic, 'ltr' for English
- `document.documentElement.lang` - Language code
- `document.body.classList` - Adds/removes 'rtl-layout' class

### CSS Support
```css
/* RTL Layout Support */
.rtl-layout {
  direction: rtl;
}

.rtl-layout .text-left {
  text-align: right;
}
```

## Testing

### Run Tests
```typescript
import { runLanguageDetectionTests } from '@/lib/utils/test-language-detection';

// Run comprehensive tests
runLanguageDetectionTests();
```

### Test Coverage
- Default language detection
- URL parameter handling
- Browser language detection
- Invalid input handling
- Edge cases and error scenarios

## Error Handling

### Common Errors
1. **Invalid Locale**: Falls back to default (English)
2. **Translation Loading Failed**: Shows error state
3. **Network Issues**: Graceful degradation

### Error States
```typescript
const { isLoading, error } = useI18n();

if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}
```

## Performance Optimizations

### 1. **Caching**
- Detection results are cached to avoid repeated calculations
- Translation files are loaded once per locale

### 2. **Lazy Loading**
- Translations are loaded only when needed
- No unnecessary network requests

### 3. **Memory Management**
- Cache can be cleared when needed
- Automatic cleanup on component unmount

## Migration from Arabic Default

### Changes Made
1. **Default Locale**: Changed from `'ar'` to `'en'`
2. **Regional Defaults**: Middle Eastern countries now default to English
3. **Fallback Behavior**: All fallbacks now use English

### Backward Compatibility
- Existing user preferences are preserved
- URL parameters still work as before
- No breaking changes to API

## Best Practices

### 1. **Always Provide Fallbacks**
```typescript
const text = t('key') || 'Fallback text';
```

### 2. **Handle Loading States**
```typescript
if (isLoading) return <Skeleton />;
```

### 3. **Validate Locales**
```typescript
if (isValidLocale(userInput)) {
  setLocale(userInput);
}
```

### 4. **Store User Preferences**
```typescript
// Automatically handled by the system
setLocale('ar'); // Also stores in localStorage
```

## Troubleshooting

### Common Issues

1. **Language not changing**
   - Check if locale is valid
   - Verify translations are loaded
   - Check for JavaScript errors

2. **RTL not working**
   - Ensure CSS classes are applied
   - Check document.dir attribute
   - Verify RTL layout styles

3. **Translations missing**
   - Check translation files exist
   - Verify file paths are correct
   - Check network requests

### Debug Mode
```typescript
// Enable debug logging
localStorage.setItem('debug-i18n', 'true');
```

## Future Enhancements

1. **More Languages**: Add support for additional languages
2. **Server-Side Detection**: Enhanced server-side language detection
3. **A/B Testing**: Language-based A/B testing
4. **Analytics**: Track language usage patterns
5. **Dynamic Loading**: Load translations on-demand
