import { UpgraderTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IUpgrader extends IWorker {
  findClosestSource(): Source;
  findControllerToUpgrade(): StructureController | null;

  harvest(source: Source): void;
  upgradeController(controller: StructureController): void;
}

export class Upgrader extends Worker implements IUpgrader {
  task: UpgraderTasks = UpgraderTasks.Upgrading;

  constructor(creep: Creep) {
    super(creep);

    const memory = this.getMemory();
    this.task = memory.task as UpgraderTasks;
  }

  run(): void {
    console.log(`Upgrader ${this.creep.name} executing task: ${this.task}`);
    this.upgradeTask();
  }

  upgradeTask() {
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.harvest(this.getSpecificSource());
    } else {
      const controller = this.findControllerToUpgrade();
      if (controller) {
        this.upgradeController(controller);
      }
    }
  }

  harvest(source?: Source | null) {
    if (!source) {
      source = this.findClosestSource();
    }

    if (source) {
      const result = this.creep.harvest(source);
      if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(source);
      }
    }
  }

  upgradeController(controller: StructureController) {
    const result = this.creep.upgradeController(controller);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(controller);
    }
  }

  findClosestSource(): Source {
    let source = this.creep.pos.findClosestByPath(FIND_SOURCES);
    if (!source) {
      source = this.creep.room.find(FIND_SOURCES)[0];
    }
    return source;
  }

  findControllerToUpgrade(): StructureController | null {
    return this.creep.room.controller || null;
  }

  setSpecificSourceId(sourceId: Id<Source>) {
    const memory = this.getMemory();
    memory.specificSourceId = sourceId;
    this.setMemory(memory);
  }

  getSpecificSource(): Source | null {
    const memory = this.getMemory();
    return Game.getObjectById(memory.specificSourceId!);
  }
}
