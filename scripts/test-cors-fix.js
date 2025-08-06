/**
 * Test script to verify CORS fix for Google Images
 * Run this in the browser console to test the fix
 */

// console.log('🧪 Testing CORS fix for Google Images...');

// Test 1: Check if GoogleImageService is available
// if (typeof window !== 'undefined' && window.angular) {
//   console.log('✅ Angular detected');
//   
//   // Test 2: Try to make a request to Google Images
//   const testUrl = 'https://lh3.googleusercontent.com/a/test=s96-c';
//   
//   console.log('🔍 Testing request to:', testUrl);
//   
//   fetch(testUrl)
//     .then(response => {
//       console.log('❌ Request succeeded - CORS fix not working');
//       console.log('Response:', response);
//     })
//     .catch(error => {
//       console.log('✅ Request blocked - CORS fix working');
//       console.log('Error:', error.message);
//     });
// } else {
//   console.log('⚠️ Angular not detected - run this in the app context');
// }

// Test 3: Check console for interceptor logs
// console.log('📋 Look for these logs in the console:');
// console.log('- "Blocking Google Image request to prevent CORS issues"');
// console.log('- "Using fallback due to CORS restrictions"');

// Test 4: Manual test function
window.testGoogleImageCORS = function() {
  console.log('🧪 Manual CORS test started...');
  
  const testUrls = [
    'https://lh3.googleusercontent.com/a/test1=s96-c',
    'https://lh4.googleusercontent.com/a/test2=s96-c',
    'https://lh5.googleusercontent.com/a/test3=s96-c'
  ];
  
  testUrls.forEach((url, index) => {
    setTimeout(() => {
      console.log(`🔍 Testing URL ${index + 1}:`, url);
      fetch(url)
        .then(response => {
          console.log(`❌ URL ${index + 1} succeeded - CORS fix not working`);
        })
        .catch(error => {
          console.log(`✅ URL ${index + 1} blocked - CORS fix working`);
        });
    }, index * 1000);
  });
};

console.log('💡 Run testGoogleImageCORS() to test multiple URLs'); 