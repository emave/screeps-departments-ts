import { WorkerTypes } from "common/enum";
import { SpawnerController } from "controllers/spawner/spawner.controller";
import { CarrierBehavior } from "utils/behaviors/carrier.behavior";
import { MinerBehavior } from "utils/behaviors/miner.behavior";
import { WorkerBehavior } from "utils/behaviors/worker.behavior";
import { ErrorMapper } from "utils/ErrorMapper";
import { findHostilesInAllSpawnsRooms } from "utils/findHostiles";

declare global {
  interface Memory {
    maxCreepsPerRoom: number;
    enemyPositions: { [roomName: string]: { x: number; y: number }[] };
  }

  interface CreepMemory {
    role: string;
    working: boolean;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  findHostilesInAllSpawnsRooms().forEach(({ room, hostiles }) => {
    if (!Memory.enemyPositions) {
      Memory.enemyPositions = {};
    }
    Memory.enemyPositions[room] = hostiles.map(hostile => ({ x: hostile.pos.x, y: hostile.pos.y }));
  });

  new SpawnerController().run();

  // Run each creep
  Object.values(Game.creeps).forEach((creep: Creep) => {
    switch (creep.memory.role) {
      case WorkerTypes.Miner:
        new MinerBehavior(creep).run();
        break;
      case WorkerTypes.Carrier:
        new CarrierBehavior(creep).run();
        break;
    }
  });

  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
      console.log(`Clearing non-existing creep memory: ${name}`);
    }
  }
});
