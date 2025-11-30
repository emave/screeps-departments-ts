import { calculatePartsPrice } from "utils/calculatePartsPrice";

export class SpawnerController {
  readonly maxCarriersPerRoom: number = 2;
  readonly maxMinersPerRoom: number = 2;

  public run(): void {
    for (const spawn of this.getSpawns()) {
      const creepsInRoom = spawn.room.find(FIND_MY_CREEPS);
      const carrierCount = creepsInRoom.filter(creep => creep.memory.role === "carrier").length;
      const minerCount = creepsInRoom.filter(creep => creep.memory.role === "miner").length;
      if (minerCount < this.maxMinersPerRoom && carrierCount >= minerCount) {
        if (this.canCreepBeSpawned(spawn, [WORK, MOVE])) {
          this.spawnCreepWithBodyParts(spawn, [WORK, MOVE], "miner");
        }
      } else if (carrierCount < this.maxCarriersPerRoom && minerCount >= carrierCount) {
        if (this.canCreepBeSpawned(spawn, [CARRY, MOVE])) {
          this.spawnCreepWithBodyParts(spawn, [CARRY, MOVE], "carrier");
        }
      }
    }
  }

  canCreepBeSpawned(spawn: StructureSpawn, bodyParts: BodyPartConstant[]): boolean {
    const availableEnergy = this.getAvailableEnergyInSpawn(spawn);
    const partsPrice = calculatePartsPrice(bodyParts);
    return availableEnergy >= partsPrice;
  }

  spawnCreepWithBodyParts(spawn: StructureSpawn, bodyParts: BodyPartConstant[], role: string): void {
    const newName = `${role.charAt(0).toUpperCase() + role.slice(1)}${Game.time}`;
    console.log(`Spawning new ${role}: ${newName}`);
    spawn.spawnCreep(bodyParts, newName, {
      memory: { role, working: false }
    });
  }

  getSpawns(): StructureSpawn[] {
    return Object.values(Game.spawns);
  }

  getAvailableEnergyInSpawn(spawn: StructureSpawn): number {
    return this.getAvailableEnergyInRoom(spawn.room);
  }

  getSpawnRooms(): Room[] {
    return Object.values(Game.spawns).map(spawn => spawn.room);
  }

  getAvailableEnergyInRoom(room: Room): number {
    return room.energyAvailable;
  }
}
