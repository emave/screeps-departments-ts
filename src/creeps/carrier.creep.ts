import { BaseCreep } from "./base.creep";

export class CarrierCreep extends BaseCreep {
    constructor(creep: Creep) {
        super(creep);
    }

    run(): void {
        // If the creep is empty, collect energy
        if (this.isEmpty()) {
            this.collectEnergy();
        }
        // If the creep has energy, deliver it
        else if (this.hasEnergy()) {
            this.deliverEnergy();
        }
    }

    private collectEnergy(): void {
        // First, look for dropped energy
        const droppedEnergy = this.findDroppedEnergy();
        if (droppedEnergy) {
            this.pickup(droppedEnergy);
            return;
        }

        // Then, look for containers with energy
        const container = this.findContainerWithEnergy();
        if (container) {
            this.withdraw(container, RESOURCE_ENERGY);
            return;
        }

        // Finally, look for storage with energy
        const storage = this.findStorageWithEnergy();
        if (storage) {
            this.withdraw(storage, RESOURCE_ENERGY);
            return;
        }

        // If no energy source found, wait near spawn
        this.creep.say("No energy");
    }

    private deliverEnergy(): void {
        // Priority 1: Fill spawns and extensions
        const spawnOrExtension = this.findSpawnOrExtension();
        if (spawnOrExtension) {
            this.transfer(spawnOrExtension, RESOURCE_ENERGY);
            return;
        }

        // Priority 2: Fill towers
        const tower = this.findTower();
        if (tower) {
            this.transfer(tower, RESOURCE_ENERGY);
            return;
        }

        // Priority 3: Fill storage
        const storage = this.findStorage();
        if (storage) {
            this.transfer(storage, RESOURCE_ENERGY);
            return;
        }

        // If no target found, wait
        this.creep.say("No target");
    }

    private findDroppedEnergy(): Resource<RESOURCE_ENERGY> | null {
        const droppedResources = this.creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount > 50
        });

        if (droppedResources.length > 0) {
            return this.creep.pos.findClosestByPath(droppedResources) as Resource<RESOURCE_ENERGY> | null;
        }

        return null;
    }

    private findContainerWithEnergy(): StructureContainer | null {
        const containers = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_CONTAINER &&
                       structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
            }
        }) as StructureContainer[];

        if (containers.length > 0) {
            return this.creep.pos.findClosestByPath(containers);
        }

        return null;
    }

    private findStorageWithEnergy(): StructureStorage | null {
        const storage = this.creep.room.storage;
        if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            return storage;
        }

        return null;
    }

    private findSpawnOrExtension(): StructureSpawn | StructureExtension | null {
        const targets = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION) &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        }) as (StructureSpawn | StructureExtension)[];

        if (targets.length > 0) {
            return this.creep.pos.findClosestByPath(targets);
        }

        return null;
    }

    private findTower(): StructureTower | null {
        const towers = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_TOWER &&
                       structure.store.getFreeCapacity(RESOURCE_ENERGY) > structure.store.getCapacity(RESOURCE_ENERGY) * 0.5;
            }
        }) as StructureTower[];

        if (towers.length > 0) {
            return this.creep.pos.findClosestByPath(towers);
        }

        return null;
    }

    private findStorage(): StructureStorage | null {
        const storage = this.creep.room.storage;
        if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            return storage;
        }

        return null;
    }
}
