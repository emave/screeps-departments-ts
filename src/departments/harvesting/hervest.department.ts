// Department for harvesting creeps
// Manages amount of harvesters and their tasks
import { HarvesterTasks, WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { Harvester, IHarvester } from "./harvester";
import {
  calculateBodyCost,
  getUpgradedWorkerBody,
  getAvailableMaterials,
  findAvailableSpawn,
  canUpgradeWorker
} from "../../utils/departmentHelpers";

export class HarvestingDepartment implements Department {
    maxWorkersCount: number = 0;
    defaultWorkerBody: BodyPartConstant[] = [WORK, CARRY, MOVE];
    private materialsPercentage: number = 0.4;
    private static readonly MEMORY_KEY = 'harvestingDepartment';

    constructor(maxWorkersCount?: number, defaultWorkerBody?: BodyPartConstant[]) {
        if (maxWorkersCount) {
            this.maxWorkersCount = maxWorkersCount;
        }
        if (defaultWorkerBody) {
            this.defaultWorkerBody = defaultWorkerBody;
        }

        // Initialize default memory if it doesn't exist
        if (!Memory.departments?.[HarvestingDepartment.MEMORY_KEY]) {
            Memory.departments = Memory.departments || {};
            Memory.departments[HarvestingDepartment.MEMORY_KEY] = {
                priority: 1,
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
        console.log(`Running ${workers.length} harvesters`);
        workers.forEach(worker => {
            worker.run();
        });
    }

    getAvailableMaterials(): number {
        return getAvailableMaterials(this.materialsPercentage);
    }

    getWorkers(): IHarvester[] {
        const workers: IHarvester[] = [];
        for (const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            if (creep.memory.role === WorkerRoles.Harvester) {
                workers.push(new Harvester(creep));
            }
        }
        return workers;
    }

    checkIfNewWorkerCanBeUpgraded(): boolean {
        const availableEnergy = this.getAvailableMaterials();
        const result = canUpgradeWorker(this.defaultWorkerBody, availableEnergy);
        const upgradedBody = this.getAnUpgradedWorkerBody();
        const upgradedCost = calculateBodyCost(upgradedBody);
        console.log(`Checking if new harvester can be upgraded. Available energy: ${availableEnergy}, Upgraded cost: ${upgradedCost}`);
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

        // Should check if energy is full
        if (Game.spawns[availableSpawn.name].room.energyAvailable < Game.spawns[availableSpawn.name].room.energyCapacityAvailable) {
            return;
        }

        const bodyCost = calculateBodyCost(body);
        if (this.getAvailableMaterials() >= bodyCost) {
            const newName = `Harvester${Game.time}`;
            const result = availableSpawn.spawnCreep(body, newName, {
                memory: { role: WorkerRoles.Harvester, task: HarvesterTasks.Harvesting}
            });

            if (result === OK) {
                // Update highest produced body in memory
                const memory = this.getMemory();
                if (!memory.highestProducedBodyCost || bodyCost > memory.highestProducedBodyCost) {
                    memory.highestProducedBody = body;
                    memory.highestProducedBodyCost = bodyCost;
                    this.setMemory(memory);
                    console.log(`Spawned new harvester: ${newName} with body cost: ${bodyCost} and body: ${body}`);
                }
            } else {
                console.log(`Failed to spawn harvester: ${result}. Available energy: ${this.getAvailableMaterials()}, Body cost: ${bodyCost}`);
            }
        }
    }

    setMaterialsPercentage(percentage: number): void {
        this.materialsPercentage = Math.max(0, Math.min(1, percentage));
    }

    setMemory(memory: any): void {
        Memory.departments[HarvestingDepartment.MEMORY_KEY] = {
            ...Memory.departments[HarvestingDepartment.MEMORY_KEY],
            ...memory
        };
    }

    getMemory(): any {
        return Memory.departments[HarvestingDepartment.MEMORY_KEY] || {};
    }
}
