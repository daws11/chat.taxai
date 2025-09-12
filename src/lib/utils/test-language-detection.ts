/**
 * Test utility for language detection functionality
 */

import { 
  detectLanguage, 
  detectBrowserLanguage, 
  detectUrlLanguage, 
  detectStoredLanguage,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES 
} from './language-detection';

// Mock URLSearchParams for testing
function createMockSearchParams(params: Record<string, string>): URLSearchParams {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  return searchParams;
}

export function runLanguageDetectionTests(): void {
  console.log('🧪 Running Language Detection Tests...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Default locale should be English
  console.log('Test 1: Default locale should be English');
  if (DEFAULT_LOCALE === 'en') {
    console.log('✅ PASS - Default locale is English');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected 'en', got '${DEFAULT_LOCALE}'`);
    failed++;
  }
  console.log('---\n');

  // Test 2: URL parameter detection
  console.log('Test 2: URL parameter detection');
  const urlParams = createMockSearchParams({ locale: 'ar' });
  const detectedFromUrl = detectUrlLanguage(urlParams);
  if (detectedFromUrl === 'ar') {
    console.log('✅ PASS - URL parameter detection works');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected 'ar', got '${detectedFromUrl}'`);
    failed++;
  }
  console.log('---\n');

  // Test 3: Invalid URL parameter should return null
  console.log('Test 3: Invalid URL parameter should return null');
  const invalidUrlParams = createMockSearchParams({ locale: 'invalid' });
  const invalidDetected = detectUrlLanguage(invalidUrlParams);
  if (invalidDetected === null) {
    console.log('✅ PASS - Invalid URL parameter returns null');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected null, got '${invalidDetected}'`);
    failed++;
  }
  console.log('---\n');

  // Test 4: Comprehensive detection with no parameters should default to English
  console.log('Test 4: Comprehensive detection defaults to English');
  const emptyParams = createMockSearchParams({});
  const defaultDetected = detectLanguage(emptyParams);
  if (defaultDetected === 'en') {
    console.log('✅ PASS - Default detection returns English');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected 'en', got '${defaultDetected}'`);
    failed++;
  }
  console.log('---\n');

  // Test 5: URL parameter should override default
  console.log('Test 5: URL parameter should override default');
  const arParams = createMockSearchParams({ locale: 'ar' });
  const arDetected = detectLanguage(arParams);
  if (arDetected === 'ar') {
    console.log('✅ PASS - URL parameter overrides default');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected 'ar', got '${arDetected}'`);
    failed++;
  }
  console.log('---\n');

  // Test 6: Browser language detection
  console.log('Test 6: Browser language detection');
  // Mock navigator for testing
  const originalNavigator = global.navigator;
  (global as any).navigator = { language: 'en-US' };
  
  const browserDetected = detectBrowserLanguage();
  if (browserDetected === 'en') {
    console.log('✅ PASS - Browser language detection works');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected 'en', got '${browserDetected}'`);
    failed++;
  }
  
  // Restore original navigator
  (global as any).navigator = originalNavigator;
  console.log('---\n');

  // Test 7: Arabic browser language detection
  console.log('Test 7: Arabic browser language detection');
  (global as any).navigator = { language: 'ar-SA' };
  
  const arabicDetected = detectBrowserLanguage();
  if (arabicDetected === 'ar') {
    console.log('✅ PASS - Arabic browser language detection works');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected 'ar', got '${arabicDetected}'`);
    failed++;
  }
  
  // Restore original navigator
  (global as any).navigator = originalNavigator;
  console.log('---\n');

  // Test 8: Unsupported browser language should return null
  console.log('Test 8: Unsupported browser language should return null');
  (global as any).navigator = { language: 'fr-FR' };
  
  const unsupportedDetected = detectBrowserLanguage();
  if (unsupportedDetected === null) {
    console.log('✅ PASS - Unsupported browser language returns null');
    passed++;
  } else {
    console.log(`❌ FAIL - Expected null, got '${unsupportedDetected}'`);
    failed++;
  }
  
  // Restore original navigator
  (global as any).navigator = originalNavigator;
  console.log('---\n');

  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Language detection is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
}

// Test edge cases
export function runEdgeCaseTests(): void {
  console.log('🧪 Running Edge Case Tests...\n');
  
  const edgeCases = [
    {
      name: 'Empty search params',
      params: createMockSearchParams({}),
      expected: 'en',
      description: 'Should default to English'
    },
    {
      name: 'Invalid locale in URL',
      params: createMockSearchParams({ locale: 'xyz' }),
      expected: 'en',
      description: 'Should fallback to English for invalid locale'
    },
    {
      name: 'Case insensitive detection',
      params: createMockSearchParams({ locale: 'EN' }),
      expected: 'en',
      description: 'Should handle case insensitive locale'
    }
  ];

  edgeCases.forEach((testCase, index) => {
    const result = detectLanguage(testCase.params);
    const success = result === testCase.expected;
    
    console.log(`Edge Case ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Input: ${testCase.name}`);
    console.log(`Expected: '${testCase.expected}'`);
    console.log(`Got: '${result}'`);
    console.log('---\n');
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  runLanguageDetectionTests();
  runEdgeCaseTests();
}
