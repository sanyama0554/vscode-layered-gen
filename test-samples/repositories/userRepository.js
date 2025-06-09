"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const user_1 = require("../models/user");
const logger_1 = require("../utils/logger");
class UserRepository {
    constructor(db) {
        this.db = db;
        this.logger = new logger_1.Logger();
    }
    async save(user) {
        this.logger.debug(`Saving user: ${user.email}`);
        const query = `INSERT INTO users (id, name, email, created_at, updated_at) 
                       VALUES ('${user.id}', '${user.name}', '${user.email}', 
                               '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}')`;
        await this.db.query(query);
        this.logger.info(`User saved successfully: ${user.id}`);
        return user;
    }
    async findById(id) {
        this.logger.debug(`Finding user by ID: ${id}`);
        const query = `SELECT * FROM users WHERE id = '${id}'`;
        const results = await this.db.query(query);
        if (results.length === 0) {
            this.logger.debug(`User not found: ${id}`);
            return null;
        }
        const userData = results[0];
        const user = new user_1.User({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            createdAt: new Date(userData.created_at),
            updatedAt: new Date(userData.updated_at)
        });
        this.logger.debug(`User found: ${user.email}`);
        return user;
    }
    async findByEmail(email) {
        this.logger.debug(`Finding user by email: ${email}`);
        const query = `SELECT * FROM users WHERE email = '${email}'`;
        const results = await this.db.query(query);
        if (results.length === 0) {
            return null;
        }
        const userData = results[0];
        return new user_1.User({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            createdAt: new Date(userData.created_at),
            updatedAt: new Date(userData.updated_at)
        });
    }
    async deleteById(id) {
        this.logger.debug(`Deleting user: ${id}`);
        const query = `DELETE FROM users WHERE id = '${id}'`;
        await this.db.query(query);
        this.logger.info(`User deleted: ${id}`);
        return true;
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=userRepository.js.map