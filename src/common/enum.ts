export enum CreepRole {
  Worker = "worker",
  Military = "military",
  Supporter = "supporter"
}

export enum WorkerTypes {
  Builder = "builder",
  Miner = "miner",
  Carrier = "carrier"
}

export enum MilitaryTypes {
  Scout = "scout",
  Defender = "defender",
  Attacker = "attacker"
}

export enum SupporterTypes {
  Upgrader = "upgrader"
}

export enum ControllerTypes {
  Spawner = "spawn",
  Planner = "planner"
}

export enum PartPrices {
  MOVE = 50,
  WORK = 100,
  CARRY = 50,
  ATTACK = 80,
  RANGED_ATTACK = 150,
  HEAL = 250,
  CLAIM = 600,
  TOUGH = 10
}
