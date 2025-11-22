const { setupTestDatabase, teardownTestDatabase } = require('./tests/helpers/metrics.test.helpers.js');

async function testSetup() {
  console.log('Testing setup...');
  
  try {
    await setupTestDatabase();
    console.log('✅ Database setup successful');
    
    await teardownTestDatabase();
    console.log('✅ Database teardown successful');
    
    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSetup();