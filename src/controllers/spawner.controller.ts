import { Role } from "common/roles";

export class SpawnerController {
  private spawn: StructureSpawn;

  constructor(spawn: StructureSpawn) {
    this.spawn = spawn;
  }

  public run(): void {
    // Don't spawn if already spawning
    if (this.spawn.spawning) {
      return;
    }

    // Initialize spawn queue if not exists
    if (!Memory.spawnQueue) {
      Memory.spawnQueue = [Role.Miner, Role.Carrier];
      Memory.currentSpawnIndex = 0;
    }

    // Get counts of each role
    const minerCount = _.filter(Game.creeps, (c) => c.memory.role === Role.Miner).length;
    const carrierCount = _.filter(Game.creeps, (c) => c.memory.role === Role.Carrier).length;

    // Define desired minimums
    const minMiners = 20;
    const minCarriers = 20;

    // Determine if we need to spawn anything
    let needsSpawn = false;
    let roleToSpawn: Role | null = null;

    if (minerCount < minMiners || carrierCount < minCarriers) {
      needsSpawn = true;
      // Get the next role from the queue
      roleToSpawn = Memory.spawnQueue![Memory.currentSpawnIndex!];

      // Skip to next role if we already have enough of current role
      if (
        (roleToSpawn === Role.Miner && minerCount >= minMiners) ||
        (roleToSpawn === Role.Carrier && carrierCount >= minCarriers)
      ) {
        // Move to next role in queue
        Memory.currentSpawnIndex = (Memory.currentSpawnIndex! + 1) % Memory.spawnQueue!.length;
        roleToSpawn = Memory.spawnQueue![Memory.currentSpawnIndex!];
      }
    }

    if (needsSpawn && roleToSpawn) {
      const result = this.spawnCreep(roleToSpawn);
      if (result === OK) {
        // Move to next role in queue after successful spawn
        Memory.currentSpawnIndex = (Memory.currentSpawnIndex! + 1) % Memory.spawnQueue!.length;
      }
    }
  }

  private spawnCreep(role: Role): ScreepsReturnCode {
    let body: BodyPartConstant[];
    let name: string;

    switch (role) {
      case Role.Miner:
        body = [WORK, WORK, MOVE, CARRY];
        name = `Miner_${Game.time}`;
        break;
      case Role.Carrier:
        body = [CARRY, CARRY, MOVE, MOVE];
        name = `Carrier_${Game.time}`;
        break;
      default:
        return ERR_INVALID_ARGS;
    }

    const result = this.spawn.spawnCreep(body, name, {
      memory: {
        role: role,
        room: this.spawn.room.name
      }
    });

    if (result === OK) {
      console.log(`Spawning ${role}: ${name}`);
    }

    return result;
  }
}
