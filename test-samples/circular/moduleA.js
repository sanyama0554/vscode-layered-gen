"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleA = void 0;
const moduleB_1 = require("./moduleB");
const logger_1 = require("../utils/logger");
class ModuleA {
    constructor() {
        this.logger = new logger_1.Logger();
        this.moduleB = new moduleB_1.ModuleB();
    }
    doSomething() {
        this.logger.info('ModuleA: Doing something...');
        return this.moduleB.performTask('from A');
    }
    helperMethod(data) {
        this.logger.debug(`ModuleA: Helper called with: ${data}`);
        return `ModuleA processed: ${data}`;
    }
}
exports.ModuleA = ModuleA;
//# sourceMappingURL=moduleA.js.map