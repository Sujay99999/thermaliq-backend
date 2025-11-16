/**
 * Quick Test for Corrected ASHRAE Formulas
 */

const { analyzeThermalStrategy } = require('./ashrae-formulas-corrected-new');

async function quickTest() {
  console.log('=== Quick Test of Corrected ASHRAE Formulas ===\n');
  
  const testCases = [
    {
      name: 'Workday (8 hrs)',
      inputs: {
        floor_area: 2000,
        ceiling_height: 8,
        desired_temp: 72,
        outdoor_temp: 85,
        absence_duration: 8,
        absence_start_time: '8:00 AM',
        monthly_electric_bill: 150
      }
    },
    {
      name: 'Weekend Trip (48 hrs)',
      inputs: {
        floor_area: 2000,
        ceiling_height: 8,
        desired_temp: 72,
        outdoor_temp: 90,
        absence_duration: 48,
        absence_start_time: '8:00 AM',
        monthly_electric_bill: 150
      }
    },
    {
      name: 'Short Errand (2 hrs)',
      inputs: {
        floor_area: 2000,
        ceiling_height: 8,
        desired_temp: 72,
        outdoor_temp: 85,
        absence_duration: 2
      }
    }
  ];
  
  for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    console.log('='.repeat(50));
    
    try {
      const start = Date.now();
      const result = await analyzeThermalStrategy(test.inputs);
      const duration = Date.now() - start;
      
      console.log(`Action: ${result.recommendation.action}`);
      console.log(`Setback Temp: ${result.recommendation.setback_temp}°F`);
      console.log(`Time Constant: ${result.building_physics.thermal_time_constant_hours} hrs`);
      console.log(`Break-Even: ${result.building_physics.break_even_time_hours} hrs`);
      
      if (result.recommendation.action === 'SETBACK') {
        console.log(`Restart Time: ${result.recommendation.restart_time}`);
        console.log(`Recovery: ${result.recommendation.recovery_time} hrs`);
        console.log(`Savings: $${result.savings.cost_saved_annual}/year (${result.savings.percent_saved}%)`);
      } else {
        console.log(`Reason: ${result.recommendation.reason}`);
      }
      
      console.log(`Computation Time: ${duration}ms`);
      console.log(`✅ PASSED`);
      
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log(error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('All tests complete!');
}

quickTest().catch(console.error);
