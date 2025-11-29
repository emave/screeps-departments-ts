// Department for upgrading controller
// Manages amount of upgraders and their tasks
import { UpgraderTasks, WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { IUpgrader, Upgrader } from "./upgrader";

export class UpgradingDepartment implements Department {
  maxWorkersCount: number = 0;
  defaultWorkerBody: BodyPartConstant[] = [WORK, CARRY, MOVE];
  private materialsPercentage: number = 0.2;
  private static readonly MEMORY_KEY = "upgradingDepartment";

  constructor(maxWorkersCount?: number, defaultWorkerBody?: BodyPartConstant[]) {
    if (maxWorkersCount) {
      this.maxWorkersCount = maxWorkersCount;
    }
    if (defaultWorkerBody) {
      this.defaultWorkerBody = defaultWorkerBody;
    }

    // Initialize default memory if it doesn't exist
    if (!Memory.departments?.[UpgradingDepartment.MEMORY_KEY]) {
      Memory.departments = Memory.departments || {};
      Memory.departments[UpgradingDepartment.MEMORY_KEY] = {
        priority: 3,
        maxWorkersCount: this.maxWorkersCount,
        materialsPercentage: this.materialsPercentage,
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

    // Spawn workers if needed
    this.spawnBestWorkerPossible();

    // Run all workers
    const workers = this.getWorkers();
    console.log(`Running ${workers.length} upgraders`);
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

  getWorkers(): IUpgrader[] {
    const workers: IUpgrader[] = [];
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.memory.role === WorkerRoles.Upgrader) {
        workers.push(new Upgrader(creep));
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
      const newName = `Upgrader${Game.time}`;
      availableSpawn.spawnCreep(body, newName, {
        memory: { role: WorkerRoles.Upgrader, task: UpgraderTasks.Upgrading }
      });
    }
  }

  setMaterialsPercentage(percentage: number): void {
    this.materialsPercentage = Math.max(0, Math.min(1, percentage));
  }

  setMemory(memory: any): void {
    Memory.departments[UpgradingDepartment.MEMORY_KEY] = {
      ...Memory.departments[UpgradingDepartment.MEMORY_KEY],
      ...memory
    };
  }

  getMemory(): any {
    return Memory.departments[UpgradingDepartment.MEMORY_KEY] || {};
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
}
