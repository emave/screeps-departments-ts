export type CreepTask = HarvesterTasks

export enum HarvesterTasks {
  Harvesting = "harvesting",
  Supplying = "restocking",
}

export enum BuilderTasks {
  Building = "building",
  Upgrading = "upgrading",
}

export enum WorkerRoles {
  Harvester = "harvester",
  Builder = "builder",
  Scout = "scout",
  Attacker = "attacker",
  Defender = "defender",
}

export enum DepartmentTypes {
  Harvesting = "harvesting",
  Building = "building",
  Defense = "defense",
  Scouting = "scouting",
  Attacking = "attacking",
}
