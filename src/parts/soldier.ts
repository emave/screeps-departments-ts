export interface ISoldier {
  creep: Creep;
  run(): void;
  moveTo(
    target: RoomPosition | { pos: RoomPosition }
  ): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND;
}

// Base class for military creeps (attackers and defenders)
export class Soldier implements ISoldier {
  creep: Creep;

  constructor(creep: Creep) {
    this.creep = creep;
  }

  run() {}

  moveTo(
    target: RoomPosition | { pos: RoomPosition }
  ): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND {
    return this.creep.moveTo(target);
  }

  getMemory(): CreepMemory {
    return this.creep.memory as CreepMemory;
  }

  setMemory(memory: Partial<CreepMemory>): void {
    Object.assign(this.creep.memory, memory);
  }

  // Combat methods

  attack(target: AnyCreep | Structure): void {
    const result = this.creep.attack(target);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(target);
    }
  }

  rangedAttack(target: AnyCreep | Structure): void {
    const result = this.creep.rangedAttack(target);
    if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(target);
    }
  }

  rangedMassAttack(): void {
    this.creep.rangedMassAttack();
  }

  heal(target: AnyCreep): void {
    const result = this.creep.heal(target);
    if (result === ERR_NOT_IN_RANGE) {
      this.creep.rangedHeal(target);
    }
  }

  // Target finding methods

  findClosestHostileCreep(): Creep | null {
    return this.creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
  }

  findAllHostileCreeps(): Creep[] {
    return this.creep.room.find(FIND_HOSTILE_CREEPS);
  }

  findHostileStructures(): Structure[] {
    return this.creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType !== STRUCTURE_CONTROLLER &&
               structure.structureType !== STRUCTURE_RAMPART;
      }
    });
  }

  findClosestHostileStructure(): Structure | null {
    const structures = this.findHostileStructures();
    return this.creep.pos.findClosestByRange(structures);
  }

  findHostileSpawns(): StructureSpawn[] {
    return this.creep.room.find(FIND_HOSTILE_SPAWNS);
  }

  findClosestHostileSpawn(): StructureSpawn | null {
    return this.creep.pos.findClosestByRange(FIND_HOSTILE_SPAWNS);
  }

  findDamagedAllies(): Creep[] {
    return this.creep.room.find(FIND_MY_CREEPS, {
      filter: (creep) => creep.hits < creep.hitsMax
    });
  }

  findClosestDamagedAlly(): Creep | null {
    return this.creep.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: (creep) => creep.hits < creep.hitsMax
    });
  }

  // Tactical methods

  flee(target: RoomPosition | { pos: RoomPosition }): void {
    const targetPos = target instanceof RoomPosition ? target : target.pos;
    const path = PathFinder.search(this.creep.pos, { pos: targetPos, range: 5 }, {
      flee: true,
      maxRooms: 1
    });

    if (!path.incomplete && path.path.length > 0) {
      this.creep.moveByPath(path.path);
    } else {
      // Move to the spawn if pathfinding fails
      const spawn = this.creep.room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        this.moveTo(spawn);
      }
    }
  }

  kite(target: AnyCreep | Structure): void {
    const targetPos = target.pos;
    const range = this.creep.pos.getRangeTo(targetPos);

    // Maintain optimal range (3 tiles for ranged attacks)
    if (range < 3) {
      this.flee(targetPos);
    } else if (range > 3) {
      this.moveTo(target);
    }

    // Attack while kiting
    if (this.creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
      this.rangedAttack(target);
    }
  }

  shouldFlee(): boolean {
    const hostiles = this.findAllHostileCreeps();
    if (hostiles.length === 0) return false;

    // Calculate relative strength
    const myAttackPower = this.getAttackPower();
    const hostileAttackPower = hostiles.reduce((sum, hostile) => {
      return sum + this.estimateAttackPower(hostile);
    }, 0);

    // Flee if outnumbered or significantly weaker
    return hostileAttackPower > myAttackPower * 1.5 || this.creep.hits < this.creep.hitsMax * 0.3;
  }

  getAttackPower(): number {
    let power = 0;
    power += this.creep.getActiveBodyparts(ATTACK) * 30;
    power += this.creep.getActiveBodyparts(RANGED_ATTACK) * 10;
    return power;
  }

  estimateAttackPower(creep: Creep): number {
    let power = 0;
    const body = creep.body;

    for (const part of body) {
      if (part.type === ATTACK && part.hits > 0) power += 30;
      if (part.type === RANGED_ATTACK && part.hits > 0) power += 10;
    }

    return power;
  }

  // Movement and positioning

  moveToRoom(roomName: string): void {
    if (this.creep.room.name !== roomName) {
      const exitDir = this.creep.room.findExitTo(roomName);
      if (exitDir !== ERR_NO_PATH && exitDir !== ERR_INVALID_ARGS) {
        const exit = this.creep.pos.findClosestByRange(exitDir);
        if (exit) {
          this.moveTo(exit);
        }
      }
    }
  }

  isInRoom(roomName: string): boolean {
    return this.creep.room.name === roomName;
  }

  maintainFormation(rallyPoint: RoomPosition, range: number = 3): void {
    const distance = this.creep.pos.getRangeTo(rallyPoint);
    if (distance > range) {
      this.moveTo(rallyPoint);
    }
  }

  // Memory management for soldier-specific data

  setTargetRoom(roomName: string): void {
    const memory = this.getMemory();
    memory.targetRoom = roomName;
    this.setMemory(memory);
  }

  getTargetRoom(): string | undefined {
    return this.getMemory().targetRoom;
  }

  setRallyPoint(pos: RoomPosition): void {
    const memory = this.getMemory();
    memory.rallyPoint = { x: pos.x, y: pos.y, roomName: pos.roomName };
    this.setMemory(memory);
  }

  getRallyPoint(): RoomPosition | null {
    const memory = this.getMemory();
    if (memory.rallyPoint) {
      return new RoomPosition(
        memory.rallyPoint.x,
        memory.rallyPoint.y,
        memory.rallyPoint.roomName
      );
    }
    return null;
  }

  setSquadId(squadId: string): void {
    const memory = this.getMemory();
    memory.squadId = squadId;
    this.setMemory(memory);
  }

  getSquadId(): string | undefined {
    return this.getMemory().squadId;
  }
}
