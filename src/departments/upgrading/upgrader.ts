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
    this.upgradeTask();
  }

  upgradeTask() {
    // Switch to supplying when store is full
    if (this.task === UpgraderTasks.Harvesting && this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      this.switchTask(UpgraderTasks.Upgrading, '⚡ Upgrading');
    }

    // Switch to harvesting when store is empty
    if (this.task === UpgraderTasks.Upgrading && this.creep.store[RESOURCE_ENERGY] === 0) {
      this.switchTask(UpgraderTasks.Harvesting, '⛏️ Harvesting');
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
