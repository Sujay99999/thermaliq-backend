const express = require('express');
const router = express.Router();
const { calculateHVACStrategy } = require('../controllers/calculateController');

/**
 * POST /api/calculate
 * 
 * Calculate HVAC strategy based on form data and room scan data
 * 
 * Request body:
 * {
 *   formData: {
 *     zipCode: string,
 *     outdoorTemp: number,
 *     homeType: string,
 *     floorArea: number,
 *     constructionType: string,
 *     constructionEra: string,
 *     insulationQuality: string,
 *     desiredTemp: number,
 *     absenceStartTime: string,
 *     absenceEndTime: string,
 *     absenceDuration: number,
 *     utilityRate: number,
 *     ...other form fields
 *   },
 *   roomData: {
 *     dimensions: { width, height, depth },
 *     surfaces: [],
 *     openings: [],
 *     rawData: {}
 *   }
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     action: 'SETBACK' | 'MAINTAIN',
 *     setbackTemp: number,
 *     desiredTemp: number,
 *     outdoorTemp: number,
 *     restartTime: string,
 *     returnTime: string,
 *     recoveryTime: number,
 *     thermalTimeConstant: number,
 *     breakEvenTime: number,
 *     savingsPerDay: number,
 *     savingsPerMonth: number,
 *     savingsPerYear: number,
 *     energySavedKwh: number,
 *     percentSaved: number
 *   }
 * }
 */
router.post('/', async (req, res, next) => {
  try {
    const { formData, roomData } = req.body;

    // Validate required fields
    if (!formData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'formData is required'
        }
      });
    }

    // Validate required form data fields
    const requiredFields = ['outdoorTemp', 'desiredTemp', 'absenceDuration', 'floorArea'];
    const missingFields = requiredFields.filter(field => {
      const value = formData[field];
      // Check if field is missing, null, undefined, empty string, or not a valid number
      return value === undefined || 
             value === null || 
             value === '' || 
             (typeof value === 'number' && isNaN(value)) ||
             (typeof value === 'string' && (value.trim() === '' || isNaN(Number(value))));
    });
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Missing required fields: ${missingFields.join(', ')}`,
          received: {
            outdoorTemp: formData.outdoorTemp,
            desiredTemp: formData.desiredTemp,
            absenceDuration: formData.absenceDuration,
            floorArea: formData.floorArea
          }
        }
      });
    }
    
    // Ensure numeric fields are actually numbers
    const numericFields = ['outdoorTemp', 'desiredTemp', 'absenceDuration', 'floorArea'];
    numericFields.forEach(field => {
      if (typeof formData[field] === 'string') {
        formData[field] = Number(formData[field]);
      }
    });

    // Calculate HVAC strategy
    const result = await calculateHVACStrategy(formData, roomData || {});

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

