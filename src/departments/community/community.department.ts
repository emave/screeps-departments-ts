// Community Department - Manages all other departments
// Controls worker priorities, resource allocation, and worker counts
import { DepartmentsMemory, WorkerRoles } from "../../parts/types";

export interface DepartmentConfig {
  priority: number; // Lower number = higher priority
  minWorkers: number;
  maxWorkers: number;
  energyPercentage: number;
}

export class CommunityDepartment {
  supposedWorkersCount: number = 0; // Not applicable for community department
  defaultWorkerBody: BodyPartConstant[] = [];
  private static readonly MAX_CREEPS_PER_ROOM = 13;

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
      const priority = deptMemory.priority ?? 5;

      const calculatedWorkersCount = this.calculateSupposedWorkersCount(priority);
      deptMemory.maxWorkersCount = calculatedWorkersCount;

      const calculatedMaterialsPercentage = this.calculateMaterialsPercentage(priority);
      deptMemory.materialsPercentage = calculatedMaterialsPercentage;
    });

    // Save updated configs back to memory
    Memory.departments = this.departments;
  }

  calculateSupposedWorkersCount(priority: number): number {
    const totalCount = this.getTotalExistingWorkersCount();

    // Cap total creeps at MAX_CREEPS_PER_ROOM
    const effectiveTotalCount = Math.min(totalCount, CommunityDepartment.MAX_CREEPS_PER_ROOM);

    // If we've reached the max, don't allocate any more workers
    if (totalCount >= CommunityDepartment.MAX_CREEPS_PER_ROOM) {
      // Return current worker count for this department to maintain existing workers
      const currentWorkerCount = Object.values(Game.creeps).filter((creep) => {
        const role = creep.memory.role;
        const deptKey = Object.keys(this.departments).find((dept) => {
          const deptMemory = this.departments[dept as keyof DepartmentsMemory];
          return deptMemory?.priority === priority;
        });

        if (!deptKey) return false;

        return (
          (deptKey === 'harvestingDepartment' && role === WorkerRoles.Harvester) ||
          (deptKey === 'buildingDepartment' && role === WorkerRoles.Builder) ||
          (deptKey === 'upgradingDepartment' && role === WorkerRoles.Upgrader) ||
          (deptKey === 'defenseDepartment' && role === WorkerRoles.Defender)
        );
      }).length;

      return currentWorkerCount;
    }

    // Check if any higher priority department has no workers
    const hasHigherPriorityWithNoWorkers = this.getListOfDepartments().some((dept) => {
      const deptMemory = this.departments[dept as keyof DepartmentsMemory];
      if (!deptMemory || deptMemory.priority >= priority) return false;

      // Count workers for this department
      const deptWorkerCount = Object.values(Game.creeps).filter((creep) => {
        const role = creep.memory.role;
        return (
          (dept === 'harvestingDepartment' && role === WorkerRoles.Harvester) ||
          (dept === 'buildingDepartment' && role === WorkerRoles.Builder) ||
          (dept === 'upgradingDepartment' && role === WorkerRoles.Upgrader) ||
          (dept === 'defenseDepartment' && role === WorkerRoles.Defender)
        );
      }).length;

      return deptWorkerCount === 0;
    });

    // If a higher priority department has no workers, this department gets 0
    if (hasHigherPriorityWithNoWorkers) {
      return 0;
    }

    // Calculate priority weight: higher priority (lower number) = higher weight
    // Invert priority so lower number = higher weight
    const priorityWeight = 1 / priority;

    // Calculate total weight of all departments
    const totalWeight = this.getListOfDepartments().reduce((sum, dept) => {
      const deptPriority = this.departments[dept as keyof DepartmentsMemory]?.priority || 5;
      return sum + (1 / deptPriority);
    }, 0);

    // Calculate percentage for this department
    const percentage = priorityWeight / totalWeight;

    // Calculate worker count based on percentage, ensuring at least 1 for highest priority
    // Use effectiveTotalCount (capped at max) instead of totalCount
    const calculatedCount = Math.max(1, Math.ceil(effectiveTotalCount * percentage));
    return calculatedCount;
  }

  calculateMaterialsPercentage(priority: number): number {
    const lowestPriority = Math.max(...this.getListOfDepartments().map((dept) => this.departments[dept as keyof DepartmentsMemory]?.priority || 5));
    const calculatedPercentage = ((lowestPriority - priority + 1) / lowestPriority) * 0.5; // Max 50% energy allocation
    return Math.min(calculatedPercentage, 0.5);
  }

  getTotalExistingWorkersCount(): number {
    return Object.values(Game.creeps)?.length || 0;
  }

  getListOfDepartments(): string[] {
    return Memory.departments ? Object.keys(Memory.departments) : [];
  }

  getDepartmentsMemory(): DepartmentsMemory {
    return Memory.departments || {};
  }
}
