import { Soldier } from "../../parts/soldier";

export interface IDefender extends Soldier {
  run(): void;
}

export class Defender extends Soldier implements IDefender {
  run(): void {
    // Priority 1: Clear all hostile creeps from the room
    const hostileCreeps = this.findAllHostileCreeps();
    if (hostileCreeps.length > 0) {
      const target = this.selectBestHostileTarget(hostileCreeps);
      if (target) {
        console.log(`[Defender ${this.creep.name}] Engaging hostile creep ${target.name}`);
        this.engageHostile(target);
        return;
      }
    }

    // Priority 2: Clear all hostile structures from the room (including layers/ramparts)
    const hostileStructures = this.findAllHostileStructures();
    if (hostileStructures.length > 0) {
      const target = this.selectBestStructureTarget(hostileStructures);
      if (target) {
        console.log(`[Defender ${this.creep.name}] Attacking structure ${target.structureType} at ${target.pos}`);
        this.attackStructure(target);
        return;
      }
    }

    // Priority 3: Clear hostile construction sites
    const hostileConstructionSites = this.findHostileConstructionSites();
    if (hostileConstructionSites.length > 0) {
      const target = this.creep.pos.findClosestByRange(hostileConstructionSites);
      if (target) {
        console.log(`[Defender ${this.creep.name}] Attacking construction site ${target.structureType}`);
        this.attackStructure(target);
        return;
      }
    }

    // Priority 4: Heal damaged allies
    const damagedAlly = this.findClosestDamagedAlly();
    if (damagedAlly) {
      console.log(`[Defender ${this.creep.name}] Healing ally ${damagedAlly.name}`);
      this.heal(damagedAlly);
      return;
    }

    // Priority 5: Patrol or maintain position
    this.patrol();
  }

  private selectBestHostileTarget(hostiles: Creep[]): Creep | null {
    if (hostiles.length === 0) return null;

    // Prioritize targets: healers > ranged attackers > melee attackers > others
    const healers = hostiles.filter(h => h.getActiveBodyparts(HEAL) > 0);
    if (healers.length > 0) {
      return this.creep.pos.findClosestByRange(healers);
    }

    const rangedAttackers = hostiles.filter(h => h.getActiveBodyparts(RANGED_ATTACK) > 0);
    if (rangedAttackers.length > 0) {
      return this.creep.pos.findClosestByRange(rangedAttackers);
    }

    const meleeAttackers = hostiles.filter(h => h.getActiveBodyparts(ATTACK) > 0);
    if (meleeAttackers.length > 0) {
      return this.creep.pos.findClosestByRange(meleeAttackers);
    }

    // Default to closest hostile
    return this.creep.pos.findClosestByRange(hostiles);
  }

  private selectBestStructureTarget(structures: Structure[]): Structure | null {
    if (structures.length === 0) return null;

    // Prioritize: spawns > towers > extensions > storage/terminal > walls/ramparts > others
    const spawns = structures.filter(s => s.structureType === STRUCTURE_SPAWN);
    if (spawns.length > 0) {
      return this.creep.pos.findClosestByRange(spawns);
    }

    const towers = structures.filter(s => s.structureType === STRUCTURE_TOWER);
    if (towers.length > 0) {
      return this.creep.pos.findClosestByRange(towers);
    }

    const extensions = structures.filter(s => s.structureType === STRUCTURE_EXTENSION);
    if (extensions.length > 0) {
      return this.creep.pos.findClosestByRange(extensions);
    }

    const storage = structures.filter(s =>
      s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_TERMINAL
    );
    if (storage.length > 0) {
      return this.creep.pos.findClosestByRange(storage);
    }

    // Attack walls and ramparts (layers) last as they take the longest
    const layers = structures.filter(s =>
      s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART
    );
    if (layers.length > 0) {
      // Find the weakest layer to break through faster
      const weakestLayer = layers.reduce((weakest, current) => {
        return current.hits < weakest.hits ? current : weakest;
      });
      return weakestLayer;
    }

    // Default to closest structure
    return this.creep.pos.findClosestByRange(structures);
  }

  private findAllHostileStructures(): Structure[] {
    // Find ALL hostile structures including walls and ramparts
    return this.creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (structure) => {
        return structure.structureType !== STRUCTURE_CONTROLLER;
      }
    });
  }

  private findHostileConstructionSites(): ConstructionSite[] {
    return this.creep.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);
  }

  private engageHostile(hostile: Creep): void {
    // Decide whether to flee or fight
    if (this.shouldFlee()) {
      const spawn = this.creep.room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        this.flee(spawn.pos);
      }
      return;
    }

    // Check if we have ranged attack capability
    const hasRangedAttack = this.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    const hasMeleeAttack = this.creep.getActiveBodyparts(ATTACK) > 0;

    if (hasRangedAttack && !hasMeleeAttack) {
      // Pure ranged defender - kite the enemy
      this.kite(hostile);
    } else if (hasRangedAttack && hasMeleeAttack) {
      // Hybrid defender - use ranged when far, melee when close
      const range = this.creep.pos.getRangeTo(hostile);
      if (range > 1) {
        this.rangedAttack(hostile);
        this.moveTo(hostile);
      } else {
        this.attack(hostile);
        this.rangedMassAttack();
      }
    } else {
      // Pure melee defender - close in and attack
      this.attack(hostile);
    }

    // Self-heal if damaged
    if (this.creep.hits < this.creep.hitsMax && this.creep.getActiveBodyparts(HEAL) > 0) {
      this.creep.heal(this.creep);
    }
  }

  private attackStructure(structure: Structure | ConstructionSite): void {
    const hasRangedAttack = this.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    const hasMeleeAttack = this.creep.getActiveBodyparts(ATTACK) > 0;

    console.log(`[Defender ${this.creep.name}] Has ranged: ${hasRangedAttack}, Has melee: ${hasMeleeAttack}`);

    if (!hasRangedAttack && !hasMeleeAttack) {
      console.log(`[Defender ${this.creep.name}] ERROR: No attack parts available!`);
      return;
    }

    if (hasRangedAttack) {
      const result = this.creep.rangedAttack(structure as Structure);
      console.log(`[Defender ${this.creep.name}] Ranged attack result: ${result}`);
      if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(structure);
      }
    } else if (hasMeleeAttack) {
      const result = this.creep.attack(structure as Structure);
      console.log(`[Defender ${this.creep.name}] Melee attack result: ${result}`);
      if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(structure);
      }
    }
  }

  private patrol(): void {
    // Get or set rally point (center of room by default)
    let rallyPoint = this.getRallyPoint();
    if (!rallyPoint) {
      rallyPoint = new RoomPosition(25, 25, this.creep.room.name);
      this.setRallyPoint(rallyPoint);
    }

    // If at rally point, move to a random patrol point
    if (this.creep.pos.getRangeTo(rallyPoint) <= 3) {
      const patrolPoint = this.getNextPatrolPoint();
      this.moveTo(patrolPoint);
    } else {
      // Move back to rally point
      this.moveTo(rallyPoint);
    }
  }

  private getNextPatrolPoint(): RoomPosition {
    // Patrol key defensive positions (controller, spawns, etc.)
    const controller = this.creep.room.controller;
    const spawns = this.creep.room.find(FIND_MY_SPAWNS);
    const sources = this.creep.room.find(FIND_SOURCES);

    const patrolTargets: RoomPosition[] = [];

    if (controller && controller.my) {
      patrolTargets.push(controller.pos);
    }

    spawns.forEach(spawn => patrolTargets.push(spawn.pos));
    sources.forEach(source => patrolTargets.push(source.pos));

    // Choose a random patrol target
    if (patrolTargets.length > 0) {
      const randomIndex = Math.floor(Math.random() * patrolTargets.length);
      return patrolTargets[randomIndex];
    }

    // Fallback to room center
    return new RoomPosition(25, 25, this.creep.room.name);
  }
}
