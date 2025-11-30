// Department for defense creeps
// Manages amount of defenders and their deployment
import { WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { Defender, IDefender } from "./defender";
import {
  calculateBodyCost,
  getUpgradedWorkerBody,
  getAvailableMaterials,
  findAvailableSpawn,
  canUpgradeWorker
} from "../../utils/departmentHelpers";
import { IWorker } from "../../parts/worker";

export class DefenseDepartment implements Department {
  maxWorkersCount: number = 0;
  defaultWorkerBody: BodyPartConstant[] = [TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK];
  private materialsPercentage: number = 0.2;
  private static readonly MEMORY_KEY = "defenseDepartment";

  constructor(maxWorkersCount?: number, defaultWorkerBody?: BodyPartConstant[]) {
    if (maxWorkersCount) {
      this.maxWorkersCount = maxWorkersCount;
    }
    if (defaultWorkerBody) {
      this.defaultWorkerBody = defaultWorkerBody;
    }

    // Initialize default memory if it doesn't exist
    if (!Memory.departments?.[DefenseDepartment.MEMORY_KEY]) {
      Memory.departments = Memory.departments || {};
      Memory.departments[DefenseDepartment.MEMORY_KEY] = {
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

    // Check for threats and adjust defender count
    this.adjustDefenderCount();

    // Spawn defenders if needed
    this.spawnBestWorkerPossible();

    // Run all defenders
    const defenders = this.getDefenders();
    console.log(`Running ${defenders.length} defenders`);
    defenders.forEach(defender => {
      defender.run();
    });
  }

  private adjustDefenderCount(): void {
    // Dynamically adjust max defenders based on threat level
    const hostiles = this.findHostilesInOwnedRooms();
    const memory = this.getMemory();

    if (hostiles.length > 0) {
      // Increase defenders when under attack
      memory.maxWorkersCount = Math.min(hostiles.length * 2, 6);
    } else {
      // Maintain minimum defenders when safe
      memory.maxWorkersCount = 2;
    }

    this.setMemory(memory);
  }

  private findHostilesInOwnedRooms(): Creep[] {
    const hostiles: Creep[] = [];
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      if (room.controller && room.controller.my) {
        const roomHostiles = room.find(FIND_HOSTILE_CREEPS);
        hostiles.push(...roomHostiles);
      }
    }
    return hostiles;
  }

  getAvailableMaterials(): number {
    return getAvailableMaterials(this.materialsPercentage);
  }

  getWorkers(): IWorker[] {
    return this.getDefenders();
  }

  getDefenders(): IDefender[] {
    const defenders: IDefender[] = [];
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.memory.role === WorkerRoles.Defender) {
        defenders.push(new Defender(creep));
      }
    }
    return defenders;
  }

  checkIfNewWorkerCanBeUpgraded(): boolean {
    const availableEnergy = this.getAvailableMaterials();
    const result = canUpgradeWorker(this.defaultWorkerBody, availableEnergy);
    const upgradedBody = this.getAnUpgradedWorkerBody();
    const upgradedCost = calculateBodyCost(upgradedBody);
    console.log(
      `Checking if new defender can be upgraded. Available energy: ${availableEnergy}, Upgraded cost: ${upgradedCost}`
    );
    return result;
  }

  getAnUpgradedWorkerBody(): BodyPartConstant[] {
    const availableEnergy = this.getAvailableMaterials();
    return getUpgradedWorkerBody(this.defaultWorkerBody, availableEnergy);
  }

  spawnBestWorkerPossible(): void {
    const defenders = this.getDefenders();
    if (defenders.length >= this.maxWorkersCount) {
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
      const newName = `Defender${Game.time}`;
      const result = availableSpawn.spawnCreep(body, newName, {
        memory: { role: WorkerRoles.Defender, task: "defending" as any }
      });

      if (result === OK) {
        // Update highest produced body in memory
        const memory = this.getMemory();
        if (!memory.highestProducedBodyCost || bodyCost > memory.highestProducedBodyCost) {
          memory.highestProducedBody = body;
          memory.highestProducedBodyCost = bodyCost;
          this.setMemory(memory);
          console.log(`Spawned new defender: ${newName} with body cost: ${bodyCost} and body: ${body}`);
        }
      } else {
        console.log(
          `Failed to spawn defender: ${result}. Available energy: ${this.getAvailableMaterials()}, Body cost: ${bodyCost}`
        );
      }
    }
  }

  setMaterialsPercentage(percentage: number): void {
    this.materialsPercentage = Math.max(0, Math.min(1, percentage));
  }

  setMemory(memory: any): void {
    Memory.departments[DefenseDepartment.MEMORY_KEY] = {
      ...Memory.departments[DefenseDepartment.MEMORY_KEY],
      ...memory
    };
  }

  getMemory(): any {
    return Memory.departments[DefenseDepartment.MEMORY_KEY] || {};
  }
}
