import { Logger } from './logger';

export class ValidationError extends Error {
    constructor(message: string, public field: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class ValidationHelper {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    validateEmail(email: string): void {
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

    validateName(name: string): void {
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

    validateId(id: string): void {
        this.logger.debug(`Validating ID: ${id}`);

        if (!id || id.trim() === '') {
            throw new ValidationError('ID is required', 'id');
        }

        this.logger.debug('ID validation passed');
    }
}