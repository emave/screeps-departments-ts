import { BuilderTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IBuilder extends IWorker {}

export class Builder extends Worker implements IBuilder {
  task: BuilderTasks = BuilderTasks.Harvesting;

  constructor(creep: Creep) {
    super(creep);

    const memory = this.getMemory();
    this.task = memory.task as BuilderTasks;

    // Initialize task if not set
    if (!this.task) {
      this.task = BuilderTasks.Harvesting;
      this.setMemory({ task: this.task });
    }
  }

  run(): void {
    switch (this.task) {
      case BuilderTasks.Harvesting:
        this.harvestTask();
        break;
      case BuilderTasks.Building:
        this.buildTask();
        break;
      case BuilderTasks.Repairing:
        this.repairTask();
        break;
      case BuilderTasks.Upgrading:
        this.upgradeTask();
        break;
      default:
        console.log(`Unknown task for builder ${this.creep.name}: ${this.task}`);
    }
  }

  harvestTask() {
    // Switch to building/repairing/upgrading when store is full
    if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      const site = this.findConstructionSite();
      if (site) {
        this.switchTask(BuilderTasks.Building, '🔨 Building');
        return;
      }

      const structureToRepair = this.findStructureToRepair();
      if (structureToRepair) {
        this.switchTask(BuilderTasks.Repairing, '🔧 Repairing');
        return;
      }

      this.switchTask(BuilderTasks.Upgrading, '⚡ Upgrading');
      return;
    }

    // Try to withdraw from containers first
    const container = this.findContainerWithEnergy();
    if (container) {
      this.withdrawFromContainer(container);
      return;
    }

    this.harvest(this.getSpecificSource());
  }

  findClosestSource(): Source {
    // First, try to use the last harvested source
    const lastSource = this.getLastHarvestedSource();
    if (lastSource && lastSource.energy > 0) {
      return lastSource;
    }

    // If no last source or it's depleted, find the closest one
    let source = this.creep.pos.findClosestByPath(FIND_SOURCES);
    if (!source) {
      source = this.creep.room.find(FIND_SOURCES)[0];
    }
    return source;
  }

  buildTask() {
    // Switch to harvesting when store is empty
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.switchTask(BuilderTasks.Harvesting, '⛏️ Harvesting');
      return;
    }

    const site = this.findConstructionSite();
    if (site) {
      this.build(site);
    } else {
      // If no construction sites, check for repairs
      const structureToRepair = this.findStructureToRepair();
      if (structureToRepair) {
        this.switchTask(BuilderTasks.Repairing, '🔧 Repairing');
      } else {
        // If nothing to repair, switch to upgrading
        this.switchTask(BuilderTasks.Upgrading, '⚡ Upgrading');
      }
    }
  }

  repairTask() {
    // Switch to harvesting when store is empty
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.switchTask(BuilderTasks.Harvesting, '⛏️ Harvesting');
      return;
    }

    const structureToRepair = this.findStructureToRepair();
    if (structureToRepair) {
      this.repair(structureToRepair);
    } else {
      // If nothing to repair, check for construction sites
      const site = this.findConstructionSite();
      if (site) {
        this.switchTask(BuilderTasks.Building, '🔨 Building');
      } else {
        // If nothing to build, switch to upgrading
        this.switchTask(BuilderTasks.Upgrading, '⚡ Upgrading');
      }
    }
  }

  upgradeTask() {
    // Switch to harvesting when store is empty
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.switchTask(BuilderTasks.Harvesting, '⛏️ Harvesting');
      return;
    }

    const controller = this.findControllerToUpgrade();
    if (controller) {
      this.upgradeController(controller);
    }
  }

  findContainerWithEnergy(): StructureContainer | null {
    const containers = this.creep.room.find(FIND_STRUCTURES, {
      filter: (s): s is StructureContainer =>
        s.structureType === STRUCTURE_CONTAINER &&
        s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });

    if (containers.length === 0) {
      return null;
    }

    // Find the closest container with energy
    return this.creep.pos.findClosestByPath(containers) || containers[0];
  }

  withdrawFromContainer(container: StructureContainer): void {
    const result = this.creep.withdraw(container, RESOURCE_ENERGY);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(container);
    }
  }
}
