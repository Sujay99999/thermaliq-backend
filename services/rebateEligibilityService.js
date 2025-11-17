/**
 * Rebate Eligibility Service
 * 
 * Determines Federal and State HVAC rebate eligibility based on user inputs
 */

/**
 * Get state from ZIP code
 * @param {string} zipCode - ZIP code
 * @returns {string} State abbreviation
 */
function getStateFromZip(zipCode) {
  if (!zipCode) return null;
  
  const prefix = parseInt(String(zipCode).substring(0, 2));
  
  // ZIP code to state mapping
  if (prefix >= 1 && prefix <= 2) return 'MA'; // Massachusetts
  if (prefix >= 3 && prefix <= 14) return 'NY'; // New York
  if (prefix >= 15 && prefix <= 19) return 'PA'; // Pennsylvania
  if (prefix >= 20 && prefix <= 22) return 'VA';
  if (prefix >= 30 && prefix <= 31) return 'GA';
  if (prefix >= 32 && prefix <= 34) return 'FL'; // Florida
  if (prefix >= 60 && prefix <= 62) return 'IL';
  if (prefix >= 75 && prefix <= 79) return 'TX'; // Texas
  if (prefix >= 80 && prefix <= 81) return 'CO';
  if (prefix >= 85 && prefix <= 86) return 'AZ';
  if (prefix >= 90 && prefix <= 96) return 'CA'; // California
  if (prefix >= 97 && prefix <= 97) return 'OR'; // Oregon (97000-97999)
  if (prefix >= 98 && prefix <= 99) return 'WA'; // Washington
  
  return null;
}

/**
 * States with active HVAC rebate programs
 */
const ELIGIBLE_STATES = {
  'CA': {
    name: 'California',
    program: 'TECH Clean California',
    eligibility: true
  },
  'NY': {
    name: 'New York',
    program: 'NYS Clean Heat',
    eligibility: true
  },
  'MA': {
    name: 'Massachusetts',
    program: 'Mass Save',
    eligibility: true
  },
  'OR': {
    name: 'Oregon',
    program: 'Energy Trust Oregon',
    eligibility: true
  },
  'TX': {
    name: 'Texas',
    program: 'Utility rebate programs',
    eligibility: true
  },
  'FL': {
    name: 'Florida',
    program: 'Utility rebates (FPL, Duke, etc.)',
    eligibility: true
  },
  'PA': {
    name: 'Pennsylvania',
    program: 'PECO / Duquesne Light rebates',
    eligibility: true
  }
};

/**
 * Check if equipment qualifies for Federal rebate
 * @param {Array} equipmentSelected - Array of selected equipment IDs
 * @param {string} equipmentMeetsEfficiency - Whether equipment meets efficiency criteria
 * @returns {boolean}
 */
function qualifiesForFederalRebate(equipmentSelected, equipmentMeetsEfficiency) {
  if (!equipmentSelected || equipmentSelected.length === 0) {
    return false;
  }
  
  // Qualifying equipment types
  const qualifyingEquipment = [
    'heat_pump',
    'heat_pump_water_heater',
    'central_ac',
    'furnace',
    'weatherization'
  ];
  
  // Check if user selected any qualifying equipment
  const hasQualifyingEquipment = equipmentSelected.some(eq => 
    qualifyingEquipment.includes(eq)
  );
  
  if (!hasQualifyingEquipment) {
    return false;
  }
  
  // Check efficiency criteria
  // If user said "yes" or "not_sure", assume they qualify (optimistic)
  // If "no", they don't qualify
  if (equipmentMeetsEfficiency === 'no') {
    return false;
  }
  
  // Default to true if equipment is selected and efficiency is yes/not_sure/undefined
  return true;
}

/**
 * Calculate rebate eligibility
 * @param {Object} formData - User form data
 * @returns {Object} Eligibility results
 */
function calculateRebateEligibility(formData) {
  if (!formData) {
    return {
      federalEligibility: false,
      federalReason: 'No form data provided',
      stateEligibility: false,
      stateReason: 'No form data provided',
      state: 'Unknown',
    };
  }

  const {
    zipCode,
    equipmentSelected = [],
    equipmentMeetsEfficiency,
    ownsHome,
    primaryResidence,
    propertyType
  } = formData;
  
  // Federal Eligibility
  const federalEligible = qualifiesForFederalRebate(equipmentSelected, equipmentMeetsEfficiency);
  
  let federalReason = '';
  if (federalEligible) {
    const equipmentNames = equipmentSelected
      .filter(eq => ['heat_pump', 'heat_pump_water_heater', 'central_ac', 'furnace'].includes(eq))
      .map(eq => {
        const names = {
          'heat_pump': 'Heat Pump',
          'heat_pump_water_heater': 'Heat Pump Water Heater',
          'central_ac': 'Central AC',
          'furnace': 'Furnace'
        };
        return names[eq] || eq;
      });
    
    if (equipmentNames.length > 0) {
      federalReason = `${equipmentNames.join(' or ')} qualifies for Energy Efficient Home Improvement Credit (IRC 25C)`;
    } else if (equipmentSelected.includes('weatherization')) {
      federalReason = 'Weatherization/Insulation upgrades qualify for Energy Efficient Home Improvement Credit (IRC 25C)';
    } else {
      federalReason = 'Selected equipment qualifies for Federal tax credits';
    }
  } else {
    if (equipmentSelected.length === 0) {
      federalReason = 'No qualifying equipment selected. Select heat pump, central AC, furnace, or weatherization to qualify.';
    } else if (equipmentMeetsEfficiency === 'no') {
      federalReason = 'Equipment does not meet IRS efficiency criteria (ENERGY STAR or program requirements)';
    } else {
      federalReason = 'Selected equipment does not qualify for Federal rebates';
    }
  }
  
  // State Eligibility
  const state = getStateFromZip(zipCode);
  let stateEligible = false;
  let stateReason = '';
  
  if (state && ELIGIBLE_STATES[state]) {
    stateEligible = true;
    stateReason = `${ELIGIBLE_STATES[state].name} has active rebate program: ${ELIGIBLE_STATES[state].program}`;
  } else {
    stateEligible = false;
    if (state) {
      stateReason = `${state} does not have an active statewide HVAC rebate program`;
    } else {
      stateReason = 'No active statewide HVAC rebate program for your location';
    }
  }
  
  return {
    federalEligibility: federalEligible,
    federalReason: federalReason,
    stateEligibility: stateEligible,
    stateReason: stateReason,
    state: state || 'Unknown',
    federalDetails: {
      creditPercent: 30,
      heatPumpCap: 2000,
      annualCap: 3200,
      validThrough: '12/31/2025',
      form: 'IRS Form 5695'
    }
  };
}

module.exports = {
  calculateRebateEligibility,
  getStateFromZip
};

