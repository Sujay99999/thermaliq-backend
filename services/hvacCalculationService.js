/**
 * HVAC Calculation Service
 * 
 * This service contains the physics-based calculations for HVAC optimization.
 * Uses ASHRAE-compliant formulas from ashrae-formulas-corrected-new.js
 */

const { analyzeThermalStrategy } = require('../ashrae-formulas-corrected-new');
const { calculateRebateEligibility } = require('./rebateEligibilityService');

/**
 * Calculate HVAC strategy based on building properties and user preferences
 * 
 * @param {Object} formData - User input data from React Native app
 * @param {Object} roomData - Room scan data (optional)
 * @returns {Object} Calculation results in format expected by React Native app
 */
async function calculateHVACStrategy(formData, roomData = {}) {
  // Extract form data with defaults
  const {
    zipCode = '02134',
    outdoorTemp = 85,
    desiredTemp = 72,
    absenceDuration = 8,
    floorArea = 2000,
    insulationQuality = 'average',
    constructionType = 'wood_frame',
    constructionEra = '2000_2010',
    utilityRate = 0.12, // $/kWh default
    absenceStartTime = '8:00 AM',
    absenceEndTime = '5:00 PM',
    homeType = 'single-family',
    humidity = 50, // Default humidity if not provided
    seerRating = 14, // Default SEER rating
    windowType = 'double_pane',
    windowAreaPercent = 15,
    numExteriorDoors = 2,
    ceilingHeight = 8,
    numFloors = 1,
    monthlyElectricBill = null,
    monthlyKwhUsage = null
  } = formData;

  // Map form data to ASHRAE input format
  const ashraeInputs = mapFormDataToASHRAEInputs({
    zipCode,
    outdoorTemp,
    desiredTemp,
    absenceDuration,
    floorArea,
    insulationQuality,
    constructionType,
    constructionEra,
    utilityRate,
    absenceStartTime,
    absenceEndTime,
    homeType,
    humidity,
    seerRating,
    windowType,
    windowAreaPercent,
    numExteriorDoors,
    ceilingHeight,
    numFloors,
    monthlyElectricBill,
    monthlyKwhUsage,
    roomData
  });

  // Call ASHRAE analysis function
  const ashraeResult = await analyzeThermalStrategy(ashraeInputs);

  // Map ASHRAE results to React Native app format
  const result = mapASHRAEResultsToAppFormat(ashraeResult, {
    absenceEndTime,
    absenceStartTime
  });

  // Calculate rebate eligibility
  const eligibility = calculateRebateEligibility(formData);
  
  // Add eligibility to result
  result.rebateEligibility = eligibility;

  return result;
}

/**
 * Map form data from React Native app to ASHRAE input format
 * 
 * @param {Object} formData - Form data from React Native app
 * @returns {Object} ASHRAE-compatible input object
 */
function mapFormDataToASHRAEInputs(formData) {
  const {
    zipCode,
    outdoorTemp,
    desiredTemp,
    absenceDuration,
    floorArea,
    insulationQuality,
    constructionType,
    constructionEra,
    utilityRate,
    absenceStartTime,
    absenceEndTime,
    homeType,
    humidity,
    seerRating,
    windowType,
    windowAreaPercent,
    numExteriorDoors,
    ceilingHeight,
    numFloors,
    monthlyElectricBill,
    monthlyKwhUsage,
    roomData
  } = formData;

  // The corrected formulas handle insulation_quality directly, no need to map to R-value

  // Map window type
  const windowTypeMap = {
    'single_pane': 'single_pane',
    'double_pane': 'double_pane',
    'triple_pane': 'triple_pane',
    'low_e': 'low_e_double',
    'low_e_double': 'low_e_double'
  };

  // Use room scan data if available, otherwise use form data
  const effectiveFloorArea = roomData?.processedDimensions?.floorArea 
    ? roomData.processedDimensions.floorArea 
    : floorArea;

  // Use room scan ceiling height if available
  const effectiveCeilingHeight = roomData?.processedDimensions?.height 
    ? roomData.processedDimensions.height 
    : (ceilingHeight || 8);

  // Use room scan window area percentage if available
  const effectiveWindowAreaPercent = roomData?.windowAreaPercent 
    ? roomData.windowAreaPercent 
    : (windowAreaPercent || 15);

  // Use room scan door count if available
  const effectiveNumDoors = roomData?.openingCount?.doors !== undefined
    ? roomData.openingCount.doors
    : (numExteriorDoors || 2);

  // Build ASHRAE input object (corrected formulas format)
  return {
    zip_code: zipCode,
    floor_area: effectiveFloorArea,
    ceiling_height: effectiveCeilingHeight,
    num_floors: numFloors || 1,
    construction_type: constructionType,
    construction_era: constructionEra,
    insulation_quality: insulationQuality, // Corrected formulas use this directly
    window_type: windowTypeMap[windowType] || 'double_pane',
    window_area_percent: effectiveWindowAreaPercent,
    num_exterior_doors: effectiveNumDoors,
    hvac_type: 'central_ac', // Default, can be enhanced
    hvac_age: '10_15', // Default
    seer_rating: seerRating || 14,
    desired_temp: desiredTemp,
    outdoor_temp: outdoorTemp,
    humidity: humidity || 50,
    absence_duration: absenceDuration,
    absence_start_time: absenceStartTime,
    days_per_week: 5, // Default
    weeks_per_year: 52, // Default
    electricity_rate_manual: utilityRate,
    monthly_electric_bill: monthlyElectricBill,
    monthly_kwh_usage: monthlyKwhUsage
  };
}

/**
 * Map ASHRAE results to React Native app format
 * 
 * @param {Object} ashraeResult - Results from ASHRAE analysis
 * @param {Object} timeInfo - Time information for formatting
 * @returns {Object} Results in format expected by React Native app
 */
function mapASHRAEResultsToAppFormat(ashraeResult, timeInfo) {
  const { recommendation, savings, building_physics } = ashraeResult;
  const { absenceEndTime, absenceStartTime } = timeInfo;

  // Extract recovery time in minutes
  const recoveryTimeMinutes = recommendation.recovery_time 
    ? parseFloat(recommendation.recovery_time) * 60 
    : 0;

  // Format restart time (use from recommendation if available, otherwise calculate)
  let restartTime = recommendation.restart_time || absenceEndTime;
  if (typeof restartTime === 'number') {
    // Convert hours to time string
    restartTime = formatTimeFromHours(restartTime, absenceStartTime);
  }

  // Extract savings values (corrected formulas use cost_saved_per_occurrence)
  const savingsPerDay = parseFloat(savings.cost_saved_per_occurrence || savings.cost_saved_daily || 0);
  const savingsPerMonth = parseFloat(savings.cost_saved_monthly || 0);
  const savingsPerYear = parseFloat(savings.cost_saved_annual || 0);
  const energySavedKwh = parseFloat(savings.energy_saved_kwh || 0);
  const percentSaved = parseFloat(savings.percent_saved || 0);

  // Get desired temp from inputs or recommendation
  const desiredTemp = ashraeResult.inputs_used?.desired_temp || 
                      recommendation.temperature || 
                      72;

  return {
    action: recommendation.action || 'MAINTAIN',
    setbackTemp: recommendation.setback_temp || desiredTemp,
    desiredTemp: desiredTemp,
    outdoorTemp: ashraeResult.inputs_used?.outdoor_temp || 85,
    restartTime: restartTime,
    returnTime: recommendation.return_time || absenceEndTime,
    recoveryTime: Math.round(recoveryTimeMinutes),
    thermalTimeConstant: parseFloat(building_physics.thermal_time_constant_hours || 0),
    breakEvenTime: parseFloat(building_physics.break_even_time_hours || 0),
    savingsPerDay: savingsPerDay,
    savingsPerMonth: savingsPerMonth,
    savingsPerYear: savingsPerYear,
    energySavedKwh: energySavedKwh,
    percentSaved: percentSaved
  };
}

/**
 * Format time from hours offset
 * 
 * @param {number} hoursOffset - Hours offset from start time
 * @param {string} startTime - Start time string (e.g., '8:00 AM')
 * @returns {string} Formatted time string
 */
function formatTimeFromHours(hoursOffset, startTime) {
  // Parse start time
  const [timePart, period] = startTime.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  // Add offset
  const totalMinutes = (hours * 60 + minutes) + (hoursOffset * 60);
  const finalHours = Math.floor(totalMinutes / 60) % 24;
  const finalMinutes = totalMinutes % 60;
  
  // Format
  const periodFinal = finalHours >= 12 ? 'PM' : 'AM';
  const hours12 = finalHours % 12 || 12;
  
  return `${hours12}:${Math.round(finalMinutes).toString().padStart(2, '0')} ${periodFinal}`;
}

module.exports = {
  calculateHVACStrategy
};

