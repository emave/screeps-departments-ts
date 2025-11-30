// All common behaviors for creeps will be defined here

export class CreepBehavior {
  creep: Creep;

  constructor(creep: Creep) {
    this.creep = creep;
  }

  moveToTarget(target: RoomPosition | { pos: RoomPosition }, callback?: (creep: Creep) => void): void {
    if (this.fleeFromHostiles()) {
      this.sayPublic("Fleeing!");
      return;
    }

    if (this.creep.pos.isNearTo(target)) {
      if (callback) {
        callback(this.creep);
      }
      return;
    }
    this.creep.moveTo(target);
  }

  fleeFromHostiles(): boolean {
    if (this.isEnemyInRoom()) {
      const hostiles = this.creep.pos.findInRange(FIND_HOSTILE_CREEPS, 5);
      if (hostiles.length > 0) {
        const fleeDirection = this.creep.pos.getDirectionTo(hostiles[0].pos);
        const oppositeDirection: DirectionConstant = ((fleeDirection + 4) % 8) as DirectionConstant;
        this.creep.move(oppositeDirection);
        return true;
      }
    }
    return false;
  }

  isEnemyInRoom(): boolean {
    return !!Memory.enemyPositions[this.creep.room.name]?.length;
  }

  sayPublic(message: string): void {
    this.creep.say(message, true);
  }
}
