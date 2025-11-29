// Department for harvesting creeps
// Manages amount of harvesters and their tasks
import { HarvesterTasks, WorkerRoles } from "parts/types";
import { Department } from "../../parts/department";
import { Harvester, IHarvester } from "./harvester";

export class HarvestingDepartment implements Department {
    supposedWorkersCount: number = 2;
    defaultWorkerBody: BodyPartConstant[] = [WORK, CARRY, MOVE];
    private availableMaterialsPercentage: number = 0.5;
    private static readonly MEMORY_KEY = 'harvestingDepartment';

    constructor(supposedWorkersCount?: number, defaultWorkerBody?: BodyPartConstant[]) {
        if (supposedWorkersCount) {
            this.supposedWorkersCount = supposedWorkersCount;
        }
        if (defaultWorkerBody) {
            this.defaultWorkerBody = defaultWorkerBody;
        }

        // Initialize default memory if it doesn't exist
        if (!Memory[HarvestingDepartment.MEMORY_KEY]) {
            Memory[HarvestingDepartment.MEMORY_KEY] = {
                supposedWorkersCount: this.supposedWorkersCount,
                availableMaterialsPercentage: this.availableMaterialsPercentage,
                lastSpawnTime: 0
            };
        }
    }

    run(): void {
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
        // Calculate total energy available across all spawns
        let totalEnergy = 0;
        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            totalEnergy += spawn.store.getUsedCapacity(RESOURCE_ENERGY);
        }
        return Math.floor(totalEnergy * this.availableMaterialsPercentage);
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
                priorityIndex = (Math.floor(priorityIndex / partPriority.length) * partPriority.length) + nextIndex;

                // Check if we've cycled through all options at this level
                if (priorityIndex % partPriority.length === 0 &&
                    this.calculateBodyCost([...upgradedBody, partPriority[0]]) > availableEnergy) {
                    break;
                }
            }
        }

        return upgradedBody;
    }

    spawnBestWorkerPossible(): void {
        const workers = this.getWorkers();
        if (workers.length >= this.supposedWorkersCount) {
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
            const newName = `Harvester${Game.time}`;
            availableSpawn.spawnCreep(body, newName, {
                memory: { role: 'harvester', task: HarvesterTasks.Harvesting}
            });
        }
    }

    setAvailableMaterialsPercentage(percentage: number): void {
        this.availableMaterialsPercentage = Math.max(0, Math.min(1, percentage));
    }

    setMemory(memory: any): void {
        Memory[HarvestingDepartment.MEMORY_KEY] = {
            ...Memory[HarvestingDepartment.MEMORY_KEY],
            ...memory
        };
    }

    getMemory(): any {
        return Memory[HarvestingDepartment.MEMORY_KEY] || {};
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
