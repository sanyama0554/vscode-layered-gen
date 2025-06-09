import { ModuleB } from './moduleB';
import { Logger } from '../utils/logger';

export class ModuleA {
    private logger: Logger;
    private moduleB: ModuleB;

    constructor() {
        this.logger = new Logger();
        this.moduleB = new ModuleB();
    }

    doSomething(): string {
        this.logger.info('ModuleA: Doing something...');
        return this.moduleB.performTask('from A');
    }

    helperMethod(data: string): string {
        this.logger.debug(`ModuleA: Helper called with: ${data}`);
        return `ModuleA processed: ${data}`;
    }
}