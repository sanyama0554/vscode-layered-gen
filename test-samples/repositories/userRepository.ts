import { DatabaseConnection } from '../database/connection';
import { User } from '../models/user';
import { Logger } from '../utils/logger';

export class UserRepository {
    private logger: Logger;

    constructor(private db: DatabaseConnection) {
        this.logger = new Logger();
    }

    async save(user: User): Promise<User> {
        this.logger.debug(`Saving user: ${user.email}`);
        
        const query = `INSERT INTO users (id, name, email, created_at, updated_at) 
                       VALUES ('${user.id}', '${user.name}', '${user.email}', 
                               '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}')`;
        
        await this.db.query(query);
        this.logger.info(`User saved successfully: ${user.id}`);
        
        return user;
    }

    async findById(id: string): Promise<User | null> {
        this.logger.debug(`Finding user by ID: ${id}`);
        
        const query = `SELECT * FROM users WHERE id = '${id}'`;
        const results = await this.db.query(query);
        
        if (results.length === 0) {
            this.logger.debug(`User not found: ${id}`);
            return null;
        }
        
        const userData = results[0];
        const user = new User({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            createdAt: new Date(userData.created_at),
            updatedAt: new Date(userData.updated_at)
        });
        
        this.logger.debug(`User found: ${user.email}`);
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        this.logger.debug(`Finding user by email: ${email}`);
        
        const query = `SELECT * FROM users WHERE email = '${email}'`;
        const results = await this.db.query(query);
        
        if (results.length === 0) {
            return null;
        }
        
        const userData = results[0];
        return new User({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            createdAt: new Date(userData.created_at),
            updatedAt: new Date(userData.updated_at)
        });
    }

    async deleteById(id: string): Promise<boolean> {
        this.logger.debug(`Deleting user: ${id}`);
        
        const query = `DELETE FROM users WHERE id = '${id}'`;
        await this.db.query(query);
        
        this.logger.info(`User deleted: ${id}`);
        return true;
    }
}