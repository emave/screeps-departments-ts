import { IWorker } from "./worker";

export interface Department {
    maxWorkersCount: number;
    defaultWorkerBody: BodyPartConstant[];

    run(): void;

    getAvailableMaterials(): number;

    getWorkers(): IWorker[];

    checkIfNewWorkerCanBeUpgraded(): boolean;

    getAnUpgradedWorkerBody(): BodyPartConstant[];

    spawnBestWorkerPossible(): void;

    setMaterialsPercentage(percentage: number): void;

    setMemory(memory: any): void;

    getMemory(): any;
}
