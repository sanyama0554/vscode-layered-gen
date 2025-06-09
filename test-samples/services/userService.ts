import { DatabaseConnection } from '../database/connection';
import { Logger } from '../utils/logger';
import { User } from '../models/user';
import { UserRepository } from '../repositories/userRepository';

export class UserService {
    private userRepository: UserRepository;

    constructor(
        private db: DatabaseConnection,
        private logger: Logger
    ) {
        this.userRepository = new UserRepository(db);
    }

    async createUser(userData: Partial<User>): Promise<User> {
        this.logger.info('Creating new user');
        
        const user = new User(userData);
        const savedUser = await this.userRepository.save(user);
        
        this.logger.info(`User created with ID: ${savedUser.id}`);
        return savedUser;
    }

    async getUserById(id: string): Promise<User | null> {
        this.logger.debug(`Fetching user with ID: ${id}`);
        return await this.userRepository.findById(id);
    }
}