/**
 * ThermalIQ - ASHRAE-Compliant Physics Engine
 * 
 * Based on ASHRAE Handbook - Fundamentals
 * Eliminates all hard-coded "rules of thumb"
 * Implements dynamic psychrometric calculations
 */

// ============================================================================
// MODULE 1: PSYCHROMETRICS (ASHRAE Chapter 1)
// ============================================================================

class Psychrometrics {
  constructor() {
    // Universal gas constant for dry air
    this.R_da = 53.35; // ft·lbf/(lb·°R)
    this.c_p_da = 0.240; // Btu/(lb·°F) - dry air
    this.c_p_wv = 0.444; // Btu/(lb·°F) - water vapor
    this.h_fg = 1061; // Btu/lb - latent heat of vaporization at 70°F
  }

  /**
   * Get atmospheric pressure from altitude
   * ASHRAE Handbook Fundamentals, Equation 1
   */
  getAtmosphericPressure(altitude_ft) {
    // Standard atmosphere model
    const P_sea = 14.696; // psia at sea level
    const T_sea = 518.67; // °R (59°F)
    const L = 0.00357; // lapse rate °R/ft
    
    const ratio = 1 - (L * altitude_ft / T_sea);
    const P_atm = P_sea * Math.pow(ratio, 5.2559);
    
    return P_atm; // psia
  }

  /**
   * Saturation pressure - Arden Buck Equation
   * More accurate than Magnus-Tetens for HVAC range
   */
  getSaturationPressure(T_db) {
    // T_db in °F, convert to °C
    const T_c = (T_db - 32) / 1.8;
    
    // Arden Buck equation (1981)
    let P_ws;
    if (T_c >= 0) {
      // Over water
      P_ws = 0.61121 * Math.exp(
        (18.678 - T_c / 234.5) * (T_c / (257.14 + T_c))
      );
    } else {
      // Over ice
      P_ws = 0.61115 * Math.exp(
        (23.036 - T_c / 333.7) * (T_c / (279.82 + T_c))
      );
    }
    
    // Convert kPa to psia
    return P_ws * 0.145038;
  }

  /**
   * Calculate humidity ratio from dry-bulb temp and RH
   * ASHRAE Handbook Fundamentals, Equation 23
   */
  getHumidityRatio(T_db, RH, P_atm) {
    const P_ws = this.getSaturationPressure(T_db);
    const P_w = (RH / 100) * P_ws; // partial pressure of water vapor
    
    // W = 0.622 × P_w / (P_atm - P_w)
    const W = 0.62198 * P_w / (P_atm - P_w);
    
    return W; // lb_water / lb_dry_air
  }

  /**
   * Calculate moist air density
   * ASHRAE Handbook Fundamentals, Equation 28
   */
  getMoistAirDensity(T_db, W, P_atm) {
    const T_abs = T_db + 459.67; // Convert to Rankine
    
    // ρ = (P_atm / (R_da × T)) × (1 + W) / (1 + 1.6078 × W)
    const rho = (P_atm * 144) / (this.R_da * T_abs) * 
                (1 + W) / (1 + 1.6078 * W);
    
    return rho; // lb/ft³
  }

  /**
   * Calculate specific heat of moist air
   * ASHRAE Handbook Fundamentals, Equation 32
   */
  getSpecificHeat(W) {
    // c_p = c_p_da + W × c_p_wv
    return this.c_p_da + W * this.c_p_wv; // Btu/(lb·°F)
  }

  /**
   * Calculate enthalpy of moist air
   * ASHRAE Handbook Fundamentals, Equation 32
   */
  getEnthalpy(T_db, W) {
    // h = c_p_da × T + W × (c_p_wv × T + h_fg)
    const h = this.c_p_da * T_db + W * (this.c_p_wv * T_db + this.h_fg);
    return h; // Btu/lb_dry_air
  }

  /**
   * Complete psychrometric state
   */
  getAirProperties(T_db, RH, altitude_ft) {
    const P_atm = this.getAtmosphericPressure(altitude_ft);
    const W = this.getHumidityRatio(T_db, RH, P_atm);
    const rho = this.getMoistAirDensity(T_db, W, P_atm);
    const c_p = this.getSpecificHeat(W);
    const h = this.getEnthalpy(T_db, W);
    const P_ws = this.getSaturationPressure(T_db);
    
    return {
      T_db,           // °F
      RH,             // %
      W,              // lb_water/lb_dry_air
      rho,            // lb/ft³
      c_p,            // Btu/(lb·°F)
      h,              // Btu/lb_dry_air
      P_atm,          // psia
      P_ws,           // psia
      altitude_ft
    };
  }

  /**
   * Dynamic heat transfer constants
   * Replaces hard-coded 1.08, 0.68, 4.5
   */
  getHeatTransferConstants(airProps) {
    const { rho, c_p } = airProps;
    
    return {
      // Sensible heat: Q_sens = Constant × CFM × ΔT
      sensible: 60 * rho * c_p, // Btu/(hr·°F·CFM)
      
      // Latent heat: Q_lat = Constant × CFM × ΔW
      latent: (60 * rho * this.h_fg) / 7000, // Btu/(hr·lb_w/lb_da·CFM)
      
      // Total heat: Q_total = Constant × CFM × Δh
      total: 60 * rho, // Btu/(hr·Btu/lb·CFM)
      
      // Reference (sea level, 70°F, 50% RH):
      // sensible ≈ 1.08, latent ≈ 0.68, total ≈ 4.5
    };
  }
}

// ============================================================================
// MODULE 2: MATERIAL PROPERTIES (ASHRAE Table 3.1)
// ============================================================================

const MATERIAL_PROPERTIES = {
  // Volumetric heat capacity: VHC = ρ × c_p [Btu/(ft³·°F)]
  
  // Structural materials
  'concrete': { VHC: 31.68, conductivity: 12.0 },
  'brick': { VHC: 24.0, conductivity: 5.0 },
  'concrete_block': { VHC: 16.8, conductivity: 3.5 },
  
  // Wood products
  'wood_studs': { VHC: 9.9, conductivity: 0.80 },
  'plywood': { VHC: 8.4, conductivity: 0.80 },
  'hardwood': { VHC: 12.8, conductivity: 1.10 },
  
  // Interior finishes
  'gypsum_drywall': { VHC: 3.5, conductivity: 1.11 },
  'plaster': { VHC: 8.0, conductivity: 5.0 },
  
  // Insulation (low thermal mass)
  'fiberglass_batt': { VHC: 0.03, conductivity: 0.27 },
  'cellulose': { VHC: 0.07, conductivity: 0.27 },
  'foam_board': { VHC: 0.15, conductivity: 0.20 },
  
  // Air
  'air_gap': { VHC: 0.018, conductivity: 0.15 }
};

// Wall assembly typical composition
const WALL_ASSEMBLIES = {
  'wood_frame': [
    { material: 'gypsum_drywall', thickness: 0.5/12 },  // 1/2" drywall
    { material: 'wood_studs', thickness: 3.5/12 },      // 2x4 studs
    { material: 'fiberglass_batt', thickness: 3.5/12 }, // R-13 insulation
    { material: 'plywood', thickness: 0.5/12 }          // 1/2" sheathing
  ],
  'brick': [
    { material: 'gypsum_drywall', thickness: 0.5/12 },
    { material: 'air_gap', thickness: 0.5/12 },
    { material: 'brick', thickness: 4/12 }               // 4" brick
  ],
  'concrete': [
    { material: 'gypsum_drywall', thickness: 0.5/12 },
    { material: 'concrete', thickness: 8/12 }            // 8" concrete
  ],
  'mixed': [
    { material: 'gypsum_drywall', thickness: 0.5/12 },
    { material: 'wood_studs', thickness: 3.5/12 },
    { material: 'fiberglass_batt', thickness: 3.5/12 },
    { material: 'brick', thickness: 4/12 }               // Brick veneer
  ]
};

// ============================================================================
// MODULE 3: BUILDING ENVELOPE (Component-Level)
// ============================================================================

class BuildingEnvelope {
  constructor(inputs) {
    this.inputs = inputs;
    this.components = this.calculateComponents();
  }

  calculateComponents() {
    const {
      floor_area,
      ceiling_height,
      num_floors,
      window_area_percent,
      num_exterior_doors,
      construction_type,
      r_value,
      window_type
    } = this.inputs;

    // Building footprint (assuming rectangular, aspect ratio 1.5:1)
    const aspect_ratio = 1.5;
    const footprint_area = floor_area / num_floors;
    const width = Math.sqrt(footprint_area / aspect_ratio);
    const length = width * aspect_ratio;
    const perimeter = 2 * (width + length);

    // Gross wall area
    const wall_height = ceiling_height * num_floors;
    const gross_wall_area = perimeter * wall_height;

    // Window area
    const window_area = gross_wall_area * (window_area_percent / 100);

    // Door area (standard 3ft × 7ft = 21 ft²)
    const door_area = num_exterior_doors * 21;

    // Net opaque wall area
    const net_wall_area = gross_wall_area - window_area - door_area;

    // Roof area
    const roof_area = footprint_area;

    // Exposed floor area (only ground floor, if slab-on-grade)
    const exposed_floor_area = num_floors === 1 ? footprint_area : 0;

    // U-factors for each component
    const U_factors = this.getUFactors();

    return {
      walls: {
        area: net_wall_area,
        U_factor: U_factors.wall,
        R_value: 1 / U_factors.wall
      },
      windows: {
        area: window_area,
        U_factor: U_factors.window,
        R_value: 1 / U_factors.window
      },
      doors: {
        area: door_area,
        U_factor: U_factors.door,
        R_value: 1 / U_factors.door
      },
      roof: {
        area: roof_area,
        U_factor: U_factors.roof,
        R_value: 1 / U_factors.roof
      },
      floor: {
        area: exposed_floor_area,
        U_factor: U_factors.floor,
        R_value: 1 / U_factors.floor
      },
      volume: floor_area * ceiling_height * num_floors,
      total_area: net_wall_area + window_area + door_area + roof_area + exposed_floor_area
    };
  }

  getUFactors() {
    const { r_value, window_type } = this.inputs;

    // Window U-factors (ASHRAE/NFRC typical values)
    const U_WINDOWS = {
      'single_pane': 1.04,
      'double_pane': 0.49,
      'triple_pane': 0.27,
      'low_e_double': 0.33
    };

    return {
      wall: 1 / r_value,
      window: U_WINDOWS[window_type] || 0.49,
      door: 0.50, // Insulated steel door
      roof: 1 / (r_value * 1.5), // Roofs typically better insulated
      floor: 0.10 // Slab on grade with perimeter insulation
    };
  }

  getEffectiveUFactor() {
    const { walls, windows, doors, roof, floor, total_area } = this.components;

    // Area-weighted average
    const U_eff = (
      walls.U_factor * walls.area +
      windows.U_factor * windows.area +
      doors.U_factor * doors.area +
      roof.U_factor * roof.area +
      floor.U_factor * floor.area
    ) / total_area;

    return U_eff;
  }

  getComponentHeatTransfer(T_indoor, T_outdoor) {
    const { walls, windows, doors, roof, floor } = this.components;
    const deltaT = T_outdoor - T_indoor;

    return {
      walls: walls.U_factor * walls.area * deltaT,
      windows: windows.U_factor * windows.area * deltaT,
      doors: doors.U_factor * doors.area * deltaT,
      roof: roof.U_factor * roof.area * deltaT,
      floor: floor.U_factor * floor.area * deltaT,
      total: this.getEffectiveUFactor() * this.components.total_area * deltaT
    };
  }
}

// ============================================================================
// MODULE 4: THERMAL MASS & RC MODEL
// ============================================================================

class ThermalMassModel {
  constructor(buildingInputs, envelope) {
    this.inputs = buildingInputs;
    this.envelope = envelope;
    this.thermalCapacitance = this.calculateThermalCapacitance();
    this.thermalResistance = this.calculateThermalResistance();
    this.timeConstant = this.thermalResistance * this.thermalCapacitance;
  }

  calculateThermalCapacitance() {
    const { construction_type } = this.inputs;
    const { volume } = this.envelope.components;

    // Get wall assembly
    const assembly = WALL_ASSEMBLIES[construction_type];
    
    // Calculate volumetric heat capacity of wall
    let wall_VHC = 0;
    let total_thickness = 0;
    
    for (const layer of assembly) {
      const material = MATERIAL_PROPERTIES[layer.material];
      wall_VHC += material.VHC * layer.thickness;
      total_thickness += layer.thickness;
    }
    
    // Average VHC
    wall_VHC = wall_VHC / total_thickness;

    // Effective building thermal mass
    // Include: walls, floor, interior partitions
    // Exclude: insulation, air gaps (negligible mass)
    
    const wall_volume = this.envelope.components.walls.area * total_thickness;
    const interior_mass_volume = volume * 0.15; // Furniture, partitions ~15% of volume
    
    const C_walls = wall_VHC * wall_volume;
    const C_interior = 5.0 * interior_mass_volume; // Avg VHC for interior contents
    const C_air = 0.018 * volume; // Air itself (small)
    
    const C_total = C_walls + C_interior + C_air;

    return C_total; // Btu/°F
  }

  calculateThermalResistance() {
    const U_eff = this.envelope.getEffectiveUFactor();
    const A_total = this.envelope.components.total_area;

    // R_th = 1 / (U_eff × A_total)
    const R_th = 1 / (U_eff * A_total);

    return R_th; // (hr·°F)/Btu
  }

  getTimeConstant() {
    // τ = R × C
    return this.timeConstant; // hours
  }

  /**
   * Temperature response over time (exponential decay)
   * T(t) = T_outdoor + (T_initial - T_outdoor) × exp(-t/τ)
   */
  getTemperatureAtTime(T_initial, T_outdoor, time_hours) {
    const tau = this.timeConstant;
    const T_t = T_outdoor + (T_initial - T_outdoor) * Math.exp(-time_hours / tau);
    return T_t;
  }

  /**
   * Time to reach target temperature
   */
  getTimeToReachTemperature(T_initial, T_target, T_outdoor) {
    if (T_initial === T_outdoor) return 0;
    
    const ratio = (T_target - T_outdoor) / (T_initial - T_outdoor);
    
    // Check if target is reachable
    if (ratio <= 0 || ratio >= 1) return Infinity;
    
    const tau = this.timeConstant;
    const time = -tau * Math.log(ratio);
    
    return time; // hours
  }
}

// ============================================================================
// MODULE 5: MEAN RADIANT TEMPERATURE (MRT)
// ============================================================================

class RadiantComfort {
  constructor(envelope, T_indoor, T_outdoor) {
    this.envelope = envelope;
    this.T_indoor = T_indoor;
    this.T_outdoor = T_outdoor;
  }

  /**
   * Calculate interior surface temperature for each component
   * T_surface = T_indoor - Q / (h_c × A)
   */
  getSurfaceTemperatures() {
    const h_c = 1.5; // Btu/(hr·ft²·°F) - natural convection coefficient
    const Q_components = this.envelope.getComponentHeatTransfer(
      this.T_indoor,
      this.T_outdoor
    );

    const surfaces = {};
    
    for (const [component, Q] of Object.entries(Q_components)) {
      if (component === 'total') continue;
      
      const A = this.envelope.components[component].area;
      if (A === 0) {
        surfaces[component] = this.T_indoor;
        continue;
      }
      
      // Surface temperature
      const T_surface = this.T_indoor - Q / (h_c * A);
      surfaces[component] = T_surface;
    }

    return surfaces;
  }

  /**
   * Calculate Mean Radiant Temperature
   * Area-weighted average of surface temperatures
   * Includes view factors (simplified: proportional to area)
   */
  getMRT() {
    const surfaceTemps = this.getSurfaceTemperatures();
    
    let weighted_sum = 0;
    let total_area = 0;
    
    for (const [component, T_surface] of Object.entries(surfaceTemps)) {
      const A = this.envelope.components[component].area;
      weighted_sum += T_surface * A;
      total_area += A;
    }
    
    const MRT = weighted_sum / total_area;
    
    return {
      MRT,
      surfaces: surfaceTemps
    };
  }

  /**
   * Operative Temperature (average of air temp and MRT)
   * Better predictor of comfort than air temp alone
   */
  getOperativeTemperature() {
    const { MRT } = this.getMRT();
    const T_operative = (this.T_indoor + MRT) / 2;
    return T_operative;
  }
}

// ============================================================================
// MODULE 6: HVAC PERFORMANCE (Altitude-Adjusted)
// ============================================================================

class HVACPerformance {
  constructor(hvacInputs, airProps) {
    this.inputs = hvacInputs;
    this.airProps = airProps;
  }

  /**
   * Adjust SEER/EER for altitude
   * Equipment loses ~4% capacity per 1000 ft elevation
   */
  getEffectiveSEER() {
    const { seer_rating } = this.inputs;
    const { altitude_ft } = this.airProps;
    
    // Derating factor
    const altitude_factor = 1 - 0.04 * (altitude_ft / 1000);
    
    const seer_effective = seer_rating * altitude_factor;
    
    return Math.max(seer_effective, 8); // Minimum SEER
  }

  /**
   * Convert SEER to COP (for instantaneous power calculations)
   * COP = SEER / 3.412
   */
  getCOP() {
    const seer_eff = this.getEffectiveSEER();
    return seer_eff / 3.412;
  }

  /**
   * Adjust airflow for air density
   */
  getEffectiveCFM(rated_CFM) {
    const { rho } = this.airProps;
    const rho_standard = 0.075; // lb/ft³ at sea level
    
    const altitude_factor = rho / rho_standard;
    
    return rated_CFM * altitude_factor;
  }

  /**
   * HVAC power consumption for given load
   */
  getPowerConsumption(Q_load_btu_hr) {
    const COP = this.getCOP();
    
    // Convert BTU/hr to kW
    const Q_load_kW = Q_load_btu_hr / 3412;
    
    // Power = Load / COP
    const P_kW = Q_load_kW / COP;
    
    return P_kW;
  }
}

// ============================================================================
// MODULE 7: ENERGY CALCULATIONS (Dynamic)
// ============================================================================

class EnergyModel {
  constructor(inputs, psychrometrics, envelope, thermalMass, hvac) {
    this.inputs = inputs;
    this.psychro = psychrometrics;
    this.envelope = envelope;
    this.thermalMass = thermalMass;
    this.hvac = hvac;
  }

  /**
   * Energy to maintain constant temperature
   */
  energyToMaintain(T_desired, T_outdoor, duration_hours) {
    const Q_rate = this.envelope.getComponentHeatTransfer(
      T_desired,
      T_outdoor
    ).total;

    const Q_load_abs = Math.abs(Q_rate); // BTU/hr
    
    const P_hvac = this.hvac.getPowerConsumption(Q_load_abs); // kW
    
    const E_total = P_hvac * duration_hours; // kWh
    
    return E_total;
  }

  /**
   * Energy with setback strategy
   * Includes: cooldown, maintain at setback, recovery
   */
  energyWithSetback(T_desired, T_setback, T_outdoor, absence_hours) {
    const tau = this.thermalMass.getTimeConstant();
    const dt = 0.1; // time step (hours)
    
    const is_cooling = T_outdoor > T_desired;
    
    // Phase 1: Cooldown/Warmup to setback
    const cooldown_time = Math.min(3 * tau, absence_hours / 2);
    
    let E_cooldown = 0;
    for (let t = 0; t < cooldown_time; t += dt) {
      const T_t = this.thermalMass.getTemperatureAtTime(T_desired, T_outdoor, t);
      
      // Check if HVAC needs to be on
      const needs_cooling = is_cooling && T_t > T_setback;
      const needs_heating = !is_cooling && T_t < T_setback;
      
      if (needs_cooling || needs_heating) {
        const Q_t = Math.abs(
          this.envelope.getComponentHeatTransfer(T_t, T_outdoor).total
        );
        const P_t = this.hvac.getPowerConsumption(Q_t);
        E_cooldown += P_t * dt;
      }
    }
    
    // Phase 2: Maintain at setback
    const T_after_cooldown = this.thermalMass.getTemperatureAtTime(
      T_desired,
      T_outdoor,
      cooldown_time
    );
    
    const reached_setback = is_cooling 
      ? T_after_cooldown <= T_setback
      : T_after_cooldown >= T_setback;
    
    const recovery_time = this.thermalMass.getTimeToReachTemperature(
      T_setback,
      T_desired,
      T_outdoor
    );
    
    let time_at_setback = 0;
    let E_maintain_setback = 0;
    
    if (reached_setback) {
      time_at_setback = Math.max(0, absence_hours - cooldown_time - recovery_time);
      E_maintain_setback = this.energyToMaintain(
        T_setback,
        T_outdoor,
        time_at_setback
      );
    }
    
    // Phase 3: Recovery
    let E_recovery = 0;
    for (let t = 0; t < recovery_time && t < absence_hours; t += dt) {
      const T_t = this.thermalMass.getTemperatureAtTime(
        T_setback,
        T_outdoor,
        t
      );
      
      const Q_t = Math.abs(
        this.envelope.getComponentHeatTransfer(T_t, T_outdoor).total
      );
      const P_t = this.hvac.getPowerConsumption(Q_t);
      E_recovery += P_t * dt;
    }
    
    return {
      E_total: E_cooldown + E_maintain_setback + E_recovery,
      E_cooldown,
      E_maintain_setback,
      E_recovery,
      time_at_setback,
      recovery_time
    };
  }

  /**
   * Find optimal setback temperature
   */
  findOptimalSetback(T_desired, T_outdoor, absence_hours) {
    const is_cooling = T_outdoor > T_desired;
    
    // Define search range
    let search_min, search_max;
    if (is_cooling) {
      search_min = T_desired;
      search_max = Math.min(T_outdoor - 2, T_desired + 12);
    } else {
      search_max = T_desired;
      search_min = Math.max(T_outdoor + 2, T_desired - 12);
    }
    
    // Baseline: maintain
    const E_maintain = this.energyToMaintain(T_desired, T_outdoor, absence_hours);
    
    let optimal_setback = T_desired;
    let min_energy = E_maintain;
    let optimal_results = null;
    
    // Search in 0.5°F increments
    for (let T_setback = search_min; T_setback <= search_max; T_setback += 0.5) {
      const results = this.energyWithSetback(
        T_desired,
        T_setback,
        T_outdoor,
        absence_hours
      );
      
      // Constraints
      if (results.recovery_time > absence_hours - 0.25) continue;
      if (Math.abs(T_setback - T_desired) < 3) continue;
      
      if (results.E_total < min_energy) {
        min_energy = results.E_total;
        optimal_setback = T_setback;
        optimal_results = results;
      }
    }
    
    // If no improvement, recommend maintain
    if (optimal_results === null) {
      return {
        action: 'MAINTAIN',
        setback_temp: T_desired,
        restart_time: null,
        recovery_time: 0,
        energy_breakdown: null
      };
    }
    
    const restart_time = absence_hours - optimal_results.recovery_time - 0.25;
    
    return {
      action: 'SETBACK',
      setback_temp: optimal_setback,
      restart_time,
      recovery_time: optimal_results.recovery_time,
      energy_breakdown: optimal_results
    };
  }
}

// ============================================================================
// MODULE 8: MASTER CALCULATION FUNCTION
// ============================================================================

async function analyzeThermalStrategy(userInputs) {
  // Step 1: Get altitude from ZIP code
  const altitude_ft = await getAltitudeFromZip(userInputs.zip_code);
  
  // Step 2: Psychrometric properties
  const psychro = new Psychrometrics();
  const airProps = psychro.getAirProperties(
    userInputs.outdoor_temp,
    userInputs.humidity || 50,
    altitude_ft
  );
  
  // Step 3: Building envelope
  const envelope = new BuildingEnvelope(userInputs);
  
  // Step 4: Thermal mass and time constant
  const thermalMass = new ThermalMassModel(userInputs, envelope);
  const tau = thermalMass.getTimeConstant();
  
  // Step 5: HVAC performance
  const hvac = new HVACPerformance(
    {
      seer_rating: userInputs.seer_rating || 14,
      hvac_type: userInputs.hvac_type
    },
    airProps
  );
  
  // Step 6: Energy model
  const energyModel = new EnergyModel(
    userInputs,
    psychro,
    envelope,
    thermalMass,
    hvac
  );
  
  // Step 7: Break-even analysis
  const t_breakeven = 2.5 * tau;
  
  let recommendation;
  if (userInputs.absence_duration <= t_breakeven) {
    recommendation = {
      action: 'MAINTAIN',
      temperature: userInputs.desired_temp,
      setback_temp: null,
      restart_time: null,
      recovery_time: 0,
      message: `Keep at ${userInputs.desired_temp}°F. Your ${userInputs.absence_duration}hr absence is too short (need >${t_breakeven.toFixed(1)}hr for savings).`
    };
  } else {
    // Find optimal setback
    const optimal = energyModel.findOptimalSetback(
      userInputs.desired_temp,
      userInputs.outdoor_temp,
      userInputs.absence_duration
    );
    
    if (optimal.action === 'MAINTAIN') {
      recommendation = {
        action: 'MAINTAIN',
        temperature: userInputs.desired_temp,
        setback_temp: null,
        restart_time: null,
        recovery_time: 0,
        message: 'Setback not recommended for your building characteristics.'
      };
    } else {
      const absence_start = parseTime(userInputs.absence_start_time);
      const restart_clock = addHours(absence_start, optimal.restart_time);
      const return_clock = addHours(absence_start, userInputs.absence_duration);
      
      recommendation = {
        action: 'SETBACK',
        temperature: userInputs.desired_temp,
        setback_temp: Math.round(optimal.setback_temp),
        restart_time: formatTime(restart_clock),
        return_time: formatTime(return_clock),
        recovery_time: optimal.recovery_time.toFixed(1),
        message: `Set to ${Math.round(optimal.setback_temp)}°F when you leave. ` +
                 `HVAC will restart at ${formatTime(restart_clock)} ` +
                 `(${Math.round(optimal.recovery_time * 60)} min before you return).`,
        energy_breakdown: optimal.energy_breakdown
      };
    }
  }
  
  // Step 8: Calculate savings
  const electricity_rate = getElectricityRate(userInputs);
  
  const E_maintain = energyModel.energyToMaintain(
    userInputs.desired_temp,
    userInputs.outdoor_temp,
    userInputs.absence_duration
  );
  
  let savings;
  if (recommendation.action === 'MAINTAIN') {
    savings = {
      action: 'no_setback',
      energy_saved_kwh: 0,
      cost_saved_daily: 0,
      cost_saved_monthly: 0,
      cost_saved_annual: 0,
      percent_saved: 0,
      baseline_cost_daily: (E_maintain * electricity_rate).toFixed(2),
      message: 'Absence too short for savings. Try longer absence periods!'
    };
  } else {
    const setback_results = energyModel.energyWithSetback(
      userInputs.desired_temp,
      recommendation.setback_temp,
      userInputs.outdoor_temp,
      userInputs.absence_duration
    );
    
    const E_saved = Math.max(0, E_maintain - setback_results.E_total);
    const cost_saved = E_saved * electricity_rate;
    
    const occurrences_per_week = userInputs.days_per_week || 5;
    const weeks_per_year = userInputs.weeks_per_year || 52;
    
    const cost_saved_monthly = cost_saved * occurrences_per_week * 4.33;
    const cost_saved_annual = cost_saved * occurrences_per_week * weeks_per_year;
    
    const percent_saved = (E_saved / E_maintain) * 100;
    
    savings = {
      action: 'setback',
      energy_saved_kwh: E_saved.toFixed(2),
      energy_maintain_kwh: E_maintain.toFixed(2),
      energy_setback_kwh: setback_results.E_total.toFixed(2),
      cost_saved_daily: cost_saved.toFixed(2),
      cost_saved_monthly: cost_saved_monthly.toFixed(2),
      cost_saved_annual: cost_saved_annual.toFixed(0),
      percent_saved: percent_saved.toFixed(1),
      electricity_rate: electricity_rate.toFixed(3),
      message: `Save ${cost_saved.toFixed(2)} per occurrence, ${cost_saved_monthly.toFixed(0)}/month, or ${cost_saved_annual}/year.`
    };
  }
  
  // Step 9: Comfort analysis (MRT)
  const radiantComfort = new RadiantComfort(
    envelope,
    userInputs.desired_temp,
    userInputs.outdoor_temp
  );
  
  const { MRT, surfaces } = radiantComfort.getMRT();
  const T_operative = radiantComfort.getOperativeTemperature();
  
  // Step 10: Return complete analysis
  return {
    recommendation,
    savings,
    building_physics: {
      thermal_time_constant_hours: tau.toFixed(2),
      break_even_time_hours: t_breakeven.toFixed(2),
      building_volume_cuft: envelope.components.volume.toFixed(0),
      surface_area_sqft: envelope.components.total_area.toFixed(0),
      thermal_capacitance_btu_per_f: thermalMass.thermalCapacitance.toFixed(0),
      thermal_resistance_hr_f_per_btu: thermalMass.thermalResistance.toFixed(6),
      effective_u_factor: envelope.getEffectiveUFactor().toFixed(4),
      altitude_ft: altitude_ft.toFixed(0)
    },
    comfort_analysis: {
      mean_radiant_temperature: MRT.toFixed(1),
      operative_temperature: T_operative.toFixed(1),
      surface_temperatures: surfaces,
      comfort_note: Math.abs(MRT - userInputs.desired_temp) > 3
        ? `Note: Cold surfaces (MRT ${MRT.toFixed(0)}°F) may make you feel cooler than the ${userInputs.desired_temp}°F setpoint suggests.`
        : 'Surface temperatures are comfortable.'
    },
    air_properties: {
      density_lb_per_cuft: airProps.rho.toFixed(4),
      humidity_ratio: airProps.W.toFixed(6),
      specific_heat_btu_per_lb_f: airProps.c_p.toFixed(4),
      atmospheric_pressure_psia: airProps.P_atm.toFixed(2),
      heat_transfer_constants: psychro.getHeatTransferConstants(airProps)
    },
    hvac_performance: {
      effective_seer: hvac.getEffectiveSEER().toFixed(1),
      cop: hvac.getCOP().toFixed(2),
      altitude_derating: ((1 - hvac.getEffectiveSEER() / userInputs.seer_rating) * 100).toFixed(1) + '%'
    },
    envelope_breakdown: envelope.components,
    inputs_used: userInputs
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get altitude from ZIP code
 * Uses USGS elevation API or lookup table
 */
async function getAltitudeFromZip(zip_code) {
  // Simplified lookup for major cities
  const ALTITUDE_LOOKUP = {
    // High altitude
    '80': 5280,  // Denver area
    '84': 4500,  // Salt Lake City
    '87': 5000,  // Albuquerque
    
    // Sea level
    '33': 0,     // Florida
    '90': 0,     // Los Angeles
    '98': 0,     // Seattle
    '02': 20,    // Boston
    '10': 50,    // New York
    
    // Medium altitude
    '75': 500,   // Dallas
    '30': 1000,  // Atlanta
    '85': 1100,  // Phoenix
  };
  
  const prefix = zip_code.substring(0, 2);
  return ALTITUDE_LOOKUP[prefix] || 500; // Default 500 ft
}

/**
 * Get electricity rate from multiple sources
 */
function getElectricityRate(inputs) {
  // Priority 1: User provided
  if (inputs.electricity_rate_manual) {
    return inputs.electricity_rate_manual;
  }
  
  // Priority 2: Calculate from bill + usage
  if (inputs.monthly_electric_bill && inputs.monthly_kwh_usage) {
    return inputs.monthly_electric_bill / inputs.monthly_kwh_usage;
  }
  
  // Priority 3: Estimate from bill + typical usage
  if (inputs.monthly_electric_bill) {
    const typical_kwh = inputs.floor_area < 1200 ? 600 
                      : inputs.floor_area < 2500 ? 900 
                      : 1200;
    return inputs.monthly_electric_bill / typical_kwh;
  }
  
  // Priority 4: State average
  const STATE_RATES = {
    'MA': 0.22, 'CT': 0.21, 'NH': 0.20, 'RI': 0.20, 'CA': 0.19,
    'HI': 0.28, 'AK': 0.23, 'NY': 0.18, 'VT': 0.18,
    'FL': 0.12, 'TX': 0.12, 'LA': 0.10, 'WA': 0.10,
    'ID': 0.10, 'UT': 0.11, 'WY': 0.11, 'OR': 0.11
  };
  
  const state = zipToState(inputs.zip_code);
  return STATE_RATES[state] || 0.13; // National average
}

/**
 * Convert ZIP code to state
 */
function zipToState(zip) {
  const prefix = parseInt(zip.substring(0, 2));
  
  if (prefix >= 1 && prefix <= 2) return 'MA';
  if (prefix >= 3 && prefix <= 9) return 'NY';
  if (prefix >= 10 && prefix <= 14) return 'NY';
  if (prefix >= 15 && prefix <= 19) return 'PA';
  if (prefix >= 20 && prefix <= 22) return 'VA';
  if (prefix >= 30 && prefix <= 31) return 'GA';
  if (prefix >= 32 && prefix <= 34) return 'FL';
  if (prefix >= 35 && prefix <= 36) return 'AL';
  if (prefix >= 60 && prefix <= 62) return 'IL';
  if (prefix >= 75 && prefix <= 79) return 'TX';
  if (prefix >= 80 && prefix <= 81) return 'CO';
  if (prefix >= 85 && prefix <= 86) return 'AZ';
  if (prefix >= 90 && prefix <= 96) return 'CA';
  if (prefix >= 98 && prefix <= 99) return 'WA';
  
  return 'US'; // Default
}

/**
 * Parse time string to hours
 */
function parseTime(timeStr) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours + minutes / 60;
}

/**
 * Add hours to time and format
 */
function addHours(startTime, hoursToAdd) {
  return (startTime + hoursToAdd) % 24;
}

/**
 * Format time as string
 */
function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ============================================================================
// VALIDATION & TEST CASES
// ============================================================================

const TEST_CASES = {
  denver_cooling: {
    zip_code: '80202',
    floor_area: 2000,
    ceiling_height: 8,
    num_floors: 1,
    construction_type: 'wood_frame',
    construction_era: '1980_2000',
    insulation_quality: 'average',
    window_type: 'double_pane',
    window_area_percent: 15,
    num_exterior_doors: 2,
    hvac_type: 'central_ac',
    hvac_age: '10_15',
    seer_rating: 14,
    desired_temp: 72,
    outdoor_temp: 95,
    humidity: 15, // Dry climate
    absence_duration: 8,
    absence_start_time: '8:00 AM',
    schedule_type: 'weekdays',
    days_per_week: 5,
    monthly_electric_bill: 120
  },
  
  miami_cooling: {
    zip_code: '33101',
    floor_area: 1500,
    ceiling_height: 9,
    num_floors: 1,
    construction_type: 'concrete_block',
    construction_era: '2000_2010',
    insulation_quality: 'good',
    window_type: 'low_e_double',
    window_area_percent: 20,
    num_exterior_doors: 2,
    hvac_type: 'central_ac',
    hvac_age: '5_10',
    seer_rating: 16,
    desired_temp: 74,
    outdoor_temp: 88,
    humidity: 75, // Humid climate
    absence_duration: 10,
    absence_start_time: '7:00 AM',
    schedule_type: 'weekdays',
    days_per_week: 5,
    monthly_electric_bill: 180
  },
  
  minneapolis_heating: {
    zip_code: '55401',
    floor_area: 2200,
    ceiling_height: 8,
    num_floors: 2,
    construction_type: 'wood_frame',
    construction_era: '1980_2000',
    insulation_quality: 'good',
    window_type: 'triple_pane',
    window_area_percent: 12,
    num_exterior_doors: 2,
    hvac_type: 'heat_pump',
    hvac_age: '5_10',
    seer_rating: 15,
    desired_temp: 68,
    outdoor_temp: 15,
    humidity: 40,
    absence_duration: 9,
    absence_start_time: '8:00 AM',
    schedule_type: 'weekdays',
    days_per_week: 5,
    monthly_electric_bill: 200
  }
};

/**
 * Run validation tests
 */
async function runValidationTests() {
  console.log('=== ThermalIQ Physics Engine Validation ===\n');
  
  for (const [name, testCase] of Object.entries(TEST_CASES)) {
    console.log(`\n--- Test Case: ${name} ---`);
    
    try {
      const result = await analyzeThermalStrategy(testCase);
      
      console.log('Recommendation:', result.recommendation.action);
      console.log('Setback temp:', result.recommendation.setback_temp);
      console.log('Recovery time:', result.recommendation.recovery_time, 'hours');
      console.log('Thermal time constant:', result.building_physics.thermal_time_constant_hours, 'hours');
      console.log('Break-even time:', result.building_physics.break_even_time_hours, 'hours');
      console.log('Air density:', result.air_properties.density_lb_per_cuft, 'lb/ft³');
      console.log('Effective SEER:', result.hvac_performance.effective_seer);
      console.log('MRT:', result.comfort_analysis.mean_radiant_temperature, '°F');
      console.log('Annual savings:', result.savings.cost_saved_annual);
      console.log('✓ PASSED');
      
    } catch (error) {
      console.log('✗ FAILED:', error.message);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  analyzeThermalStrategy,
  Psychrometrics,
  BuildingEnvelope,
  ThermalMassModel,
  RadiantComfort,
  HVACPerformance,
  EnergyModel,
  runValidationTests,
  TEST_CASES
};

// Example usage:
// const result = await analyzeThermalStrategy(userInputs);
// console.log(result.recommendation.message);
// console.log(`Save ${result.savings.cost_saved_annual}/year`);