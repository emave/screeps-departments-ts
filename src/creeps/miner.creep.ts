import { Role } from "common/roles";
import { BaseCreep } from "./base.creep";

export class MinerCreep extends BaseCreep {
    constructor(creep: Creep) {
        super(creep);
    }

    run(): void {
        // If the creep is full, transfer energy to nearby structures or drop it
        if (this.isFull()) {
            this.transferEnergy();
        } else {
            // Continue mining
            this.mining();
        }
    }

    private transferEnergy(): void {
        // First, check for nearby carrier creeps that need energy
        const nearbyCarriers = this.creep.pos.findInRange(FIND_MY_CREEPS, 1, {
            filter: (creep) => {
                return creep.memory.role === 'carrier' &&
                       creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });

        if (nearbyCarriers.length > 0) {
            this.transfer(nearbyCarriers[0], RESOURCE_ENERGY);
            return;
        }

        // Find nearby spawn or extensions that need energy
        const targets = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (
                    (structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                    this.creep.pos.inRangeTo(structure.pos, 1)
                );
            }
        });

        if (targets.length > 0) {
            const closestTarget = this.creep.pos.findClosestByPath(targets);
            if (closestTarget) {
                this.transfer(closestTarget, RESOURCE_ENERGY);
                return;
            }
        }

        // If no structures need energy, drop it on the ground for carriers
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            this.creep.drop(RESOURCE_ENERGY);
        }
    }

    mining(): void {
        if (this.creep.memory.targetSource) {
            const source = Game.getObjectById<Source>(this.creep.memory.targetSource);
            if (source) {
                this.harvest(source);
                return;
            } else {
                // Target source is invalid, remove it from memory
                delete this.creep.memory.targetSource;
            }
        }
        const source = this.findSource();
        if (source) {
            this.creep.memory.targetSource = source.id;
            this.harvest(source);
        } else {
            // No available source found, consider idling or moving to a designated spot
            this.creep.say("No source");
        }
    }

    findSource(): Source | null {
        // First, try to find a source in the current room
        let source = this.findAvailableSourceInRoom(this.creep.room);
        if (source) {
            return source;
        }

        // If no source found in current room, search in adjacent rooms
        const exits = Game.map.describeExits(this.creep.room.name);
        if (exits) {
            for (const direction in exits) {
                const roomName = exits[direction as unknown as ExitKey];
                if (roomName && Game.rooms[roomName]) {
                    source = this.findAvailableSourceInRoom(Game.rooms[roomName]);
                    if (source) {
                        return source;
                    }
                }
            }
        }

        return null;
    }

    private findAvailableSourceInRoom(room: Room): Source | null {
        const sources = room.find(FIND_SOURCES);

        // Filter sources that have less than 2 miners targeting them
        const availableSources = sources.filter(source => {
            const minersTargeting = this.getCreepsForTarget<Creep>(source).filter(
                (creep) => creep.memory.role === Role.Miner
            ).length;
            return minersTargeting < 2;
        });

        // Return the closest available source
        if (availableSources.length > 0) {
            return this.creep.pos.findClosestByPath(availableSources);
        }

        return null;
    }

    findClosestSource(): Source | null {
        const source = this.creep.pos.findClosestByPath(FIND_SOURCES);
        return source;
    }

    findClosestNotIgnoredSource(): Source | null {
        const ignoredTargets = this.creep.memory.ignoreTargets || [];
        const sources = this.creep.room.find(FIND_SOURCES).filter(source => !ignoredTargets.includes(source.id));
        return sources.length > 0 ? this.creep.pos.findClosestByPath(sources) : null;
    }

    findSourcesInAnotherRoom(roomName: string): Source[] {
        const room = Game.rooms[roomName];
        if (!room) {
            return [];
        }
        return room.find(FIND_SOURCES);
    }

    ignoreTarget(targetId: Id<any>): void {
        if (!this.creep.memory.ignoreTargets) {
            this.creep.memory.ignoreTargets = [];
        }
        this.creep.memory.ignoreTargets.push(targetId);
    }
}
