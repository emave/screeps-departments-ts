import { HarvesterTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IHarvester extends IWorker {
  findClosestSource(): Source;
  findStructureInNeed(): AnyStructure | null;
  findConstructionSite(): ConstructionSite | null;
  findControllerToUpgrade(): StructureController | null;

  harvest(source: Source): void;
  build(site: ConstructionSite): void;
  upgradeController(controller: StructureController): void;
}

const structurePriority = {
  [STRUCTURE_EXTENSION]: 1,
  [STRUCTURE_SPAWN]: 2,
  [STRUCTURE_TOWER]: 3,
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
    this.task = memory.task as HarvesterTasks;
  }

  run(): void {
    console.log(`Harvester ${this.creep.name} executing task: ${this.task}`);
    switch (this.task) {
      case HarvesterTasks.Harvesting:
        this.harvestTask();
        break;
      case HarvesterTasks.Building:
        this.buildTask();
        break;
      case HarvesterTasks.Upgrading:
        this.upgradeTask();
        break;
      default:
        console.log(`Unknown task for harvester ${this.creep.name}: ${this.task}`);
    }
  }

  harvestTask() {
    if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      const structure = this.getSpecificStructureToSupply() || this.findStructureInNeed();

      if (!structure) {
        // No structures need energy, switch to building or upgrading
        const constructionSite = this.findConstructionSite();
        if (constructionSite) {
          this.task = HarvesterTasks.Building;
          this.updateMemoryTask();
          this.buildTask();
        } else {
          this.task = HarvesterTasks.Upgrading;
          this.updateMemoryTask();
          this.upgradeTask();
        }
      } else {
        this.supplyStructure(structure);
      }
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
      if (!structure) {
        console.log(`Harvester ${this.creep.name} found no structure to supply.`);
        return;
      }
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

  findStructureInNeed(): AnyStructure | null {
    let struct = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: filterStructuresInNeed
    });
    if (!struct) {
      struct = this.creep.pos.findClosestByPath(FIND_STRUCTURES);
    }
    return struct;
  }


  findConstructionSite(): ConstructionSite | null {
    let site = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
    if (!site) {
      const sites = this.creep.room.find(FIND_CONSTRUCTION_SITES);
      site = sites.length > 0 ? sites[0] : null;
    }
    return site;
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

  buildTask() {
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.task = HarvesterTasks.Harvesting;
      this.updateMemoryTask();
      this.harvest(this.getSpecificSource());
    } else {
      const site = this.findConstructionSite();
      if (site) {
        this.build(site);
      } else {
        // No construction sites, switch to upgrading
        this.task = HarvesterTasks.Upgrading;
        this.updateMemoryTask();
        this.upgradeTask();
      }
    }
  }

  upgradeTask() {
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.task = HarvesterTasks.Harvesting;
      this.updateMemoryTask();
      this.harvest(this.getSpecificSource());
    } else {
      const controller = this.findControllerToUpgrade();
      if (controller) {
        this.upgradeController(controller);
      } else {
        // No controller found, go back to harvesting
        this.task = HarvesterTasks.Harvesting;
        this.updateMemoryTask();
      }
    }
  }

  build(site: ConstructionSite) {
    const result = this.creep.build(site);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(site);
    }
  }

  upgradeController(controller: StructureController) {
    const result = this.creep.upgradeController(controller);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(controller);
    }
  }

  findControllerToUpgrade(): StructureController | null {
    return this.creep.room.controller || null;
  }

  private updateMemoryTask() {
    const memory = this.getMemory();
    memory.task = this.task;
    this.setMemory(memory);
  }
}
