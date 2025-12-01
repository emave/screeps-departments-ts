// All common behaviors for creeps will be defined here

export class CreepBehavior {
  creep: Creep;

  constructor(creep: Creep) {
    this.creep = creep;
  }

  moveToTarget(target: RoomPosition | { pos: RoomPosition }, callback?: (creep: Creep) => void): boolean {
    const targetPos = target instanceof RoomPosition ? target : target.pos;
    const targetId = "id" in target ? (target as any).id : undefined;

    // Check if this target should be ignored
    if (this.isTargetIgnored(targetId, targetPos)) {
      return false;
    }

    if (this.fleeFromHostiles()) {
      this.sayPublic("Fleeing!");
      this.incrementFleeCount(targetId, targetPos);
      if (this.shouldIgnoreTarget()) {
        this.sayPublic("Ignoring!");
        this.markTargetAsIgnored(targetId, targetPos);
        return false;
      }
      return true;
    }

    // Reset flee count if not fleeing and target changed
    this.resetFleeCountIfTargetChanged(targetId, targetPos);

    if (this.creep.pos.isNearTo(targetPos)) {
      if (callback) {
        callback(this.creep);
      }
      return true;
    }

    const result = this.creep.moveTo(targetPos, { visualizePathStyle: { stroke: "#ffffff" } });
    if (result !== OK) {
      console.log(`Creep ${this.creep.name} failed to move to target: ${result}`);
    }
    return true;
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
    return !!this.creep.room.memory.enemyPositions?.length;
  }

  sayPublic(message: string): void {
    this.creep.say(message, true);
  }

  incrementFleeCount(targetId: string | undefined, targetPos: RoomPosition): void {
    // Check if this is the same target we were fleeing from before
    const isSameTarget = this.isSameTarget(targetId, targetPos);

    if (!isSameTarget) {
      // Different target, reset count
      this.creep.memory.fleeCount = 0;
      // Update the tracked target
      if (targetId) {
        this.creep.memory.ignoredTargetId = targetId;
      } else {
        this.creep.memory.ignoredTargetPos = { x: targetPos.x, y: targetPos.y, roomName: targetPos.roomName };
      }
    }

    if (!this.creep.memory.fleeCount) {
      this.creep.memory.fleeCount = 0;
    }
    this.creep.memory.fleeCount++;
  }

  isSameTarget(targetId: string | undefined, targetPos: RoomPosition): boolean {
    if (targetId && this.creep.memory.ignoredTargetId === targetId) {
      return true;
    }
    if (
      !targetId &&
      this.creep.memory.ignoredTargetPos &&
      this.creep.memory.ignoredTargetPos.x === targetPos.x &&
      this.creep.memory.ignoredTargetPos.y === targetPos.y &&
      this.creep.memory.ignoredTargetPos.roomName === targetPos.roomName
    ) {
      return true;
    }
    return false;
  }

  resetFleeCountIfTargetChanged(targetId: string | undefined, targetPos: RoomPosition): void {
    const currentTargetId = targetId;
    const currentTargetPos = { x: targetPos.x, y: targetPos.y, roomName: targetPos.roomName };

    // Check if target changed
    const targetChanged =
      (currentTargetId && this.creep.memory.ignoredTargetId !== currentTargetId) ||
      (!currentTargetId &&
        (this.creep.memory.ignoredTargetPos?.x !== currentTargetPos.x ||
          this.creep.memory.ignoredTargetPos?.y !== currentTargetPos.y ||
          this.creep.memory.ignoredTargetPos?.roomName !== currentTargetPos.roomName));

    if (targetChanged || !this.creep.memory.fleeCount) {
      this.creep.memory.fleeCount = 0;
    }
  }

  shouldIgnoreTarget(): boolean {
    return (this.creep.memory.fleeCount ?? 0) >= 5;
  }

  markTargetAsIgnored(targetId: string | undefined, targetPos: RoomPosition): void {
    if (targetId) {
      this.creep.memory.ignoredTargetId = targetId;
    } else {
      this.creep.memory.ignoredTargetPos = { x: targetPos.x, y: targetPos.y, roomName: targetPos.roomName };
    }
    this.creep.memory.fleeCount = 0;
  }

  isTargetIgnored(targetId: string | undefined, targetPos: RoomPosition): boolean {
    if (targetId && this.creep.memory.ignoredTargetId === targetId) {
      return true;
    }
    if (
      !targetId &&
      this.creep.memory.ignoredTargetPos &&
      this.creep.memory.ignoredTargetPos.x === targetPos.x &&
      this.creep.memory.ignoredTargetPos.y === targetPos.y &&
      this.creep.memory.ignoredTargetPos.roomName === targetPos.roomName
    ) {
      return true;
    }
    return false;
  }
}
