// Community Department - Manages all other departments
// Controls worker priorities, resource allocation, and worker counts
import { DepartmentMemory, DepartmentsMemory, PlanningDepartmentMemory, WorkerRoles } from "../../parts/types";

export interface DepartmentConfig {
  priority: number; // Lower number = higher priority
  minWorkers: number;
  maxWorkers: number;
  energyPercentage: number;
}

export class CommunityDepartment {
  supposedWorkersCount: number = 0; // Not applicable for community department
  defaultWorkerBody: BodyPartConstant[] = [];
  private static readonly MAX_CREEPS_PER_ROOM = 16;
  private static readonly SCOUT_MIN_ENERGY = 800;

  private departments: DepartmentsMemory = {};

  constructor() {}

  run(): void {
    this.departments = this.getDepartmentsMemory();
    this.updateDepartmentConfigs();
  }

  updateDepartmentConfigs(): void {
    Object.keys(this.departments).forEach((deptKey) => {
      const deptMemory = this.departments[deptKey as keyof DepartmentsMemory];
      if (!deptMemory) return;
      const priority = (deptMemory as DepartmentMemory).priority ?? 5;

      const calculatedWorkersCount = this.calculateSupposedWorkersCount(priority, deptKey);
      (deptMemory as DepartmentMemory).maxWorkersCount = calculatedWorkersCount;

      console.log(`Department ${deptKey} set to max workers: ${calculatedWorkersCount}`);

    //   const calculatedMaterialsPercentage = this.calculateMaterialsPercentage(priority);
      (deptMemory as DepartmentMemory).materialsPercentage = 1;

      Memory.departments![deptKey as keyof DepartmentsMemory] = deptMemory as PlanningDepartmentMemory & DepartmentMemory;
    });
  }

  calculateSupposedWorkersCount(priority: number, deptKey?: string): number {
    // Don't plan scouts unless room has more than 800 energy available
    if (deptKey === 'scoutingDepartment' && this.getRoomAvailableEnergy() <= CommunityDepartment.SCOUT_MIN_ENERGY) {
      return 0;
    }

    const totalCount = this.getTotalExistingWorkersCount();

    // If we've reached the max, don't allocate any more workers
    if (totalCount < CommunityDepartment.MAX_CREEPS_PER_ROOM) {
      // Get active departments (excluding planning, scouting, and community)
      const activeDepartments = this.getListOfDepartments()
        .filter(dept => dept !== 'planningDepartment' && dept !== 'scoutingDepartment' && dept !== 'communityDepartment');

      // Calculate inverted weights: lower priority number = higher weight
      // We use (maxPriority - priority + 1) to invert the priority scale
      const maxPriority = Math.max(...activeDepartments.map(dept => {
        const deptMemory = this.departments[dept as keyof DepartmentsMemory] as DepartmentMemory;
        return deptMemory?.priority || 5;
      }));

      // Calculate total weight sum for normalization
      const totalWeight = activeDepartments.reduce((sum, dept) => {
        const deptMemory = this.departments[dept as keyof DepartmentsMemory] as DepartmentMemory;
        const deptPriority = deptMemory?.priority || 5;
        // Invert priority: higher priority (lower number) gets higher weight
        return sum + (maxPriority - deptPriority + 1);
      }, 0);

      // Calculate this department's weight (inverted priority)
      const departmentWeight = maxPriority - priority + 1;

      // Calculate precise allocation using weight ratio
      // weight / totalWeight gives the fraction of MAX_CREEPS this department should get
      const preciseAllocation = (departmentWeight / totalWeight) * CommunityDepartment.MAX_CREEPS_PER_ROOM;

      // Use Math.round for more balanced distribution, ensure at least 1 worker for active departments
      const adjustedAllocation = Math.max(1, Math.round(preciseAllocation));

      // Departments should spawn all their workers one after another. So we should put a number for the next department when the previous one is full
      const higherPriorityDept = Object.keys(this.departments).find((key) => {
        const dept = this.departments[key as keyof DepartmentsMemory];
        return (dept as DepartmentMemory).priority < priority;
      });

      // Special case: Upgrading department should only spawn if there's at least one harvester
      if (deptKey === 'upgradingDepartment') {
        const existingHarvesters = Object.values(Game.creeps).filter(creep => creep.memory.role === 'harvestingDepartment').length;
        if (existingHarvesters > 0) {
          return Math.min(adjustedAllocation, 1);
        }
      }

      const rolesPerDepartment: { [key: string]: string } = {
        'harvestingDepartment': WorkerRoles.Harvester,
        'buildingDepartment': WorkerRoles.Builder,
        'upgradingDepartment': WorkerRoles.Upgrader,
        'defenseDepartment': WorkerRoles.Defender,
      };

      if (higherPriorityDept) {
        const higherDept = this.departments[higherPriorityDept as keyof DepartmentsMemory];
        const higherMaxWorkers = (higherDept as DepartmentMemory).maxWorkersCount || 0;
        const higherWorkersCount = Object.values(Game.creeps).filter(creep => creep.memory.role === rolesPerDepartment[higherPriorityDept]).length;
        if (higherWorkersCount < higherMaxWorkers) {
          return 0;
        }
      }

      return adjustedAllocation;
    }

    return (this.departments[deptKey as keyof DepartmentsMemory] as DepartmentMemory )?.maxWorkersCount || 0;
  }

  calculateMaterialsPercentage(priority: number): number {
    const lowestPriority = Math.max(...this.getListOfDepartments()
      .filter(dept => dept !== 'planningDepartment')
      .map((dept) => (this.departments[dept as keyof DepartmentsMemory] as DepartmentMemory)?.priority || 5));
    const calculatedPercentage = ((lowestPriority - priority + 1) / lowestPriority) * 0.5; // Max 80% energy allocation
    return Math.min(calculatedPercentage, 0.5);
  }

  getTotalExistingWorkersCount(): number {
    return Object.values(Game.creeps)?.length || 0;
  }

  getRoomAvailableEnergy(): number {
    // Get total energy available for spawning across all spawns and extensions
    let totalEnergy = 0;
    for (const spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      totalEnergy += spawn.room.energyAvailable;
    }
    return totalEnergy;
  }

  getListOfDepartments(): string[] {
    return Memory.departments ? Object.keys(Memory.departments) : [];
  }

  getDepartmentsMemory(): DepartmentsMemory {
    const { planningDepartment, ...rest } = Memory.departments || {};
    return rest;
  }
}
