import {
  BUILDER_BODY_PROPORTIONS,
  CARRIER_BODY_PROPORTIONS,
  getOptimalBody,
  MINER_BODY_PROPORTIONS
} from "common/bodies";
import { WorkerTypes } from "common/enum";

export class SpawnerController {
  spawn: StructureSpawn;

  rolesWithWeights: { role: string; weight: number }[] = [
    { role: "miner", weight: 3 },
    { role: "carrier", weight: 2 },
    { role: "builder", weight: 1 }
  ];

  constructor(spawn: StructureSpawn) {
    this.spawn = spawn;
    this.setMemoryIfNotExists();
  }

  public run(): void {
    if (!this.isMaxEnergyAvailable()) {
      return;
    }

    const nextRoleToSpawn = this.getNextPriorityCreepRole();
    if (nextRoleToSpawn) {
      switch (nextRoleToSpawn) {
        case "miner":
          this.spawnOptimalBodyCreep(MINER_BODY_PROPORTIONS, "miner");
          break;
        case "carrier":
          this.spawnOptimalBodyCreep(CARRIER_BODY_PROPORTIONS, "carrier");
          break;
        case "builder":
          this.spawnOptimalBodyCreep(BUILDER_BODY_PROPORTIONS, "builder");
          break;
      }
    }
  }

  isMaxEnergyAvailable(): boolean {
    return this.getAvailableEnergyInSpawn() === this.spawn.room.energyCapacityAvailable;
  }

  spawnOptimalBodyCreep(proportions: Partial<Record<BodyPartConstant, number>>, role: string): void {
    const availableEnergy = this.getAvailableEnergyInSpawn();
    console.log(
      `Available energy for spawning: ${availableEnergy}. Spawning role: ${role}. Proportions: ${JSON.stringify(
        proportions
      )}`
    );
    const bodyParts = getOptimalBody(proportions, availableEnergy);
    this.spawnCreepWithBodyParts(bodyParts, role);
  }

  spawnCreepWithBodyParts(bodyParts: BodyPartConstant[], role: string): void {
    if (this.spawn.spawning) {
      return;
    }
    const newName = `${role.charAt(0).toUpperCase() + role.slice(1)}${Game.time}`;
    console.log(`Spawning new ${role}: ${newName}. Body: ${bodyParts.join(", ")}`);
    const result = this.spawn.spawnCreep(bodyParts, newName, {
      memory: { role, working: false }
    });
    if (result !== OK) {
      console.log(`Failed to spawn ${role}: ${result}`);
    }
  }

  getAllCreepsCountKeyedByRole(): { [role: string]: number } {
    const counts: { [role: string]: number } = {};
    Object.values(Game.creeps).forEach(creep => {
      const role = creep.memory.role;
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }

  getCreepsCountByRole(role: string): number {
    return Object.values(Game.creeps).filter(creep => creep.memory.role === role).length;
  }

  getNextPriorityCreepRole(): string | null {
    const creepCounts = this.getAllCreepsCountKeyedByRole();
    const maxCreeps = this.spawn.room.memory.maxCreeps;

    if (!maxCreeps) {
      return null;
    }

    // Calculate the ratio of current/max for each role
    let lowestRatio = Infinity;
    let roleToSpawn: string | null = null;

    for (const { role, weight } of this.rolesWithWeights) {
      const currentCount = creepCounts[role] || 0;
      const maxCount = maxCreeps[role as keyof typeof maxCreeps] || 0;

      // Skip if we've reached the maximum for this role
      if (currentCount >= maxCount) {
        continue;
      }

      // Calculate the weighted ratio (lower means higher priority)
      // Weight increases the "need" for that role
      const ratio = maxCount > 0 ? currentCount / (maxCount * weight) : 0;

      if (ratio < lowestRatio) {
        lowestRatio = ratio;
        roleToSpawn = role;
      }
    }

    return roleToSpawn;
  }

  getSpawns(): StructureSpawn[] {
    return Object.values(Game.spawns);
  }

  getAvailableEnergyInSpawn(): number {
    return this.getAvailableEnergyInRoom(this.spawn.room);
  }

  getSpawnRooms(): Room[] {
    return Object.values(Game.spawns).map(spawn => spawn.room);
  }

  getAvailableEnergyInRoom(room: Room): number {
    return room.energyAvailable;
  }

  setMemoryIfNotExists(): void {
    for (const room of this.getSpawnRooms()) {
      if (room.memory.maxCreeps === undefined) {
        room.memory.maxCreeps = {
          [WorkerTypes.Miner]: 2 * room.find(FIND_SOURCES).length,
          [WorkerTypes.Carrier]: 2 * room.find(FIND_SOURCES).length,
          [WorkerTypes.Builder]: 3
        };
      }
    }
  }
}
