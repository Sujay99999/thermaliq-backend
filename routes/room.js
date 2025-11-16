const express = require('express');
const router = express.Router();
const { processRoomScan } = require('../controllers/roomController');

/**
 * POST /api/process-room
 * 
 * Process room scan data from AR scanning
 * 
 * Request body:
 * {
 *   dimensions: { width, height, depth },
 *   surfaces: [],
 *   openings: [],
 *   rawData: {}
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     processedDimensions: {},
 *     volume: number,
 *     surfaceArea: number,
 *     ...other processed data
 *   }
 * }
 */
router.post('/', async (req, res, next) => {
  try {
    const roomData = req.body;

    if (!roomData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'roomData is required'
        }
      });
    }

    // Process room scan data
    const result = await processRoomScan(roomData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

