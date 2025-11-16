# Test Results - Corrected ASHRAE Formulas

**Date:** November 16, 2025  
**Test File:** `test-physics-engine.js`  
**Formulas Used:** `ashrae-formulas-corrected.js`

## Summary

✅ **Service Updated:** HVAC calculation service now uses `ashrae-formulas-corrected.js`  
❌ **Test Results:** 1/10 tests passed (1 unit test, 0 integration tests)

## Issue Identified

The corrected formulas are producing **unrealistically high thermal time constants** (76-1156 hours instead of expected 2-12 hours). This causes all scenarios to recommend "MAINTAIN" instead of "SETBACK" because the break-even times exceed typical absence durations.

### Root Cause

The thermal capacitance calculation in the corrected formulas:
```javascript
const effective_VHC = CONSTRUCTION_THERMAL_MASS[construction_type] || 2.5;
const C_total = effective_VHC * volume;
```

This multiplies the effective VHC (2.5-12.0 Btu/(ft³·°F)) by the entire building volume, resulting in very large thermal capacitances. When combined with thermal resistance, this produces time constants that are 10-100x higher than expected.

### Test Results Detail

**Unit Tests:**
- ✅ Building Envelope Calculations: PASSED
- ❌ Thermal Time Constant: FAILED (Expected 2-5 hrs, Got 76.45 hrs)

**Integration Tests (All Failed):**
1. ❌ Typical Workday - Cooling: Expected SETBACK, Got MAINTAIN (τ = 76.45 hrs)
2. ❌ Short Errand: Time constant too high (τ = 76.45 hrs)
3. ❌ Weekend Trip: Expected SETBACK, Got MAINTAIN (τ = 74.61 hrs)
4. ❌ Well-Insulated Home: Expected SETBACK, Got MAINTAIN (τ = 103.44 hrs)
5. ❌ Poorly Insulated Home: Expected SETBACK, Got MAINTAIN (τ = 57.90 hrs)
6. ❌ Heating Mode: Expected SETBACK, Got MAINTAIN (τ = 86.64 hrs)
7. ❌ Large Home: Expected SETBACK, Got MAINTAIN (τ = 1156.91 hrs)
8. ❌ Small Apartment: Expected SETBACK, Got MAINTAIN (τ = 287.54 hrs)

## What Was Updated

1. ✅ Changed import from `ashrae-formulas.js` to `ashrae-formulas-corrected.js`
2. ✅ Updated input mapping to use `insulation_quality` directly (not `r_value`)
3. ✅ Updated savings field mapping to handle `cost_saved_per_occurrence`
4. ✅ Added `hvac_age` parameter to inputs

## Recommendations

The corrected formulas appear to have an issue with the thermal capacitance calculation. The `CONSTRUCTION_THERMAL_MASS` values may need to be:
1. **Scaled down** (divided by a factor)
2. **Applied differently** (not multiplied by full volume)
3. **Re-calibrated** to match expected time constant ranges

The formulas are correctly structured but the thermal mass calculation needs adjustment to produce realistic time constants in the 2-12 hour range.

## Next Steps

1. Review the thermal capacitance calculation in `ashrae-formulas-corrected.js`
2. Adjust the `CONSTRUCTION_THERMAL_MASS` values or calculation method
3. Re-run tests to verify time constants are in expected range
4. Once fixed, the formulas should produce SETBACK recommendations for typical scenarios

