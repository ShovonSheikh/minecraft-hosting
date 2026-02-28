import fs from "fs";
import path from "path";

import os from "os";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
const MC_DIR = process.env.MC_DIR || (isVercel
    ? path.join(os.tmpdir(), "minecraft")
    : path.join(process.cwd(), "minecraft"));
const BACKUP_DIR = process.env.BACKUP_DIR || (isVercel
    ? path.join(os.tmpdir(), "backups")
    : path.join(process.cwd(), "backups"));

export interface BackupInfo {
    name: string;
    filename: string;
    size: number;
    createdAt: string;
    type: "manual" | "auto";
}

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

export function listBackups(): BackupInfo[] {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR);
    const backups: BackupInfo[] = [];

    for (const file of files) {
        if (!file.endsWith(".zip") && !file.endsWith(".tar.gz") && !file.endsWith(".bak")) continue;
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        const isAuto = file.startsWith("auto_");
        const name = file.replace(/\.(zip|tar\.gz|bak)$/, "").replace(/^(auto_|manual_)/, "");

        backups.push({
            name,
            filename: file,
            size: stats.size,
            createdAt: stats.mtime.toISOString(),
            type: isAuto ? "auto" : "manual",
        });
    }

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createBackup(label?: string): { success: boolean; message: string; filename?: string } {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupName = `manual_${label || "backup"}_${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    try {
        // Create a simple folder-based backup (copy key files)
        fs.mkdirSync(backupPath, { recursive: true });

        const filesToBackup = [
            "server.properties",
            "whitelist.json",
            "ops.json",
            "banned-players.json",
            "banned-ips.json",
        ];

        for (const file of filesToBackup) {
            const src = path.join(MC_DIR, file);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, path.join(backupPath, file));
            }
        }

        // Copy world folder (just the level.dat and region directory names for now)
        const props = readServerProperties();
        const worldName = props["level-name"] || "world";
        const worldDir = path.join(MC_DIR, worldName);

        if (fs.existsSync(worldDir)) {
            const worldBackup = path.join(backupPath, worldName);
            copyDirRecursive(worldDir, worldBackup);
        }

        return { success: true, message: `Backup created: ${backupName}`, filename: backupName };
    } catch (err) {
        return { success: false, message: `Backup failed: ${(err as Error).message}` };
    }
}

function readServerProperties(): Record<string, string> {
    const propsPath = path.join(MC_DIR, "server.properties");
    if (!fs.existsSync(propsPath)) return {};
    const content = fs.readFileSync(propsPath, "utf-8");
    const props: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const eq = trimmed.indexOf("=");
        props[trimmed.substring(0, eq)] = trimmed.substring(eq + 1);
    }
    return props;
}

function copyDirRecursive(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

export function deleteBackup(filename: string): { success: boolean; message: string } {
    const backupPath = path.join(BACKUP_DIR, filename);
    const resolved = path.resolve(backupPath);
    if (!resolved.startsWith(path.resolve(BACKUP_DIR))) {
        return { success: false, message: "Access denied" };
    }

    if (!fs.existsSync(backupPath)) {
        return { success: false, message: "Backup not found" };
    }

    try {
        const stats = fs.statSync(backupPath);
        if (stats.isDirectory()) {
            fs.rmSync(backupPath, { recursive: true });
        } else {
            fs.unlinkSync(backupPath);
        }
        return { success: true, message: `Backup ${filename} deleted` };
    } catch {
        return { success: false, message: "Failed to delete backup" };
    }
}

export function getBackupDirSize(): number {
    ensureBackupDir();
    return getDirSize(BACKUP_DIR);
}

function getDirSize(dir: string): number {
    let size = 0;
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            size += getDirSize(fullPath);
        } else {
            size += fs.statSync(fullPath).size;
        }
    }
    return size;
}
