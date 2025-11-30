// Department for scouting creeps
// Manages scouts that explore adjacent rooms and claim/reserve controllers
import { ScoutTasks, WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { Scout, IScout } from "./scout";
import {
  calculateBodyCost,
  getUpgradedWorkerBody,
  getAvailableMaterials,
  findAvailableSpawn,
  canUpgradeWorker
} from "../../utils/departmentHelpers";

export class ScoutingDepartment implements Department {
    maxWorkersCount: number = 0;
    // Scouts need CLAIM part to claim controllers and MOVE to travel
    defaultWorkerBody: BodyPartConstant[] = [CLAIM, MOVE, MOVE];
    private materialsPercentage: number = 0.1; // Lower priority, use 10% of available energy
    private static readonly MEMORY_KEY = 'scoutingDepartment';

    constructor(maxWorkersCount?: number, defaultWorkerBody?: BodyPartConstant[]) {
        if (maxWorkersCount) {
            this.maxWorkersCount = maxWorkersCount;
        }
        if (defaultWorkerBody) {
            this.defaultWorkerBody = defaultWorkerBody;
        }

        // Initialize default memory if it doesn't exist
        if (!Memory.departments?.[ScoutingDepartment.MEMORY_KEY]) {
            Memory.departments = Memory.departments || {};
            Memory.departments[ScoutingDepartment.MEMORY_KEY] = {
                priority: 5,
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
        if (workers.length > 0) {
            console.log(`Running ${workers.length} scouts`);
        }
        workers.forEach(worker => {
            worker.run();
        });
    }

    getAvailableMaterials(): number {
        return getAvailableMaterials(this.materialsPercentage);
    }

    getWorkers(): IScout[] {
        const workers: IScout[] = [];
        for (const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            if (creep.memory.role === WorkerRoles.Scout) {
                workers.push(new Scout(creep));
            }
        }
        return workers;
    }

    checkIfNewWorkerCanBeUpgraded(): boolean {
        const availableEnergy = this.getAvailableMaterials();
        const result = canUpgradeWorker(this.defaultWorkerBody, availableEnergy);
        return result;
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
            const newName = `Scout${Game.time}`;
            const result = availableSpawn.spawnCreep(body, newName, {
                memory: { role: WorkerRoles.Scout, task: ScoutTasks.Scouting }
            });

            if (result === OK) {
                // Update highest produced body in memory
                const memory = this.getMemory();
                if (!memory.highestProducedBodyCost || bodyCost > memory.highestProducedBodyCost) {
                    memory.highestProducedBody = body;
                    memory.highestProducedBodyCost = bodyCost;
                    this.setMemory(memory);
                    console.log(`Spawned new scout: ${newName} with body cost: ${bodyCost} and body: ${body}`);
                }
            } else {
                console.log(`Failed to spawn scout: ${result}. Available energy: ${this.getAvailableMaterials()}, Body cost: ${bodyCost}`);
            }
        }
    }

    setMaterialsPercentage(percentage: number): void {
        this.materialsPercentage = Math.max(0, Math.min(1, percentage));
    }

    setMemory(memory: any): void {
        Memory.departments[ScoutingDepartment.MEMORY_KEY] = {
            ...Memory.departments[ScoutingDepartment.MEMORY_KEY],
            ...memory
        };
    }

    getMemory(): any {
        return Memory.departments[ScoutingDepartment.MEMORY_KEY] || {};
    }
}
