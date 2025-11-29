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
    console.log(`Builder ${this.creep.name} executing task: ${this.task}`);
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
        this.task = BuilderTasks.Building;
      } else {
        this.task = BuilderTasks.Upgrading;
      }
      this.setMemory({ task: this.task });
      return;
    }

    this.harvest(this.getSpecificSource());
  }

  buildTask() {
    // Switch to harvesting when store is empty
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.task = BuilderTasks.Harvesting;
      this.setMemory({ task: this.task });
      return;
    }

    const site = this.findConstructionSite();
    if (site) {
      this.build(site);
    } else {
      // If no construction sites, switch to upgrading
      this.task = BuilderTasks.Upgrading;
      this.setMemory({ task: this.task });
    }
  }

  upgradeTask() {
    // Switch to harvesting when store is empty
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.task = BuilderTasks.Harvesting;
      this.setMemory({ task: this.task });
      return;
    }

    const controller = this.findControllerToUpgrade();
    if (controller) {
      this.upgradeController(controller);
    }
  }
}
