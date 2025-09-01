// Test script untuk verifikasi logout redirect ke ask.taxai.ae/login
// Jalankan dengan: node test-logout-redirect.js

const BASE_URL = 'http://localhost:3001';

async function testLogoutRedirect() {
  console.log('🚪 Testing Logout Redirect to ask.taxai.ae/login');
  console.log('================================================');
  console.log('Base URL:', BASE_URL);
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
    
    // Step 2: Test NextAuth signOut configuration
    console.log('2. 🔧 Testing NextAuth signOut configuration...');
    const signOutResponse = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: 'GET',
      credentials: 'include'
    });
    
    console.log('SignOut Response Status:', signOutResponse.status);
    console.log('SignOut Response URL:', signOutResponse.url);
    
    if (signOutResponse.ok) {
      console.log('✅ NextAuth signOut endpoint accessible');
      console.log('');
      
      // Step 3: Test API logout route
      console.log('3. 🚪 Testing API logout route...');
      const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      console.log('Logout API Status:', logoutResponse.status);
      console.log('Logout API URL:', logoutResponse.url);
      
      if (logoutResponse.status === 302 || logoutResponse.status === 200) {
        console.log('✅ API logout route working');
        console.log('');
        
        // Step 4: Check redirect location
        const location = logoutResponse.headers.get('location');
        console.log('4. 📍 Checking redirect location...');
        console.log('Redirect Location:', location);
        
        if (location === 'https://ask.taxai.ae/login') {
          console.log('✅ Redirect location is correct!');
          console.log('');
          
          console.log('📊 Test Summary:');
          console.log('✅ Chat.taxai server accessible');
          console.log('✅ NextAuth signOut endpoint working');
          console.log('✅ API logout route working');
          console.log('✅ Redirect location correct: https://ask.taxai.ae/login');
          console.log('');
          
          console.log('🎯 CONCLUSION:');
          console.log('✅ Logout redirect is configured correctly');
          console.log('✅ Users will be redirected to ask.taxai.ae/login after logout');
          console.log('');
          
          console.log('🔧 Next Steps:');
          console.log('1. Test logout in browser at http://localhost:3001');
          console.log('2. Verify redirect to https://ask.taxai.ae/login');
          console.log('3. Check if session is properly cleared');
          
        } else {
          console.log('❌ Redirect location incorrect');
          console.log('Expected: https://ask.taxai.ae/login');
          console.log('Actual:', location);
          console.log('');
          
          console.log('🔧 Troubleshooting:');
          console.log('1. Check NextAuth pages configuration');
          console.log('2. Check API logout route configuration');
          console.log('3. Verify signOut callback URL in components');
        }
        
      } else {
        console.log('❌ API logout route failed:', logoutResponse.status);
        const errorText = await logoutResponse.text();
        console.log('Error:', errorText);
      }
      
    } else {
      console.log('❌ NextAuth signOut endpoint failed:', signOutResponse.status);
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
testLogoutRedirect();
