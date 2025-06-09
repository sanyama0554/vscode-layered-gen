"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class Logger {
    constructor(level = LogLevel.INFO) {
        this.logLevel = LogLevel.INFO;
        this.logLevel = level;
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    debug(message) {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
        }
    }
    info(message) {
        if (this.logLevel <= LogLevel.INFO) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
        }
    }
    warn(message) {
        if (this.logLevel <= LogLevel.WARN) {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
        }
    }
    error(message) {
        if (this.logLevel <= LogLevel.ERROR) {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map