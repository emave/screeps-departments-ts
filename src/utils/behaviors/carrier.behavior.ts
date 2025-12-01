import { WorkerBehavior } from "./worker.behavior";

export class CarrierBehavior extends WorkerBehavior {
  constructor(creep: Creep) {
    super(creep);
  }

  run(): void {
    this.setWorkingState();
    if (this.isWorking()) {
      this.supply();
    } else {
      this.collect();
    }
  }

  supply(): void {
    const target = this.getNearestExtensionOrSpawnNeedingEnergy();
    if (target) {
      const success = this.moveToTarget(target, (creep: Creep) => {
        creep.transfer(target, RESOURCE_ENERGY);
      });
      // If target should be ignored after multiple flees, the creep will try a different target next tick
    }
  }

  collect(): void {
    const target = this.getNearestDroppedResource();
    if (target) {
      const success = this.moveToTarget(target, (creep: Creep) => {
        creep.pickup(target);
      });
      // If target should be ignored after multiple flees, the creep will try a different target next tick
    }
  }
}
