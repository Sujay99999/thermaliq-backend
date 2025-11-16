const { calculateHVACStrategy: calculateHVAC } = require('../services/hvacCalculationService');

/**
 * Calculate HVAC strategy based on form data and room scan data
 * 
 * @param {Object} formData - User input form data
 * @param {Object} roomData - Room scan data (optional)
 * @returns {Object} HVAC strategy calculation results
 */
async function calculateHVACStrategy(formData, roomData = {}) {
  try {
    // Validate required form data fields
    const requiredFields = [
      'outdoorTemp',
      'desiredTemp',
      'absenceDuration',
      'floorArea'
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Call the HVAC calculation service
    const result = await calculateHVAC(formData, roomData);

    return result;
  } catch (error) {
    console.error('Error in calculateHVACStrategy controller:', error);
    throw error;
  }
}

module.exports = {
  calculateHVACStrategy
};

