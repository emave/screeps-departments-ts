import { HarvesterTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IHarvester extends IWorker {
  findClosestSource(): Source;
  findStructureInNeed(): AnyStructure;

  harvest(source: Source): void;
}

const structurePriority = {
  [STRUCTURE_EXTENSION]: 1,
  [STRUCTURE_SPAWN]: 2,
  [STRUCTURE_TOWER]: 3
};

type StructureTypes = StructureExtension | StructureSpawn | StructureTower;

const filterStructuresInNeed = (structure: StructureTypes): structure is StructureTypes => {
  return (
    Object.keys(structurePriority).includes(structure.structureType) &&
    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  );
};

export class Harvester extends Worker implements IHarvester {
  task: HarvesterTasks = HarvesterTasks.Harvesting;
  constructor(creep: Creep) {
    super(creep);

    const memory = this.getMemory();
    this.task = memory.task;
  }

  run(): void {
    console.log(`Harvester ${this.creep.name} executing task: ${this.task}`);
    switch (this.task) {
      case HarvesterTasks.Harvesting:
        this.harvestTask();
        break;
      default:
        console.log(`Unknown task for harvester ${this.creep.name}: ${this.task}`);
    }
  }

  harvestTask() {
    if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      this.supplyStructure(
        this.getSpecificStructureToSupply()
      );
    } else {
      this.harvest(
        this.getSpecificSource()
      );
    }
  }

  harvest(source?: Source | null) {
    if (!source) {
      source = this.findClosestSource();
    }

    if (source) {
      const result = this.creep.harvest(source);
      if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(source);
      }
    }
  }

  supplyStructure(structure?: AnyStructure | null) {
    if (!structure) {
      structure = this.findStructureInNeed();
    }

    if (structure) {
      const result = this.creep.transfer(structure, RESOURCE_ENERGY);
      if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(structure);
      }
    }
  }

  findClosestSource(): Source {
    let source = this.creep.pos.findClosestByPath(FIND_SOURCES);
    if (!source) {
      source = this.creep.room.find(FIND_SOURCES)[0];
    }
    // TODO should go to the other room or something if no source found
    return source;
  }

  findStructureInNeed(): AnyStructure {
    let struct = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: filterStructuresInNeed
    });
    if (!struct) {
      struct = this.creep.room.find(FIND_STRUCTURES, {
        filter: filterStructuresInNeed
      })[0];
    }
    return struct;
  }

  setSpecificStructureToSupply(structureId: Id<AnyStructure>) {
    const memory = this.getMemory();
    memory.specificStructureId = structureId;
    this.setMemory(memory);
  }

  getSpecificStructureToSupply(): AnyStructure | null {
    const memory = this.getMemory();
    return Game.getObjectById(memory.specificStructureId!);
  }

  setSpecificSourceId(sourceId: Id<Source>) {
    const memory = this.getMemory();
    memory.specificSourceId = sourceId;
    this.setMemory(memory);
  }

  getSpecificSource(): Source | null {
    const memory = this.getMemory();
    return Game.getObjectById(memory.specificSourceId!);
  }
}
