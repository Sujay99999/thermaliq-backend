const { processRoomScan: processRoom } = require('../services/roomProcessingService');

/**
 * Process room scan data from AR scanning
 * 
 * @param {Object} roomData - Room scan data from expo-roomplan
 * @returns {Object} Processed room data
 */
async function processRoomScan(roomData) {
  try {
    // Validate room data
    if (!roomData) {
      throw new Error('roomData is required');
    }

    // Process the room scan data
    const result = await processRoom(roomData);

    return result;
  } catch (error) {
    console.error('Error in processRoomScan controller:', error);
    throw error;
  }
}

module.exports = {
  processRoomScan
};

