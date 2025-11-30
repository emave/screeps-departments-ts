export type CreepTask = HarvesterTasks | BuilderTasks | UpgraderTasks | ScoutTasks

export enum HarvesterTasks {
  Harvesting = "harvesting",
  Supplying = "restocking",
  Building = "building",
  Upgrading = "upgrading",
}

export enum BuilderTasks {
  Harvesting = "harvesting",
  Building = "building",
  Upgrading = "upgrading",
}

export enum UpgraderTasks {
  Harvesting = "harvesting",
  Upgrading = "upgrading",
}

export enum ScoutTasks {
  Scouting = "scouting",
  Claiming = "claiming",
  Reserving = "reserving",
}

export enum WorkerRoles {
  Harvester = "harvester",
  Builder = "builder",
  Upgrader = "upgrader",
  Scout = "scout",
  Attacker = "attacker",
  Defender = "defender",
}
export enum DepartmentTypes {
  Harvesting = "harvesting",
  Building = "building",
  Upgrading = "upgrading",
  Defense = "defense",
  Scouting = "scouting",
  Attacking = "attacking",
}

export type DepartmentMemory = {
  priority: number;
  maxWorkersCount: number;
  materialsPercentage: number;
  highestProducedBody?: BodyPartConstant[];
  highestProducedBodyCost?: number;
};

export type PlanningDepartmentMemory = {
  plannedPositions: {
    [spawnName: string]: boolean;
  };
  lastPlanTick: number;
};

export type DepartmentsMemory = {
  harvestingDepartment?: DepartmentMemory;
  buildingDepartment?: DepartmentMemory;
  upgradingDepartment?: DepartmentMemory;
  defenseDepartment?: DepartmentMemory;
  planningDepartment?: PlanningDepartmentMemory;
  scoutingDepartment?: DepartmentMemory;
};
