/**
 * Impact Calculation Utilities
 * 
 * Fixed environmental standards and baseline market prices
 * DO NOT CHANGE these values without proper justification
 */

// CO₂ Savings per kg by material type (kg CO₂ saved per kg of material)
const CO2_FACTORS = {
  'Metals': 1.8,
  'Plastics': 2.5,
  'Electronics': 4.0,
  'Wood': 1.2,
  'Chemicals': 1.5, // Default for chemicals
  'Glassware': 1.0, // Default for glassware
  'Bio Materials': 1.0, // Default for bio materials
  'Other': 1.0, // Default for other
};

// Baseline market prices (₹/kg) - used for calculating money saved
const BASE_MARKET_PRICES = {
  'Electronics': 500,
  'Metals': 300,
  'Glassware': 200,
  'Chemicals': 400,
  'Wood': 150,
  'Plastics': 100, // Default for plastics
  'Bio Materials': 150, // Default for bio materials
  'Other': 100, // Default for other
};

/**
 * Get CO₂ factor for a material type
 */
const getCO2Factor = (materialType) => {
  return CO2_FACTORS[materialType] || CO2_FACTORS['Other'];
};

/**
 * Get base market price for a material type
 */
const getBaseMarketPrice = (materialType) => {
  return BASE_MARKET_PRICES[materialType] || BASE_MARKET_PRICES['Other'];
};

/**
 * Calculate CO₂ saved
 * @param {string} materialType - Type of material
 * @param {number} quantityReused - Quantity reused in kg
 * @returns {number} CO₂ saved in kg
 */
const calculateCO2Saved = (materialType, quantityReused) => {
  if (quantityReused <= 0) return 0;
  const co2Factor = getCO2Factor(materialType);
  return quantityReused * co2Factor;
};

/**
 * Calculate waste diverted (same as quantity reused)
 * @param {number} quantityReused - Quantity reused in kg
 * @returns {number} Waste diverted in kg
 */
const calculateWasteDiverted = (quantityReused) => {
  return Math.max(0, quantityReused);
};

/**
 * Calculate money saved by seeker
 * @param {string} materialType - Type of material
 * @param {number} quantityReused - Quantity reused in kg
 * @param {number} actualAmountPaid - Actual amount paid by seeker in ₹
 * @returns {number} Money saved in ₹
 */
const calculateMoneySaved = (materialType, quantityReused, actualAmountPaid = 0) => {
  if (quantityReused <= 0) return 0;
  const basePrice = getBaseMarketPrice(materialType);
  const marketValue = quantityReused * basePrice;
  const moneySaved = marketValue - actualAmountPaid;
  return Math.max(0, moneySaved); // Ensure non-negative
};

/**
 * Parse quantity string to extract numeric value in kg
 * Handles formats like "5 kg", "10 pieces", "2 boxes"
 * For non-weight units, assumes approximate conversion
 */
const parseQuantityToKg = (quantityStr, materialType) => {
  if (!quantityStr) return 0;
  
  // Extract numeric value
  const match = quantityStr.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  
  const numericValue = parseFloat(match[1]);
  
  // Check if already in kg
  if (quantityStr.toLowerCase().includes('kg') || quantityStr.toLowerCase().includes('kilogram')) {
    return numericValue;
  }
  
  // For other units, use approximate conversions
  // This is a simplified approach - in production, you might want more sophisticated parsing
  if (quantityStr.toLowerCase().includes('piece') || quantityStr.toLowerCase().includes('unit')) {
    // Approximate: 1 piece ≈ 0.1-0.5 kg depending on material type
    const pieceToKg = {
      'Electronics': 0.5,
      'Metals': 0.3,
      'Glassware': 0.2,
      'Chemicals': 0.1,
      'Plastics': 0.1,
      'Other': 0.2,
    };
    return numericValue * (pieceToKg[materialType] || 0.2);
  }
  
  if (quantityStr.toLowerCase().includes('box')) {
    // Approximate: 1 box ≈ 2-5 kg
    return numericValue * 3;
  }
  
  if (quantityStr.toLowerCase().includes('set')) {
    // Approximate: 1 set ≈ 1-3 kg
    return numericValue * 2;
  }
  
  // Default: assume kg if no unit specified
  return numericValue;
};

module.exports = {
  getCO2Factor,
  getBaseMarketPrice,
  calculateCO2Saved,
  calculateWasteDiverted,
  calculateMoneySaved,
  parseQuantityToKg,
  CO2_FACTORS,
  BASE_MARKET_PRICES,
};

