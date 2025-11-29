export interface IWorker {
  creep: Creep;
  run(): void;

  moveTo(
    target: RoomPosition | { pos: RoomPosition }
  ): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND;
}

// This is the base of a worker creep that can be extended for specific roles.
export class Worker implements IWorker {
  creep: Creep;

  constructor(creep: Creep) {
    this.creep = creep;
  }

  run() {}

  moveTo(
    target: RoomPosition | { pos: RoomPosition }
  ): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND {
    return this.creep.moveTo(target);
  }

  getMemory(): CreepMemory {
    return this.creep.memory as CreepMemory;
  }

  setMemory(memory: Partial<CreepMemory>): void {
    // Update only provided fields in memory
    Object.assign(this.creep.memory, memory);
  }

  // Common worker methods

  harvest(source?: Source | null): void {
    if (!source) {
      source = this.findClosestSource();
    }

    if (source) {
      const result = this.creep.harvest(source);
      if (result === ERR_NOT_IN_RANGE) {
        const moveResult = this.moveTo(source);

        // If path is blocked, find an alternative source
        if (moveResult === ERR_NO_PATH) {
          const alternativeSource = this.findAlternativeSource(source.id);
          if (alternativeSource) {
            // Remember the new source and try harvesting it
            this.setLastHarvestedSource(alternativeSource.id);
            this.harvest(alternativeSource);
          }
        }
      } else if (result === OK) {
        // Successfully harvesting, remember this source
        this.setLastHarvestedSource(source.id);
      }
    }
  }

  findAlternativeSource(excludeSourceId: Id<Source>): Source | null {
    const sources = this.creep.room.find(FIND_SOURCES, {
      filter: (s) => s.id !== excludeSourceId && s.energy > 0
    });

    if (sources.length === 0) {
      return null;
    }

    // Find the closest alternative source by path
    return this.creep.pos.findClosestByPath(sources) || sources[0];
  }

  findClosestSource(): Source {
    // First, try to use the last harvested source
    const lastSource = this.getLastHarvestedSource();
    if (lastSource && lastSource.energy > 0) {
      return lastSource;
    }

    // If no last source or it's depleted, find the closest one
    let source = this.creep.pos.findClosestByPath(FIND_SOURCES);
    if (!source) {
      source = this.creep.room.find(FIND_SOURCES)[0];
    }
    return source;
  }

  setLastHarvestedSource(sourceId: Id<Source>): void {
    const memory = this.getMemory();
    memory.lastHarvestedSourceId = sourceId;
    this.setMemory(memory);
  }

  getLastHarvestedSource(): Source | null {
    const memory = this.getMemory();
    if (memory.lastHarvestedSourceId) {
      return Game.getObjectById(memory.lastHarvestedSourceId);
    }
    return null;
  }

  upgradeController(controller: StructureController): void {
    const result = this.creep.upgradeController(controller);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(controller);
    }
  }

  findControllerToUpgrade(): StructureController | null {
    return this.creep.room.controller || null;
  }

  build(site: ConstructionSite): void {
    const result = this.creep.build(site);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(site);
    }
  }

  findConstructionSite(): ConstructionSite | null {
    let site = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
    if (!site) {
      const sites = this.creep.room.find(FIND_CONSTRUCTION_SITES);
      site = sites.length > 0 ? sites[0] : null;
    }
    return site;
  }

  setSpecificSourceId(sourceId: Id<Source>): void {
    const memory = this.getMemory();
    memory.specificSourceId = sourceId;
    this.setMemory(memory);
  }

  getSpecificSource(): Source | null {
    const memory = this.getMemory();
    return Game.getObjectById(memory.specificSourceId!);
  }
}
