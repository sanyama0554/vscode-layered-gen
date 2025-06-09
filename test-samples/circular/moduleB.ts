import { ModuleA } from './moduleA';
import { Logger } from '../utils/logger';

export class ModuleB {
    private logger: Logger;
    private moduleA: ModuleA;

    constructor() {
        this.logger = new Logger();
        // This creates a circular dependency!
        this.moduleA = new ModuleA();
    }

    performTask(source: string): string {
        this.logger.info(`ModuleB: Performing task from ${source}`);
        return this.moduleA.helperMethod('from B');
    }

    anotherMethod(): void {
        this.logger.debug('ModuleB: Another method called');
    }
}