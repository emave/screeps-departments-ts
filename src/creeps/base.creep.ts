export enum CreepAction {
  Idle = 'Idle',
  MoveTo = 'MoveTo',
  Flee = 'Flee',
  Harvest = 'Harvest',
  Transfer = 'Transfer',
  Withdraw = 'Withdraw',
  Pickup = 'Pickup',
  Build = 'Build',
  Repair = 'Repair',
  Upgrade = 'Upgrade',
  Attack = 'Attack',
  RangedAttack = 'RangedAttack',
  Heal = 'Heal',
}

export class BaseCreep {
  creep: Creep;
    constructor(creep: Creep) {
        this.creep = creep;
    }

    moveTo(target: RoomPosition, onDestination?: (target: RoomPosition) => void): void {
        if (this.creep.pos.inRangeTo(target, 1)) {
            onDestination?.(target);
            return;
        }
        const path = this.creep.pos.findPathTo(target);
        this.creep.room.visual.poly(path.map(step => new RoomPosition(step.x, step.y, this.creep.room.name)), {
            stroke: 'white',
            strokeWidth: 0.15,
            opacity: 0.2,
            lineStyle: 'dashed'
        });
        this.creep.moveTo(target);
    }

    moveToRoom(target: RoomPosition, options?: MoveToOpts): void {
        if (this.creep.room.name === target.roomName) {
            this.moveTo(target);
        } else {
            const route = Game.map.findRoute(this.creep.room.name, target.roomName);
            if (route === ERR_NO_PATH) {
                console.log(`No path found from ${this.creep.room.name} to ${target.roomName}`);
                return;
            }

            const exit = this.creep.pos.findClosestByRange(route[0].exit);
            if (exit) {
                this.creep.room.visual.line(this.creep.pos, exit, { color: 'green', lineStyle: 'dashed' });
                this.creep.moveTo(exit, options);
            }
        }
    }

    fleeFrom(target: RoomPosition ): void {
        const direction = this.creep.pos.getDirectionTo(target);
        const fleeDirection = ((direction + 3) % 8) + 1;
        this.creep.room.visual.line(this.creep.pos, target, { color: 'red', lineStyle: 'dashed' });
        this.creep.move(fleeDirection as DirectionConstant);
    }

    changeAction(action: CreepAction): void {
        this.creep.memory.currentAction = action;
        this.creep.say(CreepAction[action]);
    }

    harvest(source: Source): void {
        const result = this.creep.harvest(source);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(source.pos);
        }
    }

    transfer(target: Structure | Creep, resourceType: ResourceConstant = RESOURCE_ENERGY): void {
        const result = this.creep.transfer(target, resourceType);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(target.pos);
        }
    }

    withdraw(target: Structure | Tombstone | Ruin, resourceType: ResourceConstant = RESOURCE_ENERGY): void {
        const result = this.creep.withdraw(target, resourceType);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(target.pos);
        }
    }

    pickup(resource: Resource): void {
        const result = this.creep.pickup(resource);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(resource.pos);
        }
    }

    build(target: ConstructionSite): void {
        const result = this.creep.build(target);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(target.pos);
        }
    }

    repair(target: Structure): void {
        const result = this.creep.repair(target);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(target.pos);
        }
    }

    upgrade(controller: StructureController): void {
        const result = this.creep.upgradeController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(controller.pos);
        }
    }

    attack(target: Creep | Structure): void {
        const result = this.creep.attack(target);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(target.pos);
        }
    }

    rangedAttack(target: Creep | Structure): void {
        const result = this.creep.rangedAttack(target);
        if (result === ERR_NOT_IN_RANGE) {
            this.moveTo(target.pos);
        }
    }

    heal(target: Creep): void {
        const result = this.creep.heal(target);
        if (result === ERR_NOT_IN_RANGE) {
            this.creep.rangedHeal(target);
            this.moveTo(target.pos);
        }
    }

    getCreepsForTarget<T extends Creep>(target: Source | Structure | ConstructionSite): T[] {
        return Object.values(Game.creeps).filter(
            (creep) => creep.memory.targetSource === target.id
        ) as T[];
    }

    isFull(): boolean {
        return this.creep.store.getFreeCapacity() === 0;
    }

    isEmpty(): boolean {
        return this.creep.store.getUsedCapacity() === 0;
    }

    hasEnergy(): boolean {
        return this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    needsEnergy(): boolean {
        return this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    }
}
