import { HarvestingDepartment } from "departments/harvesting/hervest.department";
import { CreepTask, DepartmentTypes } from "parts/types";
import { ErrorMapper } from "utils/ErrorMapper";

declare global {
  interface Memory {
    uuid: number;
    log: any;
    harvestingDepartment?: {
      supposedWorkersCount: number;
      availableMaterialsPercentage: number;
      lastSpawnTime: number;
      [key: string]: any;
    };
  }

  interface CreepMemory {
    role: string;
    task: CreepTask;
    specificStructureId?: Id<AnyStructure>;
    specificSourceId?: Id<Source>;
  }

  // Syntax for adding properties to `global` (ex "global.log")
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

  const harvestingDepartment = new HarvestingDepartment();
  harvestingDepartment.run();
});
