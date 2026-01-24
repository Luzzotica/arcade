/**
 * SynergyConfig - Central configuration for all synergy values
 * 
 * This file contains all numeric values for synergies, making it easy to
 * balance and adjust the game. All healing values are reduced by 90% (10% effectiveness).
 */

import type { HexColor } from '../../store/gameStore';

// ============================================================================
// BASE HEX STATS
// ============================================================================

export const BASE_HEX_STATS = {
  GREEN: {
    hpPerHex: 10, // Max HP per GREEN hex
  },
  BLUE: {
    shieldPerHex: 10, // Max Shield per BLUE hex
  },
  CYAN: {
    pickupRadiusPerHex: 15, // Pickup radius bonus per CYAN hex
  },
  ORANGE: {
    damageReductionPerHex: 1, // Damage reduction per ORANGE hex (reduced from 5)
  },
  YELLOW: {
    moveSpeedPercentPerHex: 5, // +5% move speed per YELLOW hex
  },
} as const;

// ============================================================================
// SYNERGY VALUES
// ============================================================================

export const SYNERGY_VALUES = {
  // RED Synergies
  MULTISHOT: {
    projectilesPerNeighbor: 1, // +1 projectile per RED neighbor
  },
  GATLING: {
    fireRateReductionPerNeighbor: 0.7, // Multiply fire rate by 0.7^count
  },
  HOMING: {
    speedBonusPerNeighbor: 0.2, // +20% speed per CYAN neighbor
  },
  HEAVY_IMPACT: {
    speedReduction: 0.7, // 70% speed
    damageBonusPerNeighbor: 0.5, // +0.5x damage per ORANGE neighbor
  },
  BIO_ORDNANCE: {
    baseSizeMultiplier: 1.0, // Start at 50% size
    baseDamageMultiplier: 1.0, // Start at 50% damage
    baseMaxGrowth: 3, // Base max growth factor
    growthPerNeighbor: 2, // +2x max growth per GREEN neighbor
    baseGrowthRate: 50, // Base pixels to reach max
    growthRateReductionPerNeighbor: 0, // -10 pixels per GREEN neighbor
  },
  
  // BLUE Synergies
  THERMAL_FIELD: {
    dpsPerNeighbor: 5, // DPS per RED neighbor
    baseRadius: 80, // Base field radius
  },
  SHIELD_REGEN: {
    regenPerNeighbor: 1, // +1 shield/sec per BLUE neighbor
  },
  STATIC_CHARGE: {
    stunDuration: 0.2, // Seconds
  },
  STASIS_FIELD: {
    slowPercent: 40, // 40% slow
  },
  AMPLIFIER: {
    radiusBonusPerNeighbor: 25, // +25 radius per CYAN neighbor
  },
  
  // YELLOW Synergies
  TURBO: {
    speedBonusPerNeighbor: 0.1, // +10% speed per YELLOW neighbor
    dashForce: 800, // Dash velocity
  },
  ION_SHIELD: {
    maxShieldRegenBonus: 2, // Up to +2 shield/sec at max speed
  },
  
  // GREEN Synergies
  SYMBIOSIS: {
    hpRegenPerNeighbor: 0.1, // +0.1 HP/sec per GREEN neighbor (reduced from 1)
  },
  ADRENALINE: {
    healAmount: 0.1, // Instant heal on kill (reduced from 1)
  },
  NUTRIENTS: {
    healOnPickup: 0.1, // Heal on XP pickup (reduced from 1)
  },
  BIO_FUEL: {
    healOnPickup: 0.1, // Heal on XP pickup (reduced from 1)
  },
  BARKSKIN: {
    armorBonus: 1, // Temporary armor after heal
    duration: 500, // 0.5 seconds
  },
  
  // CYAN Synergies
  WIDE_NET: {
    radiusBonusPerNeighbor: 15, // +15 pickup radius per CYAN neighbor
  },
  ENERGY_SIPHON: {
    shieldPerExp: 0.2, // 0.2 shield per exp (reduced from 2)
  },
  UNSTABLE_ISOTOPE: {
    explosionRadius: 50,
    explosionDamage: 20,
  },
  CORROSION_FIELD: {
    damageBonus: 0.3, // +30% damage
    baseRadius: 150,
  },
  HYPER_LOOP: {
    magnetStrength: 500, // Magnet pull strength (vs 300 base)
  },
  BASE_MAGNET: {
    baseRadius: 150, // Base magnet radius for XP pickup
    baseStrength: 300, // Base magnet pull strength
  },
  
  // ORANGE Synergies
  FORTRESS: {
    damageReductionPerNeighbor: 1, // +1 damage reduction per ORANGE neighbor
  },
  REACTIVE_PLATING: {
    shrapnelCount: 8,
    shrapnelDamage: 10,
    shrapnelRange: 100,
  },
  REFLECTOR: {
    baseChance: 0.1, // 10% base chance
    chancePerNeighbor: 0.1, // +10% per BLUE neighbor, max 50%
    maxChance: 0.5,
  },
  KINETIC_ABSORBER: {
    speedBoostDuration: 2000, // 2 seconds
  },
  LIVING_HULL: {
    healAmount: 1, // Heal amount (reduced from 10)
    cooldown: 5000, // 5 seconds without hit
  },
  
  // Ramming Speed (YELLOW + ORANGE)
  RAMMING_SPEED: {
    collisionDamage: 20,
    speedThreshold: 0.9, // 90% of max speed
  },
  
  // Afterburner (YELLOW + RED)
  AFTERBURNER: {
    dps: 5, // DPS in trail
    trailLength: 100,
    trailRadius: 50,
  },
  
  // Vacuum Wake (YELLOW + CYAN)
  VACUUM_WAKE: {
    wakeLength: 150,
    wakeRadius: 100,
    pullForce: 200,
  },
  
  // Leech Field (BLUE + GREEN)
  LEECH_FIELD: {
    healRatio: 0.5, // 50% of damage dealt
  },
} as const;

// ============================================================================
// BASE STATS FOR UI DISPLAY
// ============================================================================

export const BASE_STATS_DISPLAY: Record<HexColor, { stat: string; ability: string }> = {
  RED: { 
    stat: '+5% Global Damage', 
    ability: 'Weapon: Shoots projectiles' 
  },
  GREEN: { 
    stat: `+${BASE_HEX_STATS.GREEN.hpPerHex} Max HP`, 
    ability: 'Healer: HP regen, buffs bullet size' 
  },
  YELLOW: { 
    stat: `+${BASE_HEX_STATS.YELLOW.moveSpeedPercentPerHex}% Move Speed`, 
    ability: 'Thruster: Acceleration, buffs fire rate' 
  },
  BLUE: { 
    stat: `+${BASE_HEX_STATS.BLUE.shieldPerHex} Max Shield`, 
    ability: 'Barrier: Shield regen, buffs penetration' 
  },
  CYAN: { 
    stat: `+${BASE_HEX_STATS.CYAN.pickupRadiusPerHex} Pickup Radius`, 
    ability: 'Magnet: Increases XP pickup range' 
  },
  ORANGE: { 
    stat: `+${BASE_HEX_STATS.ORANGE.damageReductionPerHex} Damage Reduction`, 
    ability: 'Armor: Reduces damage & deals contact damage' 
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Round HP/shield values for display (but keep decimals internally)
 */
export function roundForDisplay(value: number): number {
  return Math.floor(value);
}

/**
 * Format HP/shield for display (shows max of current or max value, rounded)
 * If current >= max, show max/max. Otherwise show rounded current/max.
 */
export function formatHealthForDisplay(current: number, max: number): string {
  const displayMax = Math.floor(max);
  // If current is at or above max, show max/max
  // Otherwise show rounded current (but never less than 1 if current > 0)
  const displayCurrent = current >= max 
    ? displayMax 
    : Math.max(1, Math.floor(current));
  return `${displayCurrent} / ${displayMax}`;
}
