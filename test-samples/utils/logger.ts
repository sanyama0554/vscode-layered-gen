export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private logLevel: LogLevel = LogLevel.INFO;

    constructor(level: LogLevel = LogLevel.INFO) {
        this.logLevel = level;
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    debug(message: string): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
        }
    }

    info(message: string): void {
        if (this.logLevel <= LogLevel.INFO) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
        }
    }

    warn(message: string): void {
        if (this.logLevel <= LogLevel.WARN) {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
        }
    }

    error(message: string): void {
        if (this.logLevel <= LogLevel.ERROR) {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        }
    }
}