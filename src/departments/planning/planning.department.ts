// Department for planning base layout
// Manages base layout planning around spawns, extensions, roads, etc.
import { PlanningDepartment } from "../../parts/planningDepartment";

export class BasePlanningDepartment implements PlanningDepartment {
  private static readonly MEMORY_KEY = "planningDepartment";
  private static readonly CIRCLES_PER_PHASE = 3;
  private static readonly MAX_PHASES = 3; // 3 phases = 9 circles total

  constructor() {
    // Initialize default memory if it doesn't exist
    if (!Memory.departments?.[BasePlanningDepartment.MEMORY_KEY]) {
      Memory.departments = Memory.departments || {};
      Memory.departments[BasePlanningDepartment.MEMORY_KEY] = {
        plannedPositions: {},
        lastPlanTick: 0
      };
    }
  }

  run(): void {
    // Plan base layout around spawns
    this.planBaseLayout();
  }

  setMemory(memory: any): void {
    Memory.departments[BasePlanningDepartment.MEMORY_KEY] = {
      ...Memory.departments[BasePlanningDepartment.MEMORY_KEY],
      ...memory
    };
  }

  getMemory(): any {
    return Memory.departments[BasePlanningDepartment.MEMORY_KEY] || {};
  }

  /**
   * Plan base layout around all spawns
   */
  private planBaseLayout(): void {
    const memory = this.getMemory();
    const currentTick = Game.time;
    const lastPlanTick = memory.lastPlanTick || 0;

    // Recheck the plan every 50 ticks
    if (currentTick - lastPlanTick >= 50) {
      // Reset planned positions to force replanning
      memory.plannedPositions = {};
      memory.lastPlanTick = currentTick;
      this.setMemory(memory);
    }

    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      this.planAroundSpawn(spawn);
      this.planRoadsToResources(spawn);
    }
  }

  /**
   * Plan extensions and roads in circles around a spawn
   * Roads go in cardinal/diagonal directions and every third circle
   * Extensions fill the rest
   * Plans in phases: circles 1-3 first, then 4-6 once first phase is built
   */
  private planAroundSpawn(spawn: StructureSpawn): void {
    const memory = this.getMemory();
    const spawnKey = spawn.name;

    // Initialize spawn memory if needed
    if (!memory.plannedPositions) {
      memory.plannedPositions = {};
    }
    if (!memory.spawnPhases) {
      memory.spawnPhases = {};
    }

    // Get current phase for this spawn (starts at 1)
    const currentPhase = memory.spawnPhases[spawnKey] || 1;

    // Check if current phase is already complete
    if (currentPhase > BasePlanningDepartment.MAX_PHASES) {
      return; // All phases complete
    }

    // Calculate radius range for current phase
    const startRadius = (currentPhase - 1) * BasePlanningDepartment.CIRCLES_PER_PHASE + 1;
    const endRadius = currentPhase * BasePlanningDepartment.CIRCLES_PER_PHASE;

    // Check if previous phase circles are fully built before starting new phase
    if (currentPhase > 1) {
      const prevPhaseComplete = this.isPhaseComplete(spawn, currentPhase - 1);
      if (!prevPhaseComplete) {
        return; // Wait for previous phase to complete
      }
    }

    // Plan structures circle by circle for current phase
    for (let radius = startRadius; radius <= endRadius; radius++) {
      this.planCircle(spawn, radius);
    }

    // Check if current phase construction is complete to advance to next phase
    if (this.isPhaseComplete(spawn, currentPhase)) {
      memory.spawnPhases[spawnKey] = currentPhase + 1;
      this.setMemory(memory);
      console.log(`Spawn ${spawnKey} advanced to phase ${currentPhase + 1}`);
    }
  }

  /**
   * Check if all circles in a phase are fully built (no construction sites remaining)
   */
  private isPhaseComplete(spawn: StructureSpawn, phase: number): boolean {
    const startRadius = (phase - 1) * BasePlanningDepartment.CIRCLES_PER_PHASE + 1;
    const endRadius = phase * BasePlanningDepartment.CIRCLES_PER_PHASE;

    for (let radius = startRadius; radius <= endRadius; radius++) {
      const positions = this.getCirclePositions(spawn.pos, radius);

      for (const pos of positions) {
        // Skip invalid positions (walls, etc.)
        if (!this.isPositionValidForCheck(pos)) {
          continue;
        }

        // Check if there's a construction site (not yet built)
        const constructionSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (constructionSites.length > 0) {
          return false; // Still has pending construction
        }

        // Check if position has a planned structure
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const isCardinalOrDiagonal = this.isCardinalOrDiagonal(spawn.pos, pos);
        const isRoadCircle = radius % 3 === 0;

        // If this position should have something but doesn't, phase is not complete
        if (isCardinalOrDiagonal || isRoadCircle) {
          // Should have a road
          if (!structures.some(s => s.structureType === STRUCTURE_ROAD)) {
            // No road yet, might need to plan it
            return false;
          }
        } else {
          // Should have extension or container
          if (!structures.some(s => s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_CONTAINER)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Check if a position is valid for completion checking (terrain only)
   */
  private isPositionValidForCheck(pos: RoomPosition): boolean {
    const room = Game.rooms[pos.roomName];
    if (!room) {
      return false;
    }

    // Check terrain - walls are not walkable
    const terrain = room.getTerrain();
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
      return false;
    }

    // Check if spawn is at this position
    const spawns = pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType === STRUCTURE_SPAWN);
    if (spawns.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Plan a single circle around the spawn
   */
  private planCircle(spawn: StructureSpawn, radius: number): void {
    const isRoadCircle = radius % 3 === 0;
    const positions = this.getCirclePositions(spawn.pos, radius);

    // Calculate current phase based on radius
    const currentPhase = Math.ceil(radius / BasePlanningDepartment.CIRCLES_PER_PHASE);
    const maxContainers = 2 * currentPhase;

    // Count existing containers and container construction sites
    const existingContainers = spawn.room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    }).length;
    const containerSites = spawn.room.find(FIND_CONSTRUCTION_SITES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    }).length;
    let totalContainers = existingContainers + containerSites;

    for (const pos of positions) {
      // Skip if position is not walkable or already has a structure
      if (!this.isPositionValid(pos)) {
        continue;
      }

      const isCardinalOrDiagonal = this.isCardinalOrDiagonal(spawn.pos, pos);

      if (isCardinalOrDiagonal || isRoadCircle) {
        // Place road
        this.placeConstructionSite(pos, STRUCTURE_ROAD);
      } else {
        const maxAvailableExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][spawn.room.controller?.level || 0] || 0;
        const existingExtensions = spawn.room.find(FIND_STRUCTURES, {
          // Check if it's built or under construction
          filter: s => s.structureType === STRUCTURE_EXTENSION
        }).length;
        if (existingExtensions < maxAvailableExtensions) {
          // Place extension
          this.placeConstructionSite(pos, STRUCTURE_EXTENSION);
        } else if (existingExtensions && existingExtensions >= maxAvailableExtensions && totalContainers < maxContainers) {
          // Plan container if extensions are maxed out and under container limit
          this.placeConstructionSite(pos, STRUCTURE_CONTAINER);
          totalContainers++;
        }
      }
    }
  }

  /**
   * Get all positions in a circle around a center point
   */
  private getCirclePositions(center: RoomPosition, radius: number): RoomPosition[] {
    const positions: RoomPosition[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Check if position is on the circle perimeter
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (distance === radius) {
          const x = center.x + dx;
          const y = center.y + dy;

          // Check if within room bounds
          if (x >= 1 && x <= 48 && y >= 1 && y <= 48) {
            positions.push(new RoomPosition(x, y, center.roomName));
          }
        }
      }
    }

    return positions;
  }

  /**
   * Check if a position is on a cardinal (top, right, bottom, left) or diagonal direction from center
   */
  private isCardinalOrDiagonal(center: RoomPosition, pos: RoomPosition): boolean {
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;

    // Cardinal directions: one coordinate is 0
    const isCardinal = dx === 0 || dy === 0;

    // Diagonal directions: absolute values are equal
    const isDiagonal = Math.abs(dx) === Math.abs(dy);

    return isCardinal || isDiagonal;
  }

  /**
   * Check if a position is valid for building
   */
  private isPositionValid(pos: RoomPosition): boolean {
    const room = Game.rooms[pos.roomName];
    if (!room) {
      return false;
    }

    // Check terrain - walls are not walkable
    const terrain = room.getTerrain();
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
      return false;
    }

    // Check if there's already a structure (except roads can overlap with construction sites)
    const structures = pos.lookFor(LOOK_STRUCTURES);
    if (structures.length > 0) {
      return false;
    }

    // Check if spawn is at this position
    const spawns = pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType === STRUCTURE_SPAWN);
    if (spawns.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Place a construction site at a position
   */
  private placeConstructionSite(pos: RoomPosition, structureType: BuildableStructureConstant): void {
    const room = Game.rooms[pos.roomName];
    if (!room) {
      return;
    }

    // Check if construction site already exists
    const existingSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
    if (existingSites.length > 0) {
      return;
    }

    // Check if structure already exists
    const existingStructures = pos.lookFor(LOOK_STRUCTURES).filter(
      s => s.structureType === structureType
    );
    if (existingStructures.length > 0) {
      return;
    }

    // Try to create construction site
    const result = room.createConstructionSite(pos.x, pos.y, structureType);

    if (result === OK) {
      console.log(`Planned ${structureType} at ${pos.x},${pos.y}`);
    } else if (result === ERR_FULL) {
      // Too many construction sites, will retry next tick
    } else if (result === ERR_RCL_NOT_ENOUGH) {
      // Room Controller Level not high enough
    }
  }

  /**
   * Plan roads from the outer circle to sources, controller, and minerals
   */
  private planRoadsToResources(spawn: StructureSpawn): void {
    const room = Game.rooms[spawn.room.name];
    if (!room) {
      return;
    }

    const memory = this.getMemory();
    const roadKey = `${spawn.name}_roads`;

    // Check if we've already planned roads for this spawn
    if (memory.plannedPositions && memory.plannedPositions[roadKey]) {
      return;
    }

    // Find all sources in the room
    const sources = room.find(FIND_SOURCES);

    // Find controller
    const controller = room.controller;

    // Find all minerals in the room
    const minerals = room.find(FIND_MINERALS);

    // Get positions on the third road circle (radius 3, 6, or 9) as starting points
    // Use the innermost road circle (radius 3) to start roads to resources
    const roadCirclePositions = this.getCirclePositions(spawn.pos, 3);

    // Plan roads to each source
    for (const source of sources) {
      this.planRoadPath(roadCirclePositions, source.pos);
    }

    // Plan road to controller if it exists
    if (controller) {
      this.planRoadPath(roadCirclePositions, controller.pos);
    }

    // Plan roads to each mineral
    for (const mineral of minerals) {
      this.planRoadPath(roadCirclePositions, mineral.pos);
    }

    // Mark roads as planned
    if (!memory.plannedPositions) {
      memory.plannedPositions = {};
    }
    memory.plannedPositions[roadKey] = true;
    this.setMemory(memory);
  }

  /**
   * Plan a road path from the outer circle to a target position
   */
  private planRoadPath(startPositions: RoomPosition[], target: RoomPosition): void {
    const room = Game.rooms[target.roomName];
    if (!room) {
      return;
    }

    // Find the closest position on the outer circle to the target
    let closestPos: RoomPosition | null = null;
    let minDistance = Infinity;

    for (const pos of startPositions) {
      const distance = pos.getRangeTo(target);
      if (distance < minDistance) {
        minDistance = distance;
        closestPos = pos;
      }
    }

    if (!closestPos) {
      return;
    }

    // Use PathFinder to find the path
    const result = PathFinder.search(
      closestPos,
      { pos: target, range: 1 },
      {
        plainCost: 2,
        swampCost: 10,
        roomCallback: (roomName: string) => {
          const room = Game.rooms[roomName];
          if (!room) return false;

          const costs = new PathFinder.CostMatrix();

          // Mark existing structures as obstacles (except roads)
          room.find(FIND_STRUCTURES).forEach(struct => {
            if (struct.structureType !== STRUCTURE_ROAD && struct.structureType !== STRUCTURE_CONTAINER) {
              costs.set(struct.pos.x, struct.pos.y, 0xff);
            }
          });

          // Mark construction sites as obstacles (except roads)
          room.find(FIND_CONSTRUCTION_SITES).forEach(site => {
            if (site.structureType !== STRUCTURE_ROAD) {
              costs.set(site.pos.x, site.pos.y, 0xff);
            }
          });

          return costs;
        }
      }
    );

    // Place road construction sites along the path
    if (!result.incomplete) {
      for (const pos of result.path) {
        // Skip if too close to target (within 1 tile)
        if (pos.getRangeTo(target) <= 1) {
          continue;
        }

        this.placeConstructionSite(pos, STRUCTURE_ROAD);
      }
    }
  }
}
