import { BuildingDepartment } from "departments/building/building.department";
import { CommunityDepartment } from "departments/community/community.department";
import { DefenseDepartment } from "departments/defense/defense.department";
import { HarvestingDepartment } from "departments/harvesting/hervest.department";
import { UpgradingDepartment } from "departments/upgrading/upgrading.department";
import { CreepTask, DepartmentsMemory, DepartmentTypes } from "parts/types";
import { ErrorMapper } from "utils/ErrorMapper";

declare global {
  interface Memory {
    uuid: number;
    log: any;
    departments: DepartmentsMemory;
  }

  interface CreepMemory {
    role: string;
    task: CreepTask;
    // Worker-specific properties
    specificStructureId?: Id<AnyStructure>;
    specificSourceId?: Id<Source>;
    lastHarvestedSourceId?: Id<Source>;
    // Soldier-specific properties
    targetRoom?: string;
    rallyPoint?: { x: number; y: number; roomName: string };
    squadId?: string;
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

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  const communityDepartment = new CommunityDepartment();
  communityDepartment.run();

  const defenseDepartment = new DefenseDepartment();
  defenseDepartment.run();

  const harvestingDepartment = new HarvestingDepartment();
  harvestingDepartment.run();

  const buildingDepartment = new BuildingDepartment();
  buildingDepartment.run();

  const upgradingDepartment = new UpgradingDepartment();
  upgradingDepartment.run();
});
