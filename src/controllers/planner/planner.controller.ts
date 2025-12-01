export class PlannerController {
  private room: Room;
  private spawn: StructureSpawn;

  constructor(spawn: StructureSpawn) {
    this.spawn = spawn;
    this.room = spawn.room;
  }

  public run(): void {
    // Run planning every 100 ticks to avoid excessive CPU usage
    if (Game.time % 100 !== 0) return;

    const controller = this.room.controller;
    if (!controller || !controller.my) return;

    this.planRoadsToSources();
    this.planStructuresByControllerLevel(controller.level);
  }

  /**
   * Plan roads to all sources in the room
   */
  private planRoadsToSources(): void {
    const sources = this.room.find(FIND_SOURCES);

    sources.forEach(source => {
      const path = this.room.findPath(this.spawn.pos, source.pos, {
        ignoreCreeps: true,
        swampCost: 2,
        plainCost: 1
      });

      path.forEach(step => {
        // Check if there's already a road or construction site
        const existingStructures = this.room.lookForAt(LOOK_STRUCTURES, step.x, step.y);
        const existingRoad = existingStructures.find(s => s.structureType === STRUCTURE_ROAD);

        if (!existingRoad) {
          const existingSites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, step.x, step.y);
          if (existingSites.length === 0) {
            this.room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
          }
        }
      });
    });

    // Also plan road to controller
    if (this.room.controller) {
      const pathToController = this.room.findPath(this.spawn.pos, this.room.controller.pos, {
        ignoreCreeps: true,
        swampCost: 2,
        plainCost: 1
      });

      pathToController.forEach(step => {
        const existingStructures = this.room.lookForAt(LOOK_STRUCTURES, step.x, step.y);
        const existingRoad = existingStructures.find(s => s.structureType === STRUCTURE_ROAD);

        if (!existingRoad) {
          const existingSites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, step.x, step.y);
          if (existingSites.length === 0) {
            this.room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
          }
        }
      });
    }
  }

  /**
   * Plan structures based on controller level and available construction limits
   */
  private planStructuresByControllerLevel(level: number): void {
    const structurePlans = this.getStructurePlansByLevel(level);

    for (const [structureType, maxCount] of Object.entries(structurePlans)) {
      this.planStructure(structureType as BuildableStructureConstant, maxCount);
    }
  }

  /**
   * Get structure construction limits by controller level
   */
  private getStructurePlansByLevel(level: number): Record<BuildableStructureConstant, number> {
    const plans: Record<BuildableStructureConstant, number> = {
      [STRUCTURE_EXTENSION]: 0,
      [STRUCTURE_TOWER]: 0,
      [STRUCTURE_CONTAINER]: 0,
      [STRUCTURE_STORAGE]: 0,
      [STRUCTURE_LINK]: 0,
      [STRUCTURE_TERMINAL]: 0,
      [STRUCTURE_LAB]: 0,
      [STRUCTURE_FACTORY]: 0,
      [STRUCTURE_OBSERVER]: 0,
      [STRUCTURE_POWER_SPAWN]: 0,
      [STRUCTURE_EXTRACTOR]: 0,
      [STRUCTURE_NUKER]: 0,
      [STRUCTURE_RAMPART]: 0,
      [STRUCTURE_WALL]: 0,
      [STRUCTURE_ROAD]: 0,
      [STRUCTURE_SPAWN]: 0
    };

    // Extensions by level
    if (level >= 1) plans[STRUCTURE_EXTENSION] = 0;
    if (level >= 2) plans[STRUCTURE_EXTENSION] = 5;
    if (level >= 3) plans[STRUCTURE_EXTENSION] = 10;
    if (level >= 4) plans[STRUCTURE_EXTENSION] = 20;
    if (level >= 5) plans[STRUCTURE_EXTENSION] = 30;
    if (level >= 6) plans[STRUCTURE_EXTENSION] = 40;
    if (level >= 7) plans[STRUCTURE_EXTENSION] = 50;
    if (level >= 8) plans[STRUCTURE_EXTENSION] = 60;

    // Towers
    if (level >= 3) plans[STRUCTURE_TOWER] = 1;
    if (level >= 5) plans[STRUCTURE_TOWER] = 2;
    if (level >= 7) plans[STRUCTURE_TOWER] = 3;
    if (level >= 8) plans[STRUCTURE_TOWER] = 6;

    // Containers
    if (level >= 1) plans[STRUCTURE_CONTAINER] = 5;

    // Storage
    if (level >= 4) plans[STRUCTURE_STORAGE] = 1;

    // Links
    if (level >= 5) plans[STRUCTURE_LINK] = 2;
    if (level >= 6) plans[STRUCTURE_LINK] = 3;
    if (level >= 7) plans[STRUCTURE_LINK] = 4;
    if (level >= 8) plans[STRUCTURE_LINK] = 6;

    // Terminal
    if (level >= 6) plans[STRUCTURE_TERMINAL] = 1;

    // Labs
    if (level >= 6) plans[STRUCTURE_LAB] = 3;
    if (level >= 7) plans[STRUCTURE_LAB] = 6;
    if (level >= 8) plans[STRUCTURE_LAB] = 10;

    // Factory
    if (level >= 7) plans[STRUCTURE_FACTORY] = 1;

    // Observer
    if (level >= 8) plans[STRUCTURE_OBSERVER] = 1;

    // Power Spawn
    if (level >= 8) plans[STRUCTURE_POWER_SPAWN] = 1;

    // Extractor
    if (level >= 6) plans[STRUCTURE_EXTRACTOR] = 1;

    // Nuker
    if (level >= 8) plans[STRUCTURE_NUKER] = 1;

    // Additional spawns
    if (level >= 7) plans[STRUCTURE_SPAWN] = 2;
    if (level >= 8) plans[STRUCTURE_SPAWN] = 3;

    return plans;
  }

  /**
   * Plan a specific structure type up to the maximum count
   */
  private planStructure(structureType: BuildableStructureConstant, maxCount: number): void {
    // Count existing structures
    const existingStructures = this.room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === structureType
    });

    const existingSites = this.room.find(FIND_CONSTRUCTION_SITES, {
      filter: s => s.structureType === structureType
    });

    const totalCount = existingStructures.length + existingSites.length;

    if (totalCount >= maxCount) return;

    const needToBuild = maxCount - totalCount;

    // Special handling for different structure types
    switch (structureType) {
      case STRUCTURE_EXTENSION:
        this.planExtensions(needToBuild);
        break;
      case STRUCTURE_TOWER:
        this.planTowers(needToBuild);
        break;
      case STRUCTURE_CONTAINER:
        this.planContainers(needToBuild);
        break;
      case STRUCTURE_STORAGE:
        this.planStorage(needToBuild);
        break;
      case STRUCTURE_EXTRACTOR:
        this.planExtractor();
        break;
      case STRUCTURE_SPAWN:
        this.planSpawn(needToBuild);
        break;
      default:
        // Generic placement near spawn for other structures
        this.planGenericStructure(structureType, needToBuild);
        break;
    }
  }

  /**
   * Plan extensions in a grid pattern around the spawn
   */
  private planExtensions(count: number): void {
    const positions = this.findBuildablePositionsNearSpawn(count, 3);
    positions.slice(0, count).forEach(pos => {
      this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTENSION);
    });
  }

  /**
   * Plan towers in strategic defensive positions
   */
  private planTowers(count: number): void {
    const positions = this.findBuildablePositionsNearSpawn(count, 5);
    positions.slice(0, count).forEach(pos => {
      this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
    });
  }

  /**
   * Plan containers at source locations
   */
  private planContainers(count: number): void {
    const sources = this.room.find(FIND_SOURCES);
    let placed = 0;

    for (const source of sources) {
      if (placed >= count) break;

      // Find position adjacent to source
      const pos = this.findPositionNear(source.pos, 1);
      if (pos) {
        const result = this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
        if (result === OK) placed++;
      }
    }

    // Place container near controller if needed
    if (placed < count && this.room.controller) {
      const pos = this.findPositionNear(this.room.controller.pos, 2);
      if (pos) {
        this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
      }
    }
  }

  /**
   * Plan storage near spawn
   */
  private planStorage(count: number): void {
    if (count <= 0) return;
    const positions = this.findBuildablePositionsNearSpawn(1, 3);
    if (positions.length > 0) {
      this.room.createConstructionSite(positions[0].x, positions[0].y, STRUCTURE_STORAGE);
    }
  }

  /**
   * Plan extractor on mineral
   */
  private planExtractor(): void {
    const minerals = this.room.find(FIND_MINERALS);
    if (minerals.length > 0) {
      const mineral = minerals[0];
      this.room.createConstructionSite(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR);
    }
  }

  /**
   * Plan additional spawns
   */
  private planSpawn(count: number): void {
    const positions = this.findBuildablePositionsNearSpawn(count, 5);
    positions.slice(0, count).forEach(pos => {
      this.room.createConstructionSite(pos.x, pos.y, STRUCTURE_SPAWN);
    });
  }

  /**
   * Generic structure placement
   */
  private planGenericStructure(structureType: BuildableStructureConstant, count: number): void {
    const positions = this.findBuildablePositionsNearSpawn(count, 4);
    positions.slice(0, count).forEach(pos => {
      this.room.createConstructionSite(pos.x, pos.y, structureType);
    });
  }

  /**
   * Find buildable positions near spawn in a spiral pattern
   */
  private findBuildablePositionsNearSpawn(count: number, minRange: number = 2): RoomPosition[] {
    const positions: RoomPosition[] = [];
    const checked = new Set<string>();

    for (let range = minRange; range <= 10 && positions.length < count; range++) {
      const area = this.room.lookAtArea(
        Math.max(1, this.spawn.pos.y - range),
        Math.max(1, this.spawn.pos.x - range),
        Math.min(48, this.spawn.pos.y + range),
        Math.min(48, this.spawn.pos.x + range),
        true
      );

      for (const item of area) {
        const key = `${item.x},${item.y}`;
        if (checked.has(key)) continue;
        checked.add(key);

        if (this.isPositionBuildable(item.x, item.y)) {
          positions.push(new RoomPosition(item.x, item.y, this.room.name));
          if (positions.length >= count) break;
        }
      }
    }

    return positions;
  }

  /**
   * Find a buildable position near a target
   */
  private findPositionNear(target: RoomPosition, range: number): RoomPosition | null {
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue;

        const x = target.x + dx;
        const y = target.y + dy;

        if (x < 1 || x > 48 || y < 1 || y > 48) continue;

        if (this.isPositionBuildable(x, y)) {
          return new RoomPosition(x, y, this.room.name);
        }
      }
    }
    return null;
  }

  /**
   * Check if a position is buildable
   */
  private isPositionBuildable(x: number, y: number): boolean {
    // Check terrain
    const terrain = this.room.getTerrain();
    if (terrain.get(x, y) === TERRAIN_MASK_WALL) return false;

    // Check existing structures
    const structures = this.room.lookForAt(LOOK_STRUCTURES, x, y);
    if (structures.length > 0) {
      // Allow roads to be built over
      const nonRoadStructures = structures.filter(s => s.structureType !== STRUCTURE_ROAD);
      if (nonRoadStructures.length > 0) return false;
    }

    // Check construction sites
    const sites = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
    if (sites.length > 0) return false;

    return true;
  }
}
