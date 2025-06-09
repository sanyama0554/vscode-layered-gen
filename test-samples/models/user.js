"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
class User {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.email = data.email || '';
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    updateName(name) {
        this.name = name;
        this.updatedAt = new Date();
    }
    updateEmail(email) {
        this.email = email;
        this.updatedAt = new Date();
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}
exports.User = User;
//# sourceMappingURL=user.js.map