import { UserService } from './services/userService';
import { DatabaseConnection } from './database/connection';
import { Logger } from './utils/logger';

export class App {
    private userService: UserService;
    private db: DatabaseConnection;
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
        this.db = new DatabaseConnection();
        this.userService = new UserService(this.db, this.logger);
    }

    async start(): Promise<void> {
        this.logger.info('Starting application...');
        await this.db.connect();
        this.logger.info('Application started successfully');
    }
}