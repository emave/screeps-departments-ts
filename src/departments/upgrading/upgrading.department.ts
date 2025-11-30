// Department for upgrading controller
// Manages amount of upgraders and their tasks
import { UpgraderTasks, WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { IUpgrader, Upgrader } from "./upgrader";
import {
  calculateBodyCost,
  getUpgradedWorkerBody,
  getAvailableMaterials,
  findAvailableSpawn,
  canUpgradeWorker
} from "../../utils/departmentHelpers";

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
    console.log(`Running ${workers.length} upgraders`);
    workers.forEach(worker => {
      worker.run();
    });
  }

  getAvailableMaterials(): number {
    return getAvailableMaterials(this.materialsPercentage);
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
    return canUpgradeWorker(this.defaultWorkerBody, availableEnergy);
  }

  getAnUpgradedWorkerBody(): BodyPartConstant[] {
    const availableEnergy = this.getAvailableMaterials();
    return getUpgradedWorkerBody(this.defaultWorkerBody, availableEnergy);
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
    if (this.getAvailableMaterials() >= bodyCost) {
      const newName = `Upgrader${Game.time}`;
      const result = availableSpawn.spawnCreep(body, newName, {
        memory: { role: WorkerRoles.Upgrader, task: UpgraderTasks.Harvesting }
      });

      if (result === OK) {
        // Update highest produced body in memory
        const memory = this.getMemory();
        if (!memory.highestProducedBodyCost || bodyCost > memory.highestProducedBodyCost) {
          memory.highestProducedBody = body;
          memory.highestProducedBodyCost = bodyCost;
          this.setMemory(memory);
            console.log(`Spawned new upgrader: ${newName} with body cost: ${bodyCost} and body: ${body}`);
        }
      } else {
        console.log(
          `Failed to spawn upgrader: ${result}. Available energy: ${this.getAvailableMaterials()}, Body cost: ${bodyCost}`
        );
      }
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
}
