/**
 * Helper utilities for department management
 */

/**
 * Calculate the energy cost of a creep body
 */
export function calculateBodyCost(body: BodyPartConstant[]): number {
  const costs: { [key: string]: number } = {
    [MOVE]: 50,
    [WORK]: 100,
    [CARRY]: 50,
    [ATTACK]: 80,
    [RANGED_ATTACK]: 150,
    [HEAL]: 250,
    [TOUGH]: 10,
    [CLAIM]: 600
  };

  return body.reduce((total, part) => total + (costs[part] || 0), 0);
}

/**
 * Generate an upgraded worker body based on available energy
 */
export function getUpgradedWorkerBody(
  defaultBody: BodyPartConstant[],
  availableEnergy: number,
  partPriority: BodyPartConstant[] = [WORK, CARRY, MOVE]
): BodyPartConstant[] {
  const upgradedBody = [...defaultBody];

  // Keep trying to add parts one at a time until we run out of energy or reach the limit
  let priorityIndex = 0;
  while (upgradedBody.length < 50) {
    const partToAdd = partPriority[priorityIndex % partPriority.length];
    const newCost = calculateBodyCost([...upgradedBody, partToAdd]);

    if (newCost <= availableEnergy) {
      upgradedBody.push(partToAdd);
      priorityIndex++;
    } else {
      // If current priority part doesn't fit, try next priority
      const nextIndex = (priorityIndex % partPriority.length) + 1;
      if (nextIndex >= partPriority.length) {
        // We've tried all part types and none fit
        break;
      }
      priorityIndex = Math.floor(priorityIndex / partPriority.length) * partPriority.length + nextIndex;

      // Check if we've cycled through all options at this level
      if (
        priorityIndex % partPriority.length === 0 &&
        calculateBodyCost([...upgradedBody, partPriority[0]]) > availableEnergy
      ) {
        break;
      }
    }
  }

  return upgradedBody;
}

/**
 * Calculate available energy for spawning based on percentage allocation
 */
export function getAvailableMaterials(materialsPercentage: number): number {
  // Calculate total energy available across all spawns
  let totalEnergy = 0;
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];
    totalEnergy += spawn.store.getUsedCapacity(RESOURCE_ENERGY);
  }
  return Math.floor(totalEnergy * materialsPercentage);
}

/**
 * Find an available (non-spawning) spawn
 */
export function findAvailableSpawn(): StructureSpawn | null {
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];
    if (!spawn.spawning) {
      return spawn;
    }
  }
  return null;
}

/**
 * Check if a new worker can be upgraded based on available materials
 */
export function canUpgradeWorker(
  defaultBody: BodyPartConstant[],
  availableEnergy: number,
  partPriority?: BodyPartConstant[]
): boolean {
  const upgradedBody = getUpgradedWorkerBody(defaultBody, availableEnergy, partPriority);
  const upgradedCost = calculateBodyCost(upgradedBody);
  return availableEnergy >= upgradedCost;
}
