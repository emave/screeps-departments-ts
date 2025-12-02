// Department for building creeps
// Manages amount of builders and their tasks
import { BuilderTasks, WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { Builder, IBuilder } from "./builder";
import {
  calculateBodyCost,
  getUpgradedWorkerBody,
  getAvailableMaterials,
  findAvailableSpawn,
  canUpgradeWorker,
  getAvailableMaterialsPerSpawn
} from "../../utils/departmentHelpers";

export class BuildingDepartment implements Department {
  maxWorkersCount: number = 0;
  defaultWorkerBody: BodyPartConstant[] = [WORK, CARRY, MOVE];
  private materialsPercentage: number = 0.4;
  private static readonly MEMORY_KEY = "buildingDepartment";

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
        materialsPercentage: this.materialsPercentage
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
    console.log(`Running ${workers.length} builders`);
    workers.forEach(worker => {
      worker.run();
    });
  }

  getAvailableMaterialsPerSpawn(): { [spawnName: string]: number } {
    return getAvailableMaterialsPerSpawn(this.materialsPercentage);
  }

  getAvailableMaterials(): number {
    return getAvailableMaterials(this.materialsPercentage);
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
    const availableEnergyPerSpawn = this.getAvailableMaterialsPerSpawn();
    // Check if any spawn can upgrade the worker
    for (const spawnName in availableEnergyPerSpawn) {
      if (canUpgradeWorker(this.defaultWorkerBody, availableEnergyPerSpawn[spawnName])) {
        return true;
      }
    }
    return false;
  }

  getAnUpgradedWorkerBody(): BodyPartConstant[] {
    const availableEnergyPerSpawn = this.getAvailableMaterialsPerSpawn();
    // Find the maximum available energy among all spawns
    let maxAvailableEnergy = 0;
    for (const spawnName in availableEnergyPerSpawn) {
      if (availableEnergyPerSpawn[spawnName] > maxAvailableEnergy) {
        maxAvailableEnergy = availableEnergyPerSpawn[spawnName];
      }
    }
    return getUpgradedWorkerBody(this.defaultWorkerBody, maxAvailableEnergy);
  }

  spawnBestWorkerPossible(): void {
    const workers = this.getWorkers();
    if (workers.length >= this.maxWorkersCount) {
      return;
    }

    // Find an available spawn
    const availableSpawn = findAvailableSpawn();
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

    const bodyCost = calculateBodyCost(body);
    if (availableSpawn.room.energyAvailable >= bodyCost) {
      const newName = `Builder${Game.time}`;
      const result = availableSpawn.spawnCreep(body, newName, {
        memory: { role: WorkerRoles.Builder, task: BuilderTasks.Harvesting }
      });

      if (result === OK) {
        // Update highest produced body in memory
        const memory = this.getMemory();
        if (!memory.highestProducedBodyCost || bodyCost > memory.highestProducedBodyCost) {
          memory.highestProducedBody = body;
          memory.highestProducedBodyCost = bodyCost;
          this.setMemory(memory);
          console.log(`Spawned new builder: ${newName} with body cost: ${bodyCost} and body: ${body}`);
        }
      } else {
        console.log(`Failed to spawn builder: ${result}. Available energy: ${availableSpawn.room.energyAvailable}, Body cost: ${bodyCost}`);
      }
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
}
