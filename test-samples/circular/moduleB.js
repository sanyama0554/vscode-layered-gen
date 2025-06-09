"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleB = void 0;
const moduleA_1 = require("./moduleA");
const logger_1 = require("../utils/logger");
class ModuleB {
    constructor() {
        this.logger = new logger_1.Logger();
        // This creates a circular dependency!
        this.moduleA = new moduleA_1.ModuleA();
    }
    performTask(source) {
        this.logger.info(`ModuleB: Performing task from ${source}`);
        return this.moduleA.helperMethod('from B');
    }
    anotherMethod() {
        this.logger.debug('ModuleB: Another method called');
    }
}
exports.ModuleB = ModuleB;
//# sourceMappingURL=moduleB.js.map