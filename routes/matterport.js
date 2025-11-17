const express = require('express');
const router = express.Router();
const { extractMeasurements, validateModelSid } = require('../services/matterportService');

/**
 * POST /api/matterport/extract-measurements
 * 
 * Extract measurements from a Matterport scan using Model SID
 * 
 * Request body:
 * {
 *   modelSid: string (Matterport Model SID / Space ID)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     floorArea: number (sq ft),
 *     ceilingHeight: number (ft),
 *     roomDimensions: { width, height, depth },
 *     windowArea: number (sq ft),
 *     doorCount: number,
 *     windowAreaPercent: number
 *   }
 * }
 */
router.post('/extract-measurements', async (req, res, next) => {
  try {
    const { modelSid } = req.body;

    // Validate request
    if (!modelSid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Model SID is required',
        },
      });
    }

    // Validate Model SID format
    if (!validateModelSid(modelSid)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Model SID format',
        },
      });
    }

    // Extract measurements from Matterport
    const result = await extractMeasurements(modelSid);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to extract measurements from Matterport',
        },
      });
    }

    // Return formatted response for frontend
    res.json({
      success: true,
      data: {
        floorArea: result.data.floorArea,
        ceilingHeight: result.data.ceilingHeight,
        roomDimensions: result.data.roomDimensions,
        windowArea: result.data.windowArea,
        doorCount: result.data.doorCount,
        windowAreaPercent: result.data.windowAreaPercent,
        wallArea: result.data.wallArea,
        netWallArea: result.data.netWallArea,
        roofArea: result.data.roofArea,
        totalDoorArea: result.data.totalDoorArea,
        roomVolume: result.data.roomVolume,
        // Include note if present (for fallback data)
        note: result.data.note,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

