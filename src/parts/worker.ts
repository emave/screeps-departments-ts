export interface IWorker {
  creep: Creep;
  run(): void;

  moveTo(
    target: RoomPosition | { pos: RoomPosition }
  ): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | ERR_NOT_FOUND;
}

// This is the base of a worker creep that can be extended for specific roles.
export class Worker implements IWorker {
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

  setMemory(memory: CreepMemory): void {
    // Update only provided fields in memory
    Object.assign(this.creep.memory, memory);
  }
}
