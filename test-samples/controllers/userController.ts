import { UserService } from '../services/userService';
import { Logger } from '../utils/logger';
import { ValidationHelper } from '../utils/validation';

export interface CreateUserRequest {
    name: string;
    email: string;
}

export interface UserResponse {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

export class UserController {
    private logger: Logger;
    private validator: ValidationHelper;

    constructor(private userService: UserService) {
        this.logger = new Logger();
        this.validator = new ValidationHelper();
    }

    async createUser(request: CreateUserRequest): Promise<UserResponse> {
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

    async getUser(id: string): Promise<UserResponse | null> {
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