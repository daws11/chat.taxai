/**
 * Test utility for response cleaner functions
 * This file can be used to test the response cleaning functionality
 */

import { cleanAIResponse } from './response-cleaner';

// Test cases for response cleaning
const testCases = [
  {
    input: "According to the document, UAE Corporate Tax rate is 9%. [1]",
    expected: "UAE Corporate Tax rate is 9%.",
    description: "Should remove 'According to the document' and citation [1]"
  },
  {
    input: "Based on the uploaded file, the deadline is March 31st. 【5:19†source】",
    expected: "The deadline is March 31st.",
    description: "Should remove 'Based on the uploaded file' and citation pattern"
  },
  {
    input: "As stated in the file, companies must register within 30 days. (see page 5)",
    expected: "Companies must register within 30 days.",
    description: "Should remove 'As stated in the file' and reference"
  },
  {
    input: "Let me check the uploaded files to find the answer.",
    expected: null,
    description: "Should filter out checking messages"
  },
  {
    input: "I will check the document for relevant information.",
    expected: null,
    description: "Should filter out checking messages"
  },
  {
    input: "UAE Corporate Tax applies to businesses with revenue exceeding AED 1 million. [source]",
    expected: "UAE Corporate Tax applies to businesses with revenue exceeding AED 1 million.",
    description: "Should remove [source] reference"
  },
  {
    input: "The tax rate is 9% as per the attached document. (ref: tax_rates.pdf)",
    expected: "The tax rate is 9%.",
    description: "Should remove 'as per the attached document' and reference"
  }
];

export function runResponseCleanerTests(): void {
  console.log('🧪 Running Response Cleaner Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    const result = cleanAIResponse(testCase.input);
    const success = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Expected: ${testCase.expected === null ? 'null' : `"${testCase.expected}"`}`);
    console.log(`Got: ${result === null ? 'null' : `"${result}"`}`);
    console.log('---\n');
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Response cleaner is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
}

// Additional test for edge cases
export function runEdgeCaseTests(): void {
  console.log('🧪 Running Edge Case Tests...\n');
  
  const edgeCases = [
    { input: "", expected: null, description: "Empty string should return null" },
    { input: "   ", expected: null, description: "Whitespace only should return null" },
    { input: "Normal response without references", expected: "Normal response without references", description: "Normal response should pass through" },
    { input: "Multiple   spaces   should   be   cleaned", expected: "Multiple spaces should be cleaned", description: "Multiple spaces should be cleaned" },
    { input: "Response with .  extra  .  punctuation  .", expected: "Response with . extra . punctuation .", description: "Extra punctuation should be cleaned" }
  ];
  
  edgeCases.forEach((testCase, index) => {
    const result = cleanAIResponse(testCase.input);
    const success = result === testCase.expected;
    
    console.log(`Edge Case ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Expected: ${testCase.expected === null ? 'null' : `"${testCase.expected}"`}`);
    console.log(`Got: ${result === null ? 'null' : `"${result}"`}`);
    console.log('---\n');
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  runResponseCleanerTests();
  runEdgeCaseTests();
}
