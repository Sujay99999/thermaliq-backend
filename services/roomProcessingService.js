/**
 * Room Processing Service
 * 
 * This service processes room scan data from AR scanning (expo-roomplan)
 * Enhanced to extract data useful for ASHRAE calculations
 */

/**
 * Process room scan data and extract useful information
 * 
 * @param {Object} roomData - Raw room scan data from expo-roomplan
 * @returns {Object} Processed room data with dimensions and building characteristics
 */
async function processRoomScan(roomData) {
  const {
    dimensions = {},
    surfaces = [],
    openings = [],
    rawData = {}
  } = roomData;

  // Extract dimensions (assuming dimensions are in feet)
  const { width, height, depth } = dimensions;

  // Calculate volume if dimensions are available
  let volume = null;
  if (width && height && depth) {
    volume = width * height * depth;
  }

  // Calculate total surface area from surfaces
  let totalSurfaceArea = 0;
  let wallArea = 0;
  let floorArea = 0;
  let ceilingArea = 0;
  
  if (surfaces && surfaces.length > 0) {
    surfaces.forEach(surface => {
      const area = surface.area || 0;
      totalSurfaceArea += area;
      
      // Categorize surfaces by type if available
      const surfaceType = (surface.type || surface.category || '').toLowerCase();
      if (surfaceType.includes('wall')) {
        wallArea += area;
      } else if (surfaceType.includes('floor')) {
        floorArea += area;
      } else if (surfaceType.includes('ceiling')) {
        ceilingArea += area;
      }
    });
  }

  // Count and categorize openings (doors, windows)
  const doorCount = openings.filter(opening => {
    const type = (opening.type || '').toLowerCase();
    return type.includes('door');
  }).length;
  
  const windowCount = openings.filter(opening => {
    const type = (opening.type || '').toLowerCase();
    return type.includes('window');
  }).length;

  // Calculate window area from openings
  let windowArea = 0;
  openings.forEach(opening => {
    const type = (opening.type || '').toLowerCase();
    if (type.includes('window')) {
      windowArea += opening.area || 0;
    }
  });

  // Extract floor area - prefer from dimensions, fallback to surface calculation
  let calculatedFloorArea = null;
  if (width && depth) {
    calculatedFloorArea = width * depth;
  } else if (floorArea > 0) {
    calculatedFloorArea = floorArea;
  }

  // Estimate ceiling height from dimensions or surfaces
  let estimatedCeilingHeight = height || null;
  if (!estimatedCeilingHeight && surfaces.length > 0) {
    // Try to estimate from wall surfaces
    const wallSurfaces = surfaces.filter(s => {
      const type = (s.type || s.category || '').toLowerCase();
      return type.includes('wall');
    });
    if (wallSurfaces.length > 0 && calculatedFloorArea) {
      // Rough estimate: wall area / perimeter / 2
      estimatedCeilingHeight = wallArea / (2 * (width + depth)) || null;
    }
  }

  // Calculate window area percentage if we have wall area
  let windowAreaPercent = null;
  if (wallArea > 0 && windowArea > 0) {
    windowAreaPercent = (windowArea / wallArea) * 100;
  }

  return {
    processedDimensions: {
      width: width || null,
      height: estimatedCeilingHeight || height || null,
      depth: depth || null,
      volume: volume || null,
      floorArea: calculatedFloorArea || null
    },
    surfaceArea: totalSurfaceArea || null,
    surfaceBreakdown: {
      wallArea: wallArea || null,
      floorArea: floorArea || null,
      ceilingArea: ceilingArea || null,
      totalArea: totalSurfaceArea || null
    },
    openingCount: {
      doors: doorCount,
      windows: windowCount,
      total: openings.length
    },
    windowArea: windowArea || null,
    windowAreaPercent: windowAreaPercent || null,
    metadata: {
      surfaceCount: surfaces.length,
      hasCompleteDimensions: !!(width && height && depth),
      processedAt: new Date().toISOString(),
      dataQuality: determineDataQuality(dimensions, surfaces, openings)
    },
    rawData: rawData // Keep raw data for reference
  };
}

/**
 * Determine data quality based on available information
 * 
 * @param {Object} dimensions - Room dimensions
 * @param {Array} surfaces - Surface data
 * @param {Array} openings - Opening data
 * @returns {string} Data quality rating
 */
function determineDataQuality(dimensions, surfaces, openings) {
  const hasDimensions = !!(dimensions.width && dimensions.height && dimensions.depth);
  const hasSurfaces = surfaces && surfaces.length > 0;
  const hasOpenings = openings && openings.length > 0;

  if (hasDimensions && hasSurfaces && hasOpenings) {
    return 'excellent';
  } else if (hasDimensions && (hasSurfaces || hasOpenings)) {
    return 'good';
  } else if (hasDimensions || hasSurfaces) {
    return 'fair';
  } else {
    return 'poor';
  }
}

module.exports = {
  processRoomScan
};

