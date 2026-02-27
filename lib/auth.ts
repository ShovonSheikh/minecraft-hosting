import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    role: "admin" | "operator" | "viewer";
    createdAt: string;
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
}

function readUsers(): User[] {
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) {
        // Create default admin user
        const defaultUsers: User[] = [
            {
                id: crypto.randomUUID(),
                username: "admin",
                passwordHash: hashPassword("admin"),
                role: "admin",
                createdAt: new Date().toISOString(),
            },
        ];
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        return defaultUsers;
    }

    try {
        const content = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(content);
    } catch {
        return [];
    }
}

function saveUsers(users: User[]) {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function getUsers(): Omit<User, "passwordHash">[] {
    const users = readUsers();
    return users.map(({ passwordHash: _ph, ...rest }) => rest);
}

export function addUser(
    username: string,
    password: string,
    role: User["role"]
): { success: boolean; message: string } {
    const users = readUsers();

    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, message: "Username already exists" };
    }

    if (username.length < 3) {
        return { success: false, message: "Username must be at least 3 characters" };
    }

    if (password.length < 4) {
        return { success: false, message: "Password must be at least 4 characters" };
    }

    users.push({
        id: crypto.randomUUID(),
        username,
        passwordHash: hashPassword(password),
        role,
        createdAt: new Date().toISOString(),
    });

    saveUsers(users);
    return { success: true, message: `User ${username} created` };
}

export function deleteUser(id: string): { success: boolean; message: string } {
    const users = readUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
        return { success: false, message: "User not found" };
    }

    // Don't allow deleting the last admin
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (user.role === "admin" && adminCount <= 1) {
        return { success: false, message: "Cannot delete the last admin user" };
    }

    const filtered = users.filter((u) => u.id !== id);
    saveUsers(filtered);
    return { success: true, message: `User ${user.username} deleted` };
}

export function updateUserRole(
    id: string,
    role: User["role"]
): { success: boolean; message: string } {
    const users = readUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
        return { success: false, message: "User not found" };
    }

    user.role = role;
    saveUsers(users);
    return { success: true, message: `User ${user.username} role updated to ${role}` };
}
