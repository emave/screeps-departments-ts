import { CreepTask } from "./types";

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
    // Priority list for construction sites (highest to lowest priority)
    const constructionPriority: StructureConstant[] = [
      STRUCTURE_SPAWN,           // 1. Spawns - critical for creep production
      STRUCTURE_EXTENSION,       // 2. Extensions - increase energy capacity
      STRUCTURE_TOWER,           // 3. Towers - defense
      STRUCTURE_STORAGE,         // 4. Storage - energy management
      STRUCTURE_CONTAINER,       // 5. Containers - energy storage near sources
      STRUCTURE_EXTRACTOR,       // 6. Extractors - mineral harvesting
      STRUCTURE_TERMINAL,        // 7. Terminal - trade and resource transfer
      STRUCTURE_LINK,            // 8. Links - energy transfer
      STRUCTURE_OBSERVER,        // 9. Observer - vision
      STRUCTURE_POWER_SPAWN,     // 10. Power Spawn - power processing
      STRUCTURE_LAB,             // 11. Labs - resource processing
      STRUCTURE_NUKER,           // 12. Nuker - offensive capability
      STRUCTURE_FACTORY,         // 13. Factory - commodity production
      STRUCTURE_WALL,            // 14. Walls - defense structures
      STRUCTURE_RAMPART,         // 15. Ramparts - defense structures
      STRUCTURE_ROAD             // 16. Roads - lowest priority (infrastructure)
    ];

    // Search for construction sites by priority
    for (const structureType of constructionPriority) {
      const sites = this.creep.room.find(FIND_CONSTRUCTION_SITES, {
        filter: (site) => site.structureType === structureType
      });

      if (sites.length > 0) {
        return this.creep.pos.findClosestByPath(sites) || sites[0];
      }
    }

    // Fallback: find any construction site if none match the priority list
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

  /**
   * Switch to a new task and make the creep say it
   * @param newTask The new task to switch to
   * @param message Optional custom message (defaults to the task name)
   */
  switchTask(newTask: CreepTask, message?: string): void {
    this.task = newTask;
    const memory = this.getMemory();
    memory.task = newTask;
    this.setMemory(memory);
    this.creep.say(message || newTask);
  }

  task: string = "";
}
