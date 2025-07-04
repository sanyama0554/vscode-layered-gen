"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationHelper = exports.ValidationError = void 0;
const logger_1 = require("./logger");
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ValidationHelper {
    constructor() {
        this.logger = new logger_1.Logger();
    }
    validateEmail(email) {
        this.logger.debug(`Validating email: ${email}`);
        if (!email || email.trim() === '') {
            throw new ValidationError('Email is required', 'email');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ValidationError('Invalid email format', 'email');
        }
        this.logger.debug('Email validation passed');
    }
    validateName(name) {
        this.logger.debug(`Validating name: ${name}`);
        if (!name || name.trim() === '') {
            throw new ValidationError('Name is required', 'name');
        }
        if (name.length < 2) {
            throw new ValidationError('Name must be at least 2 characters', 'name');
        }
        if (name.length > 100) {
            throw new ValidationError('Name must be less than 100 characters', 'name');
        }
        this.logger.debug('Name validation passed');
    }
    validateId(id) {
        this.logger.debug(`Validating ID: ${id}`);
        if (!id || id.trim() === '') {
            throw new ValidationError('ID is required', 'id');
        }
        this.logger.debug('ID validation passed');
    }
}
exports.ValidationHelper = ValidationHelper;
//# sourceMappingURL=validation.js.map