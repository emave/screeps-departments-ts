import { WorkerBehavior } from "./worker.behavior";

export class MinerBehavior extends WorkerBehavior {
  constructor(creep: Creep) {
    super(creep);
  }

  run(): void {
    this.setWorkingState();
    if (this.isWorking()) {
      this.work();
    }
  }

  work(): void {
    const source = this.getNearestEnergySource();
    if (source) {
      this.moveToTarget(source, (creep: Creep) => {
        creep.harvest(source);
      });
    }
  }
}
