import { BuildingDepartment } from "departments/building/building.department";
import { CommunityDepartment } from "departments/community/community.department";
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
    specificStructureId?: Id<AnyStructure>;
    specificSourceId?: Id<Source>;
    lastHarvestedSourceId?: Id<Source>;
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

  const communityDepartment = new CommunityDepartment();
  communityDepartment.run();

  const harvestingDepartment = new HarvestingDepartment();
  harvestingDepartment.run();

  const buildingDepartment = new BuildingDepartment();
  buildingDepartment.run();

  const upgradingDepartment = new UpgradingDepartment();
  upgradingDepartment.run();
});
