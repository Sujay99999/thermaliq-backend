#!/usr/bin/env node

/**
 * Test script to verify backend connection
 * Run: node test-connection.js [IP_ADDRESS]
 * 
 * Examples:
 *   node test-connection.js              # Test localhost
 *   node test-connection.js 192.168.1.100  # Test specific IP
 */

const axios = require('axios');

const IP = process.argv[2] || 'localhost';
const BASE_URL = `http://${IP}:3000`;

console.log(`\n🧪 Testing backend connection...\n`);
console.log(`📍 Testing: ${BASE_URL}\n`);

async function testConnection() {
  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('   ✅ Health check passed');
    console.log(`   Response: ${JSON.stringify(healthResponse.data, null, 2)}\n`);

    // Test 2: Root endpoint
    console.log('2️⃣  Testing root endpoint...');
    const rootResponse = await axios.get(`${BASE_URL}/`, { timeout: 5000 });
    console.log('   ✅ Root endpoint passed');
    console.log(`   Response: ${JSON.stringify(rootResponse.data, null, 2)}\n`);

    // Test 3: Calculate endpoint (with sample data)
    console.log('3️⃣  Testing calculate endpoint...');
    const calculateResponse = await axios.post(
      `${BASE_URL}/api/calculate`,
      {
        formData: {
          zipCode: '02134',
          outdoorTemp: 85,
          desiredTemp: 72,
          absenceDuration: 8,
          floorArea: 2000,
          insulationQuality: 'average',
          constructionType: 'wood_frame',
          constructionEra: '2000_2010',
          utilityRate: 0.12,
          absenceStartTime: '8:00 AM',
          absenceEndTime: '5:00 PM'
        },
        roomData: {}
      },
      { timeout: 30000 }
    );
    console.log('   ✅ Calculate endpoint passed');
    console.log(`   Action: ${calculateResponse.data.data?.action || 'N/A'}`);
    console.log(`   Savings per year: $${calculateResponse.data.data?.savingsPerYear || 'N/A'}\n`);

    // Test 4: Process room endpoint
    console.log('4️⃣  Testing process-room endpoint...');
    const roomResponse = await axios.post(
      `${BASE_URL}/api/process-room`,
      {
        dimensions: { width: 20, height: 10, depth: 15 },
        surfaces: [],
        openings: [],
        rawData: {}
      },
      { timeout: 10000 }
    );
    console.log('   ✅ Process-room endpoint passed');
    console.log(`   Floor area: ${roomResponse.data.data?.processedDimensions?.floorArea || 'N/A'} sq ft\n`);

    console.log('🎉 All tests passed! Backend is working correctly.\n');
    console.log(`📱 Use this IP in your React Native app: ${IP === 'localhost' ? 'localhost (for simulators)' : IP}\n`);

  } catch (error) {
    console.error('❌ Connection test failed!\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Error: Connection refused');
      console.error('   → Make sure the backend server is running: npm run dev');
      console.error(`   → Check if it's running on port 3000: http://${IP}:3000/health\n`);
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   Error: Request timed out');
      console.error('   → Check your network connection');
      console.error(`   → Verify ${IP} is accessible from your network\n`);
    } else if (error.response) {
      console.error(`   Error: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}\n`);
    } else {
      console.error(`   Error: ${error.message}\n`);
    }
    
    process.exit(1);
  }
}

testConnection();

