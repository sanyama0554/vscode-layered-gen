"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const userService_1 = require("./services/userService");
const connection_1 = require("./database/connection");
const logger_1 = require("./utils/logger");
class App {
    constructor() {
        this.logger = new logger_1.Logger();
        this.db = new connection_1.DatabaseConnection();
        this.userService = new userService_1.UserService(this.db, this.logger);
    }
    async start() {
        this.logger.info('Starting application...');
        await this.db.connect();
        this.logger.info('Application started successfully');
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map