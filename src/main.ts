import { Role } from "common/roles";
import { CreepAction } from "creeps/base.creep";
import { MinerCreep } from "creeps/miner.creep";
import { CarrierCreep } from "creeps/carrier.creep";
import { SpawnerController } from "controllers/spawner.controller";
import { ErrorMapper } from "utils/ErrorMapper";

declare global {
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    spawnQueue?: Role[];
    currentSpawnIndex?: number;
  }

  interface CreepMemory {
    role: Role;
    room: string;
    currentAction?: CreepAction;
    ignoreTargets?: Id<any>[];
    targetSource?: Id<Source>;
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

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  // Run spawner logic
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];
    const spawner = new SpawnerController(spawn);
    spawner.run();
  }

  // Run creep logic
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    runCreep(creep);
  }
});

function runCreep(creep: Creep): void {
  switch (creep.memory.role) {
    case Role.Miner:
      new MinerCreep(creep).run();
      break;
    case Role.Carrier:
      new CarrierCreep(creep).run();
      break;
    default:
      console.log(`Unknown role: ${creep.memory.role}`);
  }
}
