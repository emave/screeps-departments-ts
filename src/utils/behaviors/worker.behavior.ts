// All common behaviors for creeps will be defined here

import { CreepBehavior } from "./creep.behavior";

export class WorkerBehavior extends CreepBehavior {
  constructor(creep: Creep) {
    super(creep);
  }

  setWorkingState(): void {
    if (this.isNoCarryingModule() && !this.isWorking()) {
      this.setWorking(true);
      this.sayPublic("⚡ Working");
      return;
    } else if (this.isNoCarryingModule()) {
      return;
    }
    if (this.isWorking() && this.isEnergyEmpty()) {
      this.setWorking(false);
      this.sayPublic("🔄 Getting Energy");
    }
    if (!this.isWorking() && this.isEnergyFull()) {
      this.setWorking(true);
      this.sayPublic("⚡ Working");
    }
  }

  setWorking(working: boolean): void {
    this.creep.memory.working = working;
  }

  isWorking(): boolean {
    return this.creep.memory.working;
  }

  isNoCarryingModule(): boolean {
    return this.creep.store.getCapacity(RESOURCE_ENERGY) === null;
  }

  isEnergyFull(): boolean {
    return this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
  }

  isEnergyEmpty(): boolean {
    return this.creep.store[RESOURCE_ENERGY] === 0;
  }

  getNearestEnergySource(): Source | null {
    return this.creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
  }

  getNearestConstructionSite(): ConstructionSite | null {
    return this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
  }

  getNearestDroppedResource(): Resource | null {
    return this.creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: resource => resource.resourceType === RESOURCE_ENERGY
    });
  }

  getNearestContainerWithEnergy(): StructureContainer | null {
    return this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0
    });
  }

  getNearestStorageWithEnergy(): StructureStorage | null {
    return this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_STORAGE && structure.store[RESOURCE_ENERGY] > 0
    });
  }

  getNearestExtensionOrSpawnNeedingEnergy(): StructureExtension | StructureSpawn | null {
    return this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure => {
        return (
          (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      }
    });
  }

  getNearestTowerNeedingEnergy(): StructureTower | null {
    return this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        structure.structureType === STRUCTURE_TOWER && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }

  getNearestContainerNeedingEnergy(): StructureContainer | null {
    return this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        structure.structureType === STRUCTURE_CONTAINER && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }

  getNearestStorageNeedingEnergy(): StructureStorage | null {
    return this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: structure =>
        structure.structureType === STRUCTURE_STORAGE && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }
}
