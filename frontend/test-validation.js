// Test validation patterns
import { VALIDATION_PATTERNS } from './src/utils/constants.js';

console.log('=== Testing Validation Patterns ===');
console.log('Email pattern:', VALIDATION_PATTERNS.EMAIL);
console.log('Password pattern:', VALIDATION_PATTERNS.PASSWORD);
console.log('Phone pattern:', VALIDATION_PATTERNS.PHONE);

// Test email validation
const testEmails = ['admin@example.com', 'invalid-email', 'user@test.org'];
console.log('\n=== Email Validation Tests ===');
testEmails.forEach(email => {
  const isValid = VALIDATION_PATTERNS.EMAIL.test(email);
  console.log(`${email}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

// Test password validation
const testPasswords = ['AdminPass123!', 'weak', 'NoSpecialChar1', 'nouppercase1!'];
console.log('\n=== Password Validation Tests ===');
testPasswords.forEach(password => {
  const isValid = VALIDATION_PATTERNS.PASSWORD.test(password);
  console.log(`${password}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});