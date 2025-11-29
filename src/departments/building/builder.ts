import { BuilderTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IBuilder extends IWorker {
  findClosestSource(): Source;
  findConstructionSite(): ConstructionSite | null;
  findControllerToUpgrade(): StructureController | null;

  harvest(source: Source): void;
  build(site: ConstructionSite): void;
  upgradeController(controller: StructureController): void;
}

export class Builder extends Worker implements IBuilder {
  task: BuilderTasks = BuilderTasks.Building;

  constructor(creep: Creep) {
    super(creep);

    const memory = this.getMemory();
    this.task = memory.task as BuilderTasks;
  }

  run(): void {
    console.log(`Builder ${this.creep.name} executing task: ${this.task}`);
    switch (this.task) {
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

  buildTask() {
    if (this.creep.store[RESOURCE_ENERGY] === 0) {
      this.harvest(this.getSpecificSource());
    } else {
      const site = this.findConstructionSite();
      if (site) {
        this.build(site);
      } else {
        // If no construction sites, switch to upgrading
        this.task = BuilderTasks.Upgrading;
        this.upgradeTask();
      }
    }
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

  build(site: ConstructionSite) {
    const result = this.creep.build(site);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(site);
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

  findConstructionSite(): ConstructionSite | null {
    let site = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
    if (!site) {
      const sites = this.creep.room.find(FIND_CONSTRUCTION_SITES);
      site = sites.length > 0 ? sites[0] : null;
    }
    return site;
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
