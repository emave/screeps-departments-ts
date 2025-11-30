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
      this.moveToTarget(target, (creep: Creep) => {
        creep.transfer(target, RESOURCE_ENERGY);
      });
    }
  }

  collect(): void {
    const target = this.getNearestDroppedResource();
    if (target) {
      this.moveToTarget(target, (creep: Creep) => {
        creep.pickup(target);
      });
    }
  }
}
