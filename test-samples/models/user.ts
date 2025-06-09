export interface UserData {
    id?: string;
    name: string;
    email: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class User {
    public readonly id: string;
    public name: string;
    public email: string;
    public createdAt: Date;
    public updatedAt: Date;

    constructor(data: Partial<UserData>) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.email = data.email || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    updateName(name: string): void {
        this.name = name;
        this.updatedAt = new Date();
    }

    updateEmail(email: string): void {
        this.email = email;
        this.updatedAt = new Date();
    }

    toJSON(): UserData {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}