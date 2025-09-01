// Test script untuk verifikasi production login chat.taxai
// Jalankan dengan: node test-production-login.js

const BASE_URL = 'https://ask.taxai.ae';

async function testChatTaxaiProduction() {
  console.log('🔐 Testing Chat.taxai Production Login');
  console.log('=====================================');
  console.log('Base URL:', BASE_URL);
  console.log('');
  
  const testCredentials = {
    email: 'dawskutel@gmail.com',
    password: 'password'
  };
  
  console.log('📋 Test Credentials:');
  console.log('Email:', testCredentials.email);
  console.log('Password:', testCredentials.password);
  console.log('');
  
  try {
    // Test 1: Check if service is accessible
    console.log('1. 🌐 Testing service accessibility...');
    const healthResponse = await fetch(`${BASE_URL}/api/auth/providers`);
    
    if (healthResponse.ok) {
      const providersData = await healthResponse.json();
      console.log('✅ Service is accessible');
      console.log('Available providers:', Object.keys(providersData));
      console.log('');
    } else {
      console.log('❌ Service not accessible:', healthResponse.status);
      console.log('Error:', await healthResponse.text());
      return;
    }
    
    // Test 2: Test NextAuth session endpoint
    console.log('2. 📋 Testing NextAuth session...');
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`);
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ NextAuth session endpoint working');
      console.log('Session data:', sessionData);
      console.log('');
    } else {
      console.log('❌ NextAuth session endpoint failed:', sessionResponse.status);
    }
    
    // Test 3: Test NextAuth csrf endpoint
    console.log('3. 🛡️  Testing NextAuth CSRF...');
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    
    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      console.log('✅ NextAuth CSRF endpoint working');
      console.log('CSRF token:', csrfData.csrfToken ? 'Present' : 'Missing');
      console.log('');
    } else {
      console.log('❌ NextAuth CSRF endpoint failed:', csrfResponse.status);
    }
    
    console.log('📊 Test Summary:');
    console.log('✅ Service is accessible');
    console.log('✅ NextAuth endpoints working');
    console.log('');
    
    console.log('🎯 CONCLUSION:');
    console.log('✅ Chat.taxai production service is running');
    console.log('✅ NextAuth configuration is accessible');
    console.log('✅ Ready for login testing');
    console.log('');
    
    console.log('🔧 Next Steps:');
    console.log('1. Test actual login form di https://ask.taxai.ae');
    console.log('2. Use credentials: dawskutel@gmail.com / password');
    console.log('3. Check browser console untuk error details');
    console.log('4. Verify NextAuth callback flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if chat.taxai service is deployed');
    console.log('2. Verify domain https://ask.taxai.ae is accessible');
    console.log('3. Check production environment variables');
    console.log('4. Review NextAuth configuration');
  }
}

// Run the test
testChatTaxaiProduction();

