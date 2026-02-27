import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SCHEDULE_FILE = path.join(DATA_DIR, "schedules.json");

export interface ScheduleTask {
    id: string;
    name: string;
    action: "restart" | "backup" | "command" | "stop";
    command?: string;
    intervalMinutes: number;
    enabled: boolean;
    lastRun: string | null;
    createdAt: string;
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readSchedules(): ScheduleTask[] {
    ensureDataDir();
    if (!fs.existsSync(SCHEDULE_FILE)) {
        fs.writeFileSync(SCHEDULE_FILE, "[]");
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf-8"));
    } catch {
        return [];
    }
}

function saveSchedules(tasks: ScheduleTask[]) {
    ensureDataDir();
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(tasks, null, 2));
}

export function getSchedules(): ScheduleTask[] {
    return readSchedules();
}

export function addSchedule(task: Omit<ScheduleTask, "id" | "lastRun" | "createdAt">): { success: boolean; message: string } {
    const tasks = readSchedules();

    if (!task.name || !task.action || !task.intervalMinutes) {
        return { success: false, message: "Missing required fields" };
    }

    const newTask: ScheduleTask = {
        ...task,
        id: crypto.randomUUID(),
        lastRun: null,
        createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    saveSchedules(tasks);
    return { success: true, message: `Task "${task.name}" created` };
}

export function deleteSchedule(id: string): { success: boolean; message: string } {
    const tasks = readSchedules();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) {
        return { success: false, message: "Task not found" };
    }
    saveSchedules(filtered);
    return { success: true, message: "Task deleted" };
}

export function toggleSchedule(id: string): { success: boolean; message: string } {
    const tasks = readSchedules();
    const task = tasks.find((t) => t.id === id);
    if (!task) {
        return { success: false, message: "Task not found" };
    }
    task.enabled = !task.enabled;
    saveSchedules(tasks);
    return { success: true, message: `Task ${task.enabled ? "enabled" : "disabled"}` };
}
