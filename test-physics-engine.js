/**
 * Comprehensive Test Suite for ThermalIQ Physics Engine
 * Tests the corrected ASHRAE formulas
 */

const {
  analyzeThermalStrategy,
  BuildingEnvelope,
  ThermalMassModel,
  HVACPerformance
} = require('./ashrae-formulas-corrected-new');

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_SCENARIOS = {
  // Scenario 1: Typical workday - should show SETBACK
  workday_cooling: {
    name: 'Typical Workday - Cooling',
    inputs: {
      floor_area: 2000,
      ceiling_height: 8,
      num_floors: 1,
      construction_type: 'wood_frame',
      construction_era: '1980_2000',
      insulation_quality: 'average',
      window_type: 'double_pane',
      desired_temp: 72,
      outdoor_temp: 85,
      absence_duration: 8,
      absence_start_time: '8:00 AM',
      monthly_electric_bill: 150
    },
    expected: {
      action: 'SETBACK',
      tau_min: 2.5,
      tau_max: 4.5,
      breakeven_min: 6,
      breakeven_max: 12,
      should_save: true
    }
  },

  // Scenario 2: Short errand - should show MAINTAIN
  short_errand: {
    name: 'Short Errand (2 hours)',
    inputs: {
      floor_area: 2000,
      ceiling_height: 8,
      construction_type: 'wood_frame',
      insulation_quality: 'average',
      desired_temp: 72,
      outdoor_temp: 85,
      absence_duration: 2,
      absence_start_time: '2:00 PM'
    },
    expected: {
      action: 'MAINTAIN',
      should_save: false
    }
  },

  // Scenario 3: Weekend trip - should show SETBACK with higher savings
  weekend_trip: {
    name: 'Weekend Trip (48 hours)',
    inputs: {
      floor_area: 1800,
      ceiling_height: 8,
      construction_type: 'wood_frame',
      insulation_quality: 'average',
      desired_temp: 72,
      outdoor_temp: 90,
      absence_duration: 48,
      absence_start_time: '8:00 AM',
      monthly_electric_bill: 140
    },
    expected: {
      action: 'SETBACK',
      should_save: true,
      savings_min: 100 // Minimum annual savings expected
    }
  },

  // Scenario 4: Well-insulated, longer absence
  well_insulated_long: {
    name: 'Well-Insulated Home - 24hr Absence',
    inputs: {
      floor_area: 2200,
      ceiling_height: 8,
      insulation_quality: 'excellent',
      construction_era: 'after_2010',
      desired_temp: 72,
      outdoor_temp: 88,
      absence_duration: 24,
      absence_start_time: '8:00 AM'
    },
    expected: {
      action: 'SETBACK',
      tau_min: 4,
      tau_max: 8,
      should_save: true
    }
  },

  // Scenario 5: Poorly insulated - should save more
  poorly_insulated: {
    name: 'Poorly Insulated Home - 10hr Absence',
    inputs: {
      floor_area: 1500,
      ceiling_height: 8,
      insulation_quality: 'poor',
      construction_era: 'before_1980',
      desired_temp: 72,
      outdoor_temp: 85,
      absence_duration: 10,
      absence_start_time: '8:00 AM',
      monthly_electric_bill: 160
    },
    expected: {
      action: 'SETBACK',
      tau_min: 1.5,
      tau_max: 3.5,
      should_save: true
    }
  },

  // Scenario 6: Heating mode - winter
  heating_winter: {
    name: 'Heating Mode - Winter Workday',
    inputs: {
      floor_area: 2000,
      ceiling_height: 8,
      construction_type: 'wood_frame',
      insulation_quality: 'good',
      desired_temp: 68,
      outdoor_temp: 25,
      absence_duration: 9,
      absence_start_time: '8:00 AM'
    },
    expected: {
      action: 'SETBACK', // Should setback in heating too
      should_save: true
    }
  },

  // Scenario 7: Large home, high ceilings
  large_home: {
    name: 'Large Home with High Ceilings',
    inputs: {
      floor_area: 3500,
      ceiling_height: 10,
      num_floors: 2,
      construction_type: 'brick',
      insulation_quality: 'good',
      desired_temp: 72,
      outdoor_temp: 88,
      absence_duration: 10,
      absence_start_time: '8:00 AM'
    },
    expected: {
      action: 'SETBACK',
      tau_min: 4,
      tau_max: 8,
      should_save: true
    }
  },

  // Scenario 8: Small apartment
  small_apartment: {
    name: 'Small Apartment - 8hr Workday',
    inputs: {
      floor_area: 800,
      ceiling_height: 8,
      construction_type: 'concrete',
      insulation_quality: 'average',
      desired_temp: 74,
      outdoor_temp: 86,
      absence_duration: 8,
      absence_start_time: '9:00 AM'
    },
    expected: {
      action: 'SETBACK',
      should_save: true
    }
  }
};

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     ThermalIQ Physics Engine - Comprehensive Test Suite       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const [key, scenario] of Object.entries(TEST_SCENARIOS)) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST: ${scenario.name}`);
    console.log('='.repeat(70));

    try {
      const result = await analyzeThermalStrategy(scenario.inputs);
      const validation = validateResult(result, scenario.expected);

      // Display results
      console.log('\n📊 RESULTS:');
      console.log('─'.repeat(70));
      console.log(`Action:              ${result.recommendation.action}`);
      console.log(`Desired Temp:        ${result.recommendation.temperature}°F`);
      console.log(`Setback Temp:        ${result.recommendation.setback_temp}°F`);
      console.log(`Time Constant:       ${result.building_physics.thermal_time_constant_hours} hours`);
      console.log(`Break-Even Time:     ${result.building_physics.break_even_time_hours} hours`);
      console.log(`Absence Duration:    ${scenario.inputs.absence_duration} hours`);
      
      if (result.recommendation.action === 'SETBACK') {
        console.log(`\n💰 SAVINGS:`);
        console.log(`Per Occurrence:      $${result.savings.cost_saved_per_occurrence}`);
        console.log(`Monthly:             $${result.savings.cost_saved_monthly}`);
        console.log(`Annual:              $${result.savings.cost_saved_annual}`);
        console.log(`Percentage Saved:    ${result.savings.percent_saved}%`);
        console.log(`\n⏰ SCHEDULE:`);
        console.log(`Restart Time:        ${result.recommendation.restart_time}`);
        console.log(`Recovery Time:       ${result.recommendation.recovery_time} hours`);
      } else {
        console.log(`\nℹ️  Reason: ${result.recommendation.reason}`);
      }

      // Validation
      console.log('\n✓ VALIDATION:');
      console.log('─'.repeat(70));
      
      let testPassed = true;
      for (const [check, status] of Object.entries(validation)) {
        const icon = status.passed ? '✅' : '❌';
        console.log(`${icon} ${check}: ${status.message}`);
        if (!status.passed) testPassed = false;
      }

      if (testPassed) {
        console.log('\n✅ TEST PASSED');
        passed++;
      } else {
        console.log('\n❌ TEST FAILED');
        failed++;
      }

      results.push({
        name: scenario.name,
        passed: testPassed,
        result,
        validation
      });

    } catch (error) {
      console.log(`\n❌ TEST FAILED WITH ERROR: ${error.message}`);
      console.log(error.stack);
      failed++;
      results.push({
        name: scenario.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total Tests:     ${passed + failed}`);
  console.log(`✅ Passed:       ${passed}`);
  console.log(`❌ Failed:       ${failed}`);
  console.log(`Success Rate:    ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('═'.repeat(70));

  // Detailed failure analysis
  if (failed > 0) {
    console.log('\n⚠️  FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n• ${r.name}`);
      if (r.error) {
        console.log(`  Error: ${r.error}`);
      } else {
        Object.entries(r.validation).forEach(([check, status]) => {
          if (!status.passed) {
            console.log(`  ❌ ${check}: ${status.message}`);
          }
        });
      }
    });
  }

  return { passed, failed, results };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateResult(result, expected) {
  const validation = {};

  // Check action
  validation['Action Match'] = {
    passed: result.recommendation.action === expected.action,
    message: `Expected: ${expected.action}, Got: ${result.recommendation.action}`
  };

  // Check thermal time constant range
  if (expected.tau_min && expected.tau_max) {
    const tau = parseFloat(result.building_physics.thermal_time_constant_hours);
    validation['Time Constant Range'] = {
      passed: tau >= expected.tau_min && tau <= expected.tau_max,
      message: `Expected: ${expected.tau_min}-${expected.tau_max} hrs, Got: ${tau.toFixed(2)} hrs`
    };
  }

  // Check break-even time range
  if (expected.breakeven_min && expected.breakeven_max) {
    const breakeven = parseFloat(result.building_physics.break_even_time_hours);
    validation['Break-Even Range'] = {
      passed: breakeven >= expected.breakeven_min && breakeven <= expected.breakeven_max,
      message: `Expected: ${expected.breakeven_min}-${expected.breakeven_max} hrs, Got: ${breakeven.toFixed(2)} hrs`
    };
  }

  // Check savings
  if (expected.should_save !== undefined) {
    const hasSavings = parseFloat(result.savings.cost_saved_annual || 0) > 0;
    validation['Has Savings'] = {
      passed: hasSavings === expected.should_save,
      message: expected.should_save 
        ? `Should have savings, Got: $${result.savings.cost_saved_annual || 0}`
        : `Should not have savings, Got: $${result.savings.cost_saved_annual || 0}`
    };
  }

  // Check minimum savings amount
  if (expected.savings_min) {
    const annualSavings = parseFloat(result.savings.cost_saved_annual || 0);
    validation['Minimum Savings'] = {
      passed: annualSavings >= expected.savings_min,
      message: `Expected: ≥$${expected.savings_min}, Got: $${annualSavings}`
    };
  }

  // Physical constraints
  const tau = parseFloat(result.building_physics.thermal_time_constant_hours);
  validation['Realistic Time Constant'] = {
    passed: tau > 0.5 && tau < 12,
    message: `Should be 0.5-12 hrs, Got: ${tau.toFixed(2)} hrs`
  };

  // Break-even should be 2.5x time constant
  const breakeven = parseFloat(result.building_physics.break_even_time_hours);
  const expectedBreakeven = tau * 2.5;
  validation['Break-Even Calculation'] = {
    passed: Math.abs(breakeven - expectedBreakeven) < 0.1,
    message: `Expected: ${expectedBreakeven.toFixed(2)} hrs, Got: ${breakeven.toFixed(2)} hrs`
  };

  // If SETBACK, must have restart time
  if (result.recommendation.action === 'SETBACK') {
    validation['Has Restart Time'] = {
      passed: result.recommendation.restart_time !== null,
      message: result.recommendation.restart_time 
        ? `Restart: ${result.recommendation.restart_time}` 
        : 'Missing restart time'
    };

    // Recovery time should be reasonable
    const recovery = parseFloat(result.recommendation.recovery_time || 0);
    validation['Reasonable Recovery'] = {
      passed: recovery > 0 && recovery < 5,
      message: `Should be 0-5 hrs, Got: ${recovery.toFixed(2)} hrs`
    };
  }

  return validation;
}

// ============================================================================
// UNIT TESTS
// ============================================================================

function runUnitTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         UNIT TESTS                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Building Envelope Calculations
  console.log('TEST: Building Envelope Calculations');
  try {
    const envelope = new BuildingEnvelope({
      floor_area: 2000,
      ceiling_height: 8,
      num_floors: 1,
      window_area_percent: 15,
      num_exterior_doors: 2,
      insulation_quality: 'average',
      construction_era: '1980_2000',
      window_type: 'double_pane'
    });

    const volume = envelope.components.volume;
    const total_area = envelope.components.total_area;
    const U_eff = envelope.getEffectiveUFactor();

    console.log(`  Volume: ${volume} cu ft`);
    console.log(`  Total Area: ${total_area.toFixed(0)} sq ft`);
    console.log(`  U-effective: ${U_eff.toFixed(4)}`);

    if (volume === 16000 && total_area > 5000 && U_eff > 0.05 && U_eff < 0.2) {
      console.log('  ✅ PASSED\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Values out of expected range\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 2: Thermal Time Constant Calculation
  console.log('TEST: Thermal Time Constant');
  try {
    const envelope = new BuildingEnvelope({
      floor_area: 2000,
      ceiling_height: 8,
      num_floors: 1,
      construction_type: 'wood_frame',
      insulation_quality: 'average',
      construction_era: '1980_2000',
      window_type: 'double_pane'
    });

    const thermalMass = new ThermalMassModel({
      construction_type: 'wood_frame'
    }, envelope);

    const tau = thermalMass.getTimeConstant();
    console.log(`  Time Constant: ${tau.toFixed(2)} hours`);

    if (tau > 2 && tau < 5) {
      console.log('  ✅ PASSED\n');
      passed++;
    } else {
      console.log(`  ❌ FAILED: Expected 2-5 hrs, got ${tau.toFixed(2)} hrs\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error.message}\n`);
    failed++;
  }

  console.log(`Unit Tests: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const unitResults = runUnitTests();
  const integrationResults = await runAllTests();

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      OVERALL RESULTS                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Unit Tests:        ${unitResults.passed}/${unitResults.passed + unitResults.failed} passed`);
  console.log(`Integration Tests: ${integrationResults.passed}/${integrationResults.passed + integrationResults.failed} passed`);
  console.log(`Total:             ${unitResults.passed + integrationResults.passed}/${unitResults.passed + unitResults.failed + integrationResults.passed + integrationResults.failed} passed`);
  console.log('═'.repeat(70));

  const allPassed = (unitResults.failed + integrationResults.failed) === 0;
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Physics engine is working correctly.\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review output above for details.\n');
  }

  return allPassed ? 0 : 1;
}

// Run tests
if (typeof require !== 'undefined' && require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, runUnitTests, validateResult };
