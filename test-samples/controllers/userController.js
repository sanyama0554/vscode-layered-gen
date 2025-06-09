"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
class UserController {
    constructor(userService) {
        this.userService = userService;
        this.logger = new logger_1.Logger();
        this.validator = new validation_1.ValidationHelper();
    }
    async createUser(request) {
        this.logger.info(`Creating user: ${request.email}`);
        // Validate request
        this.validator.validateEmail(request.email);
        this.validator.validateName(request.name);
        // Create user
        const user = await this.userService.createUser({
            name: request.name,
            email: request.email
        });
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString()
        };
    }
    async getUser(id) {
        this.logger.info(`Fetching user: ${id}`);
        const user = await this.userService.getUserById(id);
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString()
        };
    }
}
exports.UserController = UserController;
//# sourceMappingURL=userController.js.map