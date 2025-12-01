import { PartPrices } from "./enum";
import lodash from "lodash";

// Carrier body proportion constants
export const CARRIER_BODY_PROPORTIONS: Partial<Record<BodyPartConstant, number>> = {
  carry: 2,
  move: 1
};

// Miner body proportion constants
export const MINER_BODY_PROPORTIONS: Partial<Record<BodyPartConstant, number>> = {
  work: 2,
  move: 1
};

// Builder body proportion constants
export const BUILDER_BODY_PROPORTIONS: Partial<Record<BodyPartConstant, number>> = {
  work: 1,
  carry: 1,
  move: 1
};

/**
 * Calculates the optimal body composition based on proportions and available energy
 * @param proportions - An object mapping body part types to their proportions (e.g., { WORK: 2, MOVE: 1 })
 * @param availableEnergy - The amount of energy available for spawning
 * @param maxParts - Maximum number of body parts (default: 50, Screeps limit)
 * @returns An array of body parts optimized for the given constraints
 */
export function getOptimalBody(
  proportions: Partial<Record<BodyPartConstant, number>>,
  availableEnergy: number,
  maxParts: number = 50
): BodyPartConstant[] {
  const body: BodyPartConstant[] = [];

  // Calculate the cost of one complete set of parts
  let setCost = 0;
  let setPartsCount = 0;
  const partEntries = Object.entries(proportions) as [BodyPartConstant, number][];

  for (const [part, proportion] of partEntries) {
    const partCost = PartPrices[part as keyof typeof PartPrices];
    setCost += partCost * proportion;
    setPartsCount += proportion;
  }

  // Calculate how many complete sets we can afford
  const maxSetsByEnergy = Math.floor(availableEnergy / setCost);
  const maxSetsByParts = Math.floor(maxParts / setPartsCount);
  const numberOfSets = Math.min(maxSetsByEnergy, maxSetsByParts);

  // Build the body array
  for (const [part, proportion] of partEntries) {
    for (let i = 0; i < proportion * numberOfSets; i++) {
      body.push(part);
    }
  }

  // If body is empty, remove one proportion of the highest proportion part to allow at least one set
  if (body.length === 0 && partEntries.length > 0) {
    body.push(...(lodash.uniq(Object.keys(proportions)) as BodyPartConstant[]));
  }

  return body;
}
