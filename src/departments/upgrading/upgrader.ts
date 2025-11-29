import { UpgraderTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IUpgrader extends IWorker {}

export class Upgrader extends Worker implements IUpgrader {
  task: UpgraderTasks = UpgraderTasks.Harvesting;

  constructor(creep: Creep) {
    super(creep);

    const memory = this.getMemory();
    this.task = memory.task as UpgraderTasks;

    // Initialize task if not set
    if (!this.task) {
      this.task = UpgraderTasks.Harvesting;
      this.setMemory({ task: this.task });
    }
  }

  run(): void {
    console.log(`Upgrader ${this.creep.name} executing task: ${this.task}`);
    this.upgradeTask();
  }

  upgradeTask() {
    // Switch to supplying when store is full
    if (this.task === UpgraderTasks.Harvesting && this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      this.task = UpgraderTasks.Upgrading;
      this.setMemory({ task: this.task });
    }

    // Switch to harvesting when store is empty
    if (this.task === UpgraderTasks.Upgrading && this.creep.store[RESOURCE_ENERGY] === 0) {
      this.task = UpgraderTasks.Harvesting;
      this.setMemory({ task: this.task });
    }

    if (this.task === UpgraderTasks.Harvesting) {
      this.harvest(this.getSpecificSource());
    } else if (this.task === UpgraderTasks.Upgrading) {
      const controller = this.findControllerToUpgrade();
      if (controller) {
        this.upgradeController(controller);
      }
    }
  }
}
