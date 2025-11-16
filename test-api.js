/**
 * API Endpoint Testing Script
 * Tests the HVAC calculation and room processing endpoints
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test data matching React Native app format
const sampleFormData = {
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
  absenceEndTime: '5:00 PM',
  homeType: 'single-family',
  humidity: 50,
  seerRating: 14,
  windowType: 'double_pane',
  windowAreaPercent: 15,
  numExteriorDoors: 2,
  ceilingHeight: 8,
  numFloors: 1
};

const sampleRoomData = {
  dimensions: {
    width: 25,
    height: 9,
    depth: 20
  },
  surfaces: [
    { type: 'wall', area: 180 },
    { type: 'wall', area: 180 },
    { type: 'wall', area: 225 },
    { type: 'wall', area: 225 },
    { type: 'floor', area: 500 },
    { type: 'ceiling', area: 500 }
  ],
  openings: [
    { type: 'door', area: 21 },
    { type: 'window', area: 20 },
    { type: 'window', area: 20 }
  ],
  rawData: {}
};

async function testHealthCheck() {
  console.log('\n=== Testing Health Check Endpoint ===');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✓ Health check passed');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('  → Make sure the server is running: npm run dev');
    }
    return false;
  }
}

async function testCalculateEndpoint() {
  console.log('\n=== Testing Calculate Endpoint ===');
  try {
    const payload = {
      formData: sampleFormData,
      roomData: {} // Test without room data first
    };

    console.log('Sending request with form data only...');
    const response = await axios.post(`${API_BASE_URL}/api/calculate`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000 // 30 seconds timeout
    });

    console.log('✓ Calculate endpoint passed');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    // Validate response structure
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('\n✓ Response structure valid');
      console.log(`  Action: ${data.action}`);
      console.log(`  Setback Temp: ${data.setbackTemp}°F`);
      console.log(`  Desired Temp: ${data.desiredTemp}°F`);
      console.log(`  Thermal Time Constant: ${data.thermalTimeConstant} hours`);
      console.log(`  Break-Even Time: ${data.breakEvenTime} hours`);
      console.log(`  Recovery Time: ${data.recoveryTime} minutes`);
      console.log(`  Restart Time: ${data.restartTime}`);
      console.log(`  Savings Per Day: $${data.savingsPerDay}`);
      console.log(`  Savings Per Year: $${data.savingsPerYear}`);
      console.log(`  Energy Saved: ${data.energySavedKwh} kWh`);
      console.log(`  Percent Saved: ${data.percentSaved}%`);
    }

    return true;
  } catch (error) {
    console.error('✗ Calculate endpoint failed');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  No response received:', error.message);
    } else {
      console.error('  Error:', error.message);
    }
    return false;
  }
}

async function testCalculateWithRoomData() {
  console.log('\n=== Testing Calculate Endpoint with Room Scan Data ===');
  try {
    const payload = {
      formData: sampleFormData,
      roomData: sampleRoomData
    };

    console.log('Sending request with room scan data...');
    const response = await axios.post(`${API_BASE_URL}/api/calculate`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('✓ Calculate with room data passed');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    return true;
  } catch (error) {
    console.error('✗ Calculate with room data failed');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('  Error:', error.message);
    }
    return false;
  }
}

async function testProcessRoomEndpoint() {
  console.log('\n=== Testing Process Room Endpoint ===');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/process-room`, sampleRoomData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✓ Process room endpoint passed');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    // Validate response structure
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('\n✓ Response structure valid');
      console.log(`  Floor Area: ${data.processedDimensions?.floorArea} sq ft`);
      console.log(`  Volume: ${data.processedDimensions?.volume} cu ft`);
      console.log(`  Window Area: ${data.windowArea} sq ft`);
      console.log(`  Window Area %: ${data.windowAreaPercent}%`);
      console.log(`  Doors: ${data.openingCount?.doors}`);
      console.log(`  Windows: ${data.openingCount?.windows}`);
      console.log(`  Data Quality: ${data.metadata?.dataQuality}`);
    }

    return true;
  } catch (error) {
    console.error('✗ Process room endpoint failed');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('  Error:', error.message);
    }
    return false;
  }
}

async function testEdgeCases() {
  console.log('\n=== Testing Edge Cases ===');
  
  // Test with minimal data
  console.log('\n1. Testing with minimal required fields...');
  try {
    const minimalData = {
      formData: {
        outdoorTemp: 85,
        desiredTemp: 72,
        absenceDuration: 8,
        floorArea: 2000
      }
    };
    const response = await axios.post(`${API_BASE_URL}/api/calculate`, minimalData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('✓ Minimal data test passed');
  } catch (error) {
    console.error('✗ Minimal data test failed:', error.response?.data?.error?.message || error.message);
  }

  // Test with missing required field
  console.log('\n2. Testing with missing required field...');
  try {
    const invalidData = {
      formData: {
        outdoorTemp: 85,
        desiredTemp: 72
        // Missing absenceDuration and floorArea
      }
    };
    await axios.post(`${API_BASE_URL}/api/calculate`, invalidData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.error('✗ Should have failed validation');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✓ Validation working correctly (returned 400)');
    } else {
      console.error('✗ Unexpected error:', error.message);
    }
  }

  // Test different scenarios
  console.log('\n3. Testing cooling scenario (high outdoor temp)...');
  try {
    const coolingData = {
      formData: {
        ...sampleFormData,
        outdoorTemp: 95,
        desiredTemp: 72,
        absenceDuration: 10
      }
    };
    const response = await axios.post(`${API_BASE_URL}/api/calculate`, coolingData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('✓ Cooling scenario test passed');
    console.log(`  Action: ${response.data.data.action}`);
    console.log(`  Setback Temp: ${response.data.data.setbackTemp}°F`);
  } catch (error) {
    console.error('✗ Cooling scenario test failed:', error.message);
  }

  console.log('\n4. Testing heating scenario (low outdoor temp)...');
  try {
    const heatingData = {
      formData: {
        ...sampleFormData,
        outdoorTemp: 20,
        desiredTemp: 68,
        absenceDuration: 9
      }
    };
    const response = await axios.post(`${API_BASE_URL}/api/calculate`, heatingData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('✓ Heating scenario test passed');
    console.log(`  Action: ${response.data.data.action}`);
    console.log(`  Setback Temp: ${response.data.data.setbackTemp}°F`);
  } catch (error) {
    console.error('✗ Heating scenario test failed:', error.message);
  }

  console.log('\n5. Testing short absence (should recommend MAINTAIN)...');
  try {
    const shortAbsenceData = {
      formData: {
        ...sampleFormData,
        absenceDuration: 1 // Very short absence
      }
    };
    const response = await axios.post(`${API_BASE_URL}/api/calculate`, shortAbsenceData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('✓ Short absence test passed');
    console.log(`  Action: ${response.data.data.action}`);
    console.log(`  Break-Even Time: ${response.data.data.breakEvenTime} hours`);
  } catch (error) {
    console.error('✗ Short absence test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('THERMSOL.ai Backend API Testing');
  console.log('========================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Testing at: ${new Date().toISOString()}`);

  const results = {
    healthCheck: false,
    calculate: false,
    calculateWithRoom: false,
    processRoom: false
  };

  // Test health check first
  results.healthCheck = await testHealthCheck();
  
  if (!results.healthCheck) {
    console.log('\n⚠️  Server is not running. Please start it with: npm run dev');
    return;
  }

  // Test endpoints
  results.calculate = await testCalculateEndpoint();
  results.calculateWithRoom = await testCalculateWithRoomData();
  results.processRoom = await testProcessRoomEndpoint();

  // Test edge cases
  await testEdgeCases();

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Health Check: ${results.healthCheck ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Calculate Endpoint: ${results.calculate ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Calculate with Room Data: ${results.calculateWithRoom ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Process Room Endpoint: ${results.processRoom ? '✓ PASS' : '✗ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\nOverall: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  console.log('========================================\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

