import { ScoutTasks } from "parts/types";
import { IWorker, Worker } from "parts/worker";

export interface IScout extends IWorker {
  findTargetRoom(): string | null;
  moveToRoom(roomName: string): void;
  claimController(controller: StructureController): void;
}

export class Scout extends Worker implements IScout {
  task: ScoutTasks = ScoutTasks.Scouting;

  constructor(creep: Creep) {
    super(creep);

    const memory = this.getMemory();
    this.task = memory.task as ScoutTasks;
  }

  run(): void {
    switch (this.task) {
      case ScoutTasks.Scouting:
        this.scoutTask();
        break;
      case ScoutTasks.Claiming:
        this.claimTask();
        break;
      case ScoutTasks.Reserving:
        this.reserveTask();
        break;
      default:
        console.log(`Unknown task for scout ${this.creep.name}: ${this.task}`);
    }
  }

  scoutTask(): void {
    const memory = this.getMemory();
    let targetRoom = memory.targetRoom;

    // If no target room assigned, find one
    if (!targetRoom) {
      const foundRoom = this.findTargetRoom();
      if (foundRoom) {
        targetRoom = foundRoom;
        memory.targetRoom = targetRoom;
        this.setMemory(memory);
        console.log(`Scout ${this.creep.name} assigned to room ${targetRoom}`);
      } else {
        console.log(`Scout ${this.creep.name} found no target room`);
        return;
      }
    }

    // Check if we're in the target room
    if (this.creep.room.name === targetRoom) {
      const controller = this.creep.room.controller;

      if (!controller) {
        console.log(`Scout ${this.creep.name}: Room ${targetRoom} has no controller`);
        // Clear target and find a new room
        memory.targetRoom = undefined;
        this.setMemory(memory);
        return;
      }

      // Check if controller can be claimed
      if (!controller.owner && !controller.reservation) {
        this.switchTask(ScoutTasks.Claiming, '🚩 Claiming');
        this.claimTask();
      } else if (!controller.owner && controller.reservation && controller.reservation.username !== this.creep.owner.username) {
        // Try to claim if reserved by someone else but claimable
        this.switchTask(ScoutTasks.Claiming, '🚩 Claiming');
        this.claimTask();
      } else if (!controller.owner) {
        // Reserve the controller if not owned
        this.switchTask(ScoutTasks.Reserving, '⏰ Reserving');
        this.reserveTask();
      } else {
        console.log(`Scout ${this.creep.name}: Room ${targetRoom} controller already owned by ${controller.owner.username}`);
        // Clear target and find a new room
        memory.targetRoom = undefined;
        this.setMemory(memory);
      }
    } else {
      // Move to the target room
      this.moveToRoom(targetRoom);
    }
  }

  claimTask(): void {
    const memory = this.getMemory();
    const targetRoom = memory.targetRoom;

    if (!targetRoom) {
      this.switchTask(ScoutTasks.Scouting, '🔍 Scouting');
      return;
    }

    // Check if we're in the target room
    if (this.creep.room.name !== targetRoom) {
      this.moveToRoom(targetRoom);
      return;
    }

    const controller = this.creep.room.controller;
    if (!controller) {
      console.log(`Scout ${this.creep.name}: No controller in room ${targetRoom}`);
      memory.targetRoom = undefined;
      this.setMemory(memory);
      this.switchTask(ScoutTasks.Scouting, '🔍 Scouting');
      return;
    }

    this.claimController(controller);
  }

  reserveTask(): void {
    const memory = this.getMemory();
    const targetRoom = memory.targetRoom;

    if (!targetRoom) {
      this.switchTask(ScoutTasks.Scouting, '🔍 Scouting');
      return;
    }

    // Check if we're in the target room
    if (this.creep.room.name !== targetRoom) {
      this.moveToRoom(targetRoom);
      return;
    }

    const controller = this.creep.room.controller;
    if (!controller) {
      console.log(`Scout ${this.creep.name}: No controller in room ${targetRoom}`);
      memory.targetRoom = undefined;
      this.setMemory(memory);
      this.switchTask(ScoutTasks.Scouting, '🔍 Scouting');
      return;
    }

    this.reserveController(controller);
  }

  claimController(controller: StructureController): void {
    const result = this.creep.claimController(controller);

    if (result === OK) {
      console.log(`Scout ${this.creep.name} successfully claimed controller in ${controller.room.name}!`);
      this.creep.say('✅ Claimed!');
      // Clear target room after successful claim
      const memory = this.getMemory();
      memory.targetRoom = undefined;
      this.setMemory(memory);
      // Switch back to scouting to find another room
      this.switchTask(ScoutTasks.Scouting, '🔍 Scouting');
    } else if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(controller);
    } else if (result === ERR_GCL_NOT_ENOUGH) {
      console.log(`Scout ${this.creep.name}: Cannot claim - GCL not high enough`);
      // Try reserving instead
      this.switchTask(ScoutTasks.Reserving, '⏰ Reserving');
    } else {
      console.log(`Scout ${this.creep.name}: Failed to claim controller: ${result}`);
      // Clear target and find a new room
      const memory = this.getMemory();
      memory.targetRoom = undefined;
      this.setMemory(memory);
      this.switchTask(ScoutTasks.Scouting, '🔍 Scouting');
    }
  }

  reserveController(controller: StructureController): void {
    const result = this.creep.reserveController(controller);

    if (result === OK) {
      console.log(`Scout ${this.creep.name} successfully reserved controller in ${controller.room.name}`);
      this.creep.say('⏰ Reserved');
      // Stay in the room to maintain reservation
    } else if (result === ERR_NOT_IN_RANGE) {
      this.moveTo(controller);
    } else {
      console.log(`Scout ${this.creep.name}: Failed to reserve controller: ${result}`);
    }
  }

  moveToRoom(roomName: string): void {
    const exitDir = this.creep.room.findExitTo(roomName);

    if (exitDir === ERR_NO_PATH || exitDir === ERR_INVALID_ARGS) {
      console.log(`Scout ${this.creep.name}: No path to room ${roomName}`);
      // Clear invalid target
      const memory = this.getMemory();
      memory.targetRoom = undefined;
      this.setMemory(memory);
      return;
    }

    const exit = this.creep.pos.findClosestByRange(exitDir);
    if (exit) {
      this.moveTo(exit);
      this.creep.say(`➡️ ${roomName}`);
    }
  }

  findTargetRoom(): string | null {
    // Find adjacent rooms that might be claimable
    const currentRoom = this.creep.room.name;
    const exits = Game.map.describeExits(currentRoom);

    if (!exits) {
      return null;
    }

    // Get all adjacent room names
    const adjacentRooms = Object.values(exits);

    // Filter for potentially claimable rooms (avoid highway rooms)
    const targetRooms = adjacentRooms.filter(roomName => {
      // Parse room coordinates to avoid highway rooms
      const parsed = /^([WE])([0-9]+)([NS])([0-9]+)$/.exec(roomName);
      if (!parsed) return false;

      const x = parseInt(parsed[2]);
      const y = parseInt(parsed[4]);

      // Highway rooms are at x%10===0 or y%10===0
      return x % 10 !== 0 && y % 10 !== 0;
    });

    // Check if we have room information and prioritize unowned rooms
    for (const roomName of targetRooms) {
      const roomStatus = Game.map.getRoomStatus(roomName);

      // Skip closed or respawn rooms
      if (roomStatus && roomStatus.status !== 'normal') {
        continue;
      }

      // Check if we have vision of this room
      const room = Game.rooms[roomName];
      if (room && room.controller) {
        // Prioritize rooms without owners
        if (!room.controller.owner) {
          return roomName;
        }
      } else {
        // No vision, might be a good target
        return roomName;
      }
    }

    // If no perfect room found, return the first available
    return targetRooms.length > 0 ? targetRooms[0] : null;
  }
}
