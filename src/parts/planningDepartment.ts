// Interface for departments that plan base layout but don't manage workers
export interface PlanningDepartment {
  run(): void;
  setMemory(memory: any): void;
  getMemory(): any;
}
