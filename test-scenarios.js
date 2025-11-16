/**
 * Test Scenarios - Testing different building configurations
 * to verify SETBACK recommendations work correctly
 */

const axios = require('axios');
const API_BASE_URL = 'http://localhost:3000';

async function testScenario(name, formData) {
  console.log(`\n=== ${name} ===`);
  try {
    const response = await axios.post(`${API_BASE_URL}/api/calculate`, {
      formData,
      roomData: {}
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const data = response.data.data;
    console.log(`✓ Test passed`);
    console.log(`  Action: ${data.action}`);
    console.log(`  Setback Temp: ${data.setbackTemp}°F`);
    console.log(`  Thermal Time Constant: ${data.thermalTimeConstant} hours`);
    console.log(`  Break-Even Time: ${data.breakEvenTime} hours`);
    console.log(`  Absence Duration: ${formData.absenceDuration} hours`);
    console.log(`  Recovery Time: ${data.recoveryTime} minutes`);
    console.log(`  Savings Per Day: $${data.savingsPerDay}`);
    console.log(`  Energy Saved: ${data.energySavedKwh} kWh`);
    console.log(`  Percent Saved: ${data.percentSaved}%`);
    
    return data;
  } catch (error) {
    console.error(`✗ Test failed:`, error.response?.data || error.message);
    return null;
  }
}

async function runScenarios() {
  console.log('========================================');
  console.log('Testing Different Building Scenarios');
  console.log('========================================\n');

  // Scenario 1: Well-insulated home with long absence (should SETBACK)
  await testScenario(
    'Scenario 1: Well-insulated home, long absence (48 hours)',
    {
      zipCode: '02134',
      outdoorTemp: 90,
      desiredTemp: 72,
      absenceDuration: 48, // Long absence
      floorArea: 2000,
      insulationQuality: 'excellent',
      constructionType: 'wood_frame',
      constructionEra: 'after_2010',
      utilityRate: 0.15,
      absenceStartTime: '8:00 AM',
      absenceEndTime: '8:00 AM',
      seerRating: 16,
      windowType: 'low_e_double',
      windowAreaPercent: 12,
      numExteriorDoors: 2,
      ceilingHeight: 9,
      numFloors: 1
    }
  );

  // Scenario 2: Poorly insulated home with long absence
  await testScenario(
    'Scenario 2: Poorly insulated home, long absence (24 hours)',
    {
      zipCode: '02134',
      outdoorTemp: 85,
      desiredTemp: 72,
      absenceDuration: 24,
      floorArea: 1500,
      insulationQuality: 'poor',
      constructionType: 'wood_frame',
      constructionEra: 'before_1980',
      utilityRate: 0.12,
      absenceStartTime: '8:00 AM',
      absenceEndTime: '8:00 AM',
      seerRating: 12,
      windowType: 'single_pane',
      windowAreaPercent: 20,
      numExteriorDoors: 1,
      ceilingHeight: 8,
      numFloors: 1
    }
  );

  // Scenario 3: Small apartment with moderate absence
  await testScenario(
    'Scenario 3: Small apartment, moderate absence (12 hours)',
    {
      zipCode: '02134',
      outdoorTemp: 88,
      desiredTemp: 74,
      absenceDuration: 12,
      floorArea: 800,
      insulationQuality: 'good',
      constructionType: 'concrete',
      constructionEra: '2000_2010',
      utilityRate: 0.18,
      absenceStartTime: '8:00 AM',
      absenceEndTime: '8:00 PM',
      seerRating: 14,
      windowType: 'double_pane',
      windowAreaPercent: 10,
      numExteriorDoors: 1,
      ceilingHeight: 8,
      numFloors: 1
    }
  );

  // Scenario 4: Large home with very long absence
  await testScenario(
    'Scenario 4: Large home, very long absence (72 hours - weekend trip)',
    {
      zipCode: '02134',
      outdoorTemp: 92,
      desiredTemp: 72,
      absenceDuration: 72,
      floorArea: 3500,
      insulationQuality: 'good',
      constructionType: 'wood_frame',
      constructionEra: 'after_2010',
      utilityRate: 0.13,
      absenceStartTime: '8:00 AM',
      absenceEndTime: '8:00 AM',
      seerRating: 18,
      windowType: 'low_e_double',
      windowAreaPercent: 15,
      numExteriorDoors: 3,
      ceilingHeight: 10,
      numFloors: 2
    }
  );

  // Scenario 5: Heating scenario (winter)
  await testScenario(
    'Scenario 5: Heating scenario, long absence (36 hours)',
    {
      zipCode: '02134',
      outdoorTemp: 25,
      desiredTemp: 68,
      absenceDuration: 36,
      floorArea: 2200,
      insulationQuality: 'good',
      constructionType: 'wood_frame',
      constructionEra: '2000_2010',
      utilityRate: 0.14,
      absenceStartTime: '8:00 AM',
      absenceEndTime: '8:00 PM',
      seerRating: 15,
      windowType: 'double_pane',
      windowAreaPercent: 18,
      numExteriorDoors: 2,
      ceilingHeight: 9,
      numFloors: 2
    }
  );

  console.log('\n========================================');
  console.log('Scenario Testing Complete');
  console.log('========================================\n');
}

runScenarios().catch(error => {
  console.error('Error running scenarios:', error);
  process.exit(1);
});

