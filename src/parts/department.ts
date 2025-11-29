import { IWorker } from "./worker";

export interface Department {
    supposedWorkersCount: number;
    defaultWorkerBody: BodyPartConstant[];

    run(): void;

    getAvailableMaterials(): number;

    getWorkers(): IWorker[];

    checkIfNewWorkerCanBeUpgraded(): boolean;

    getAnUpgradedWorkerBody(): BodyPartConstant[];

    spawnBestWorkerPossible(): void;

    setAvailableMaterialsPercentage(percentage: number): void;

    setMemory(memory: any): void;

    getMemory(): any;
}
