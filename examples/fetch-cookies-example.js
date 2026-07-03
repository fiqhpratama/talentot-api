#!/usr/bin/env node
/**
 * Example script showing how to use the new fetchCookies feature
 * 
 * This demonstrates the complete workflow:
 * 1. Fetch cookies automatically using credentials
 * 2. Use those cookies with clockIn/clockOut functions
 */

const talenta = require('../index');

// Example function showing the complete workflow
async function exampleWorkflow() {
  try {
    console.log('📋 Example: Using fetchCookies with clockIn/clockOut\n');
    
    // Note: This is just a demonstration - replace with real credentials
    const email = 'steven.immanuel@cashup.id';
    const password = 'B@wangmer4h97';
    
    console.log('Step 1: Fetching cookies automatically...');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${'*'.repeat(password.length)}\n`);
    
    // This would normally work with real credentials
    console.log('   const cookies = await talenta.fetchCookies(email, password);');
    console.log('   // Returns: "PHPSESSID=abc123..." or "_identity=def456..."\n');
    
    console.log('Step 2: Using cookies with clockIn...');
    console.log('   const result = await talenta.clockIn({');
    console.log('     lat: "-6.000",');
    console.log('     long: "107.000",'); 
    console.log('     cookies: cookies,');
    console.log('     desc: "Hello I am In"');
    console.log('   });\n');
    
    console.log('Step 3: Later, using the same cookies for clockOut...');
    console.log('   const result = await talenta.clockOut({');
    console.log('     lat: "-6.000",');
    console.log('     long: "107.000",');
    console.log('     cookies: cookies,');
    console.log('     desc: "Goodbye I am Out"');
    console.log('   });\n');
    
    console.log('✅ Benefits of using fetchCookies:');
    console.log('   • No manual browser cookie extraction');
    console.log('   • Fresh cookies every time');
    console.log('   • Programmatic authentication');
    console.log('   • Simplified setup process\n');
    
    console.log('💡 To test with real credentials:');n
    console.log('   npm run test-fetch-cookies\n');
    
  } catch (error) {
    console.error('❌ Error in example:', error.message);
  }
}

// Alternative compact usage example
function compactExample() {
  console.log('📋 Compact Example:\n');
  console.log('```javascript');
  console.log('const talenta = require("talenta-api");');
  console.log('');
  console.log('// One-liner to get cookies and clock in');
  console.log('const cookies = await talenta.fetchCookies("email", "password");');
  console.log('await talenta.clockIn({ lat: "-6", long: "107", cookies, desc: "In" });');
  console.log('```\n');
}

// Run examples
console.log('🚀 Talenta API - fetchCookies Usage Examples\n');
exampleWorkflow();
compactExample();