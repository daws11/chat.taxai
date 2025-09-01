// Test script untuk verifikasi chat.taxai login dan redirect
// Jalankan dengan: node test-chat-login.js

const BASE_URL = 'http://localhost:3001';

async function testChatLogin() {
  console.log('🔐 Testing Chat.taxai Login and Redirect');
  console.log('========================================');
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
    // Step 1: Check if chat.taxai is accessible
    console.log('1. 🌐 Checking chat.taxai accessibility...');
    const healthResponse = await fetch(`${BASE_URL}/api/auth/providers`);
    
    if (!healthResponse.ok) {
      console.log('❌ Chat.taxai not accessible:', healthResponse.status);
      console.log('Make sure chat.taxai server is running on port 3001');
      return;
    }
    
    console.log('✅ Chat.taxai is accessible');
    console.log('');
    
    // Step 2: Get CSRF token
    console.log('2. 🛡️ Getting CSRF token...');
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    
    if (!csrfResponse.ok) {
      console.log('❌ Failed to get CSRF token:', csrfResponse.status);
      return;
    }
    
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    console.log('✅ CSRF token obtained:', csrfToken ? 'Present' : 'Missing');
    console.log('');
    
    // Step 3: Test NextAuth signin
    console.log('3. 🔐 Testing NextAuth signin...');
    const signinResponse = await fetch(`${BASE_URL}/api/auth/signin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: testCredentials.email,
        password: testCredentials.password,
        csrfToken: csrfToken,
        callbackUrl: `${BASE_URL}/chat`,
        json: 'true'
      }),
      credentials: 'include'
    });
    
    console.log('Signin Response Status:', signinResponse.status);
    
    if (signinResponse.ok) {
      const signinData = await signinResponse.json();
      console.log('✅ NextAuth signin successful!');
      console.log('Signin Data:', signinData);
      console.log('');
      
      // Step 4: Check session
      console.log('4. 📋 Checking session...');
      const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
        credentials: 'include'
      });
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('✅ Session check successful!');
        console.log('Session Data:', sessionData);
        console.log('');
        
        if (sessionData.user) {
          console.log('🎯 LOGIN SUCCESS!');
          console.log('User:', sessionData.user.name);
          console.log('Email:', sessionData.user.email);
          console.log('');
          
          // Step 5: Test chat page access
          console.log('5. 💬 Testing chat page access...');
          const chatResponse = await fetch(`${BASE_URL}/chat`, {
            credentials: 'include'
          });
          
          console.log('Chat Page Status:', chatResponse.status);
          
          if (chatResponse.ok) {
            console.log('✅ Chat page accessible!');
            console.log('');
            
            console.log('📊 Test Summary:');
            console.log('✅ Chat.taxai server accessible');
            console.log('✅ CSRF token obtained');
            console.log('✅ NextAuth signin successful');
            console.log('✅ Session created with user data');
            console.log('✅ Chat page accessible');
            console.log('');
            
            console.log('🎯 CONCLUSION:');
            console.log('✅ Login and redirect to chat is working correctly');
            console.log('✅ User can access chat page after login');
            console.log('');
            
            console.log('🔧 Next Steps:');
            console.log('1. Test login in browser at http://localhost:3001/login');
            console.log('2. Verify redirect to /chat after successful login');
            console.log('3. Check if chat interface loads correctly');
            
          } else {
            console.log('❌ Chat page not accessible:', chatResponse.status);
            console.log('Check middleware configuration');
          }
          
        } else {
          console.log('❌ Session created but no user data');
          console.log('Session:', sessionData);
        }
        
      } else {
        console.log('❌ Session check failed:', sessionResponse.status);
        const sessionError = await sessionResponse.text();
        console.log('Session Error:', sessionError);
      }
      
    } else {
      console.log('❌ NextAuth signin failed:', signinResponse.status);
      const signinError = await signinResponse.text();
      console.log('Signin Error:', signinError);
      
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check NextAuth configuration');
      console.log('2. Verify credentials are correct');
      console.log('3. Check database connection');
      console.log('4. Review NextAuth logs');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure chat.taxai server is running on port 3001');
    console.log('2. Check if NextAuth endpoints are accessible');
    console.log('3. Verify network connectivity');
    console.log('4. Check console logs for detailed errors');
  }
}

// Run the test
testChatLogin();
