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

  run(): void {;
    switch (this.task) {
      case BuilderTasks.Harvesting:
        this.harvestTask();
        break;
      case BuilderTasks.Building:
        this.buildTask();
        break;
      case BuilderTasks.Upgrading:
        this.upgradeTask();
        break;
      default:
        console.log(`Unknown task for builder ${this.creep.name}: ${this.task}`);
    }
  }

  harvestTask() {
    // Switch to building/upgrading when store is full
    if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      const site = this.findConstructionSite();
      if (site) {
        this.switchTask(BuilderTasks.Building, '🔨 Building');
      } else {
        this.switchTask(BuilderTasks.Upgrading, '⚡ Upgrading');
      }
      return;
    }

    this.harvest(this.getSpecificSource());
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
      // If no construction sites, switch to upgrading
      this.switchTask(BuilderTasks.Upgrading, '⚡ Upgrading');
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
}
