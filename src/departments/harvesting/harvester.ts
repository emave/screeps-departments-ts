import { HarvesterTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IHarvester extends IWorker {
  findStructureInNeed(): AnyStructure | null;
}

const structurePriority = {
  [STRUCTURE_EXTENSION]: 1,
  [STRUCTURE_SPAWN]: 2,
  [STRUCTURE_TOWER]: 3,
  [STRUCTURE_CONTAINER]: 4,
  [STRUCTURE_STORAGE]: 5,
};

type StructureTypes = StructureExtension | StructureSpawn | StructureTower | StructureContainer | StructureStorage;

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
          this.switchTask(HarvesterTasks.Building, '🔨 Building');
          this.buildTask();
        } else {
          this.switchTask(HarvesterTasks.Upgrading, '⚡ Upgrading');
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

  findStructureInNeed(): AnyStructure | null {
    const structures = this.creep.room.find(FIND_STRUCTURES, {
      filter: filterStructuresInNeed
    }) as StructureTypes[];

    if (structures.length === 0) {
      return null;
    }

    // Sort by priority (lower number = higher priority), then by distance
    structures.sort((a, b) => {
      const priorityA = structurePriority[a.structureType as keyof typeof structurePriority];
      const priorityB = structurePriority[b.structureType as keyof typeof structurePriority];

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Same priority, prefer closer structure
      const distA = this.creep.pos.getRangeTo(a);
      const distB = this.creep.pos.getRangeTo(b);
      return distA - distB;
    });

    return structures[0];
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

  buildTask() {
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.switchTask(HarvesterTasks.Harvesting, '⛏️ Harvesting');
      this.harvest(this.getSpecificSource());
    } else {
      const site = this.findConstructionSite();
      if (site) {
        this.build(site);
      } else {
        // No construction sites, switch to upgrading
        this.switchTask(HarvesterTasks.Upgrading, '⚡ Upgrading');
        this.upgradeTask();
      }
    }
  }

  upgradeTask() {
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.switchTask(HarvesterTasks.Harvesting, '⛏️ Harvesting');
      this.harvest(this.getSpecificSource());
    } else {
      const controller = this.findControllerToUpgrade();
      if (controller) {
        this.upgradeController(controller);
      } else {
        // No controller found, go back to harvesting
        this.switchTask(HarvesterTasks.Harvesting, '⛏️ Harvesting');
      }
    }
  }
}
