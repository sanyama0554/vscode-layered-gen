"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_1 = require("../models/user");
const userRepository_1 = require("../repositories/userRepository");
class UserService {
    constructor(db, logger) {
        this.db = db;
        this.logger = logger;
        this.userRepository = new userRepository_1.UserRepository(db);
    }
    async createUser(userData) {
        this.logger.info('Creating new user');
        const user = new user_1.User(userData);
        const savedUser = await this.userRepository.save(user);
        this.logger.info(`User created with ID: ${savedUser.id}`);
        return savedUser;
    }
    async getUserById(id) {
        this.logger.debug(`Fetching user with ID: ${id}`);
        return await this.userRepository.findById(id);
    }
}
exports.UserService = UserService;
//# sourceMappingURL=userService.js.map