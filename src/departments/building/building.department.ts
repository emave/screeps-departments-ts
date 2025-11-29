// Department for building creeps
// Manages amount of builders and their tasks
import { BuilderTasks, WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { Builder, IBuilder } from "./builder";

export class BuildingDepartment implements Department {
  maxWorkersCount: number = 0;
  defaultWorkerBody: BodyPartConstant[] = [WORK, CARRY, MOVE];
  private materialsPercentage: number = 0.4;
  private static readonly MEMORY_KEY = "buildingDepartment";
  private static readonly MAX_CIRCLE_RADIUS = 8;

  constructor(maxWorkersCount?: number, defaultWorkerBody?: BodyPartConstant[]) {
    if (maxWorkersCount) {
      this.maxWorkersCount = maxWorkersCount;
    }
    if (defaultWorkerBody) {
      this.defaultWorkerBody = defaultWorkerBody;
    }

    // Initialize default memory if it doesn't exist
    if (!Memory.departments?.[BuildingDepartment.MEMORY_KEY]) {
      Memory.departments = Memory.departments || {};
      Memory.departments[BuildingDepartment.MEMORY_KEY] = {
        priority: 2,
        maxWorkersCount: this.maxWorkersCount,
        materialsPercentage: this.materialsPercentage,
        plannedPositions: {}
      };
    }
  }

    updateStateFromMemory(): void {
        const memory = this.getMemory();
        this.maxWorkersCount = memory.maxWorkersCount || this.maxWorkersCount;
        this.materialsPercentage = memory.materialsPercentage || this.materialsPercentage;
    }

  run(): void {
    this.updateStateFromMemory();
    // Plan base layout around spawns
    this.planBaseLayout();

    // Spawn workers if needed
    this.spawnBestWorkerPossible();

    // Run all workers
    const workers = this.getWorkers();
    console.log(`Running ${workers.length} builders`);
    workers.forEach(worker => {
      worker.run();
    });
  }

  getAvailableMaterials(): number {
    // Calculate total energy available across all spawns
    let totalEnergy = 0;
    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      totalEnergy += spawn.store.getUsedCapacity(RESOURCE_ENERGY);
    }
    return Math.floor(totalEnergy * this.materialsPercentage);
  }

  getWorkers(): IBuilder[] {
    const workers: IBuilder[] = [];
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.memory.role === WorkerRoles.Builder) {
        workers.push(new Builder(creep));
      }
    }
    return workers;
  }

  checkIfNewWorkerCanBeUpgraded(): boolean {
    const availableEnergy = this.getAvailableMaterials();
    const upgradedBody = this.getAnUpgradedWorkerBody();
    const upgradedCost = this.calculateBodyCost(upgradedBody);
    return availableEnergy >= upgradedCost;
  }

  getAnUpgradedWorkerBody(): BodyPartConstant[] {
    // Upgrade by adding parts one at a time, prioritizing WORK
    const upgradedBody = [...this.defaultWorkerBody];
    const availableEnergy = this.getAvailableMaterials();

    // Priority order: WORK, CARRY, MOVE
    const partPriority: BodyPartConstant[] = [WORK, CARRY, MOVE];

    // Keep trying to add parts one at a time until we run out of energy or reach the limit
    let priorityIndex = 0;
    while (upgradedBody.length < 50) {
      const partToAdd = partPriority[priorityIndex % partPriority.length];
      const newCost = this.calculateBodyCost([...upgradedBody, partToAdd]);

      if (newCost <= availableEnergy) {
        upgradedBody.push(partToAdd);
        priorityIndex++;
      } else {
        // If current priority part doesn't fit, try next priority
        const nextIndex = (priorityIndex % partPriority.length) + 1;
        if (nextIndex >= partPriority.length) {
          // We've tried all part types and none fit
          break;
        }
        priorityIndex = Math.floor(priorityIndex / partPriority.length) * partPriority.length + nextIndex;

        // Check if we've cycled through all options at this level
        if (
          priorityIndex % partPriority.length === 0 &&
          this.calculateBodyCost([...upgradedBody, partPriority[0]]) > availableEnergy
        ) {
          break;
        }
      }
    }

    return upgradedBody;
  }

  spawnBestWorkerPossible(): void {
    const workers = this.getWorkers();
    if (workers.length >= this.maxWorkersCount) {
      return;
    }

    // Find an available spawn
    let availableSpawn: StructureSpawn | null = null;
    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      if (!spawn.spawning) {
        availableSpawn = spawn;
        break;
      }
    }

    if (!availableSpawn) {
      return;
    }

    // Determine the best body to spawn
    let body: BodyPartConstant[];
    if (this.checkIfNewWorkerCanBeUpgraded()) {
      body = this.getAnUpgradedWorkerBody();
    } else {
      body = this.defaultWorkerBody;
    }

    const bodyCost = this.calculateBodyCost(body);
    if (availableSpawn.store.getUsedCapacity(RESOURCE_ENERGY) >= bodyCost) {
      const newName = `Builder${Game.time}`;
      availableSpawn.spawnCreep(body, newName, {
        memory: { role: WorkerRoles.Builder, task: BuilderTasks.Building }
      });
    }
  }

  setMaterialsPercentage(percentage: number): void {
    this.materialsPercentage = Math.max(0, Math.min(1, percentage));
  }

  setMemory(memory: any): void {
    Memory.departments[BuildingDepartment.MEMORY_KEY] = {
      ...Memory.departments[BuildingDepartment.MEMORY_KEY],
      ...memory
    };
  }

  getMemory(): any {
    return Memory.departments[BuildingDepartment.MEMORY_KEY] || {};
  }

  private calculateBodyCost(body: BodyPartConstant[]): number {
    const costs: { [key: string]: number } = {
      [MOVE]: 50,
      [WORK]: 100,
      [CARRY]: 50,
      [ATTACK]: 80,
      [RANGED_ATTACK]: 150,
      [HEAL]: 250,
      [TOUGH]: 10,
      [CLAIM]: 600
    };

    return body.reduce((total, part) => total + (costs[part] || 0), 0);
  }

  /**
   * Plan base layout around all spawns
   */
  planBaseLayout(): void {
    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      this.planAroundSpawn(spawn);
    }
  }

  /**
   * Plan extensions and roads in circles around a spawn
   * Roads go in cardinal/diagonal directions and every third circle
   * Extensions fill the rest
   */
  private planAroundSpawn(spawn: StructureSpawn): void {
    const memory = this.getMemory();
    const spawnKey = spawn.name;

    // Check if we've already planned for this spawn
    if (memory.plannedPositions && memory.plannedPositions[spawnKey]) {
      return;
    }

    // Mark as planned
    if (!memory.plannedPositions) {
      memory.plannedPositions = {};
    }
    memory.plannedPositions[spawnKey] = true;
    this.setMemory(memory);

    // Plan structures circle by circle
    for (let radius = 1; radius <= BuildingDepartment.MAX_CIRCLE_RADIUS; radius++) {
      this.planCircle(spawn, radius);
    }
  }

  /**
   * Plan a single circle around the spawn
   */
  private planCircle(spawn: StructureSpawn, radius: number): void {
    const isRoadCircle = radius % 3 === 0;
    const positions = this.getCirclePositions(spawn.pos, radius);

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
        // Place extension
        this.placeConstructionSite(pos, STRUCTURE_EXTENSION);
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
}
