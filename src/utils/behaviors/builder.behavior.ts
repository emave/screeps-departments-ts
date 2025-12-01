import { WorkerBehavior } from "./worker.behavior";

export class BuilderBehavior extends WorkerBehavior {
  constructor(creep: Creep) {
    super(creep);
  }

  run(): void {
    this.setWorkingState();
    if (this.isWorking()) {
      this.build();
    } else {
      this.collect();
    }
  }

  build(): void {
    const constructionSite = this.getNearestConstructionSite();
    if (constructionSite) {
      const success = this.moveToTarget(constructionSite, (creep: Creep) => {
        creep.build(constructionSite);
      });
      // If target should be ignored after multiple flees, the creep will try a different construction site next tick
    }
  }

  collect(): void {
    const container = this.getNearestContainerWithEnergy();
    if (container) {
      const success = this.moveToTarget(container, (creep: Creep) => {
        creep.withdraw(container, RESOURCE_ENERGY);
      });
      return;
    }

    const storage = this.getNearestStorageWithEnergy();
    if (storage) {
      const success = this.moveToTarget(storage, (creep: Creep) => {
        creep.withdraw(storage, RESOURCE_ENERGY);
      });
      return;
    }

    const droppedResource = this.getNearestDroppedResource();
    if (droppedResource) {
      const success = this.moveToTarget(droppedResource, (creep: Creep) => {
        creep.pickup(droppedResource);
      });
      return;
    }

    const source = this.getNearestEnergySource();
    if (source) {
      const success = this.moveToTarget(source, (creep: Creep) => {
        creep.harvest(source);
      });
      // If target should be ignored after multiple flees, the creep will try a different source next tick
    }
  }
}
