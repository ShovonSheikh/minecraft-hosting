import { spawn, ChildProcess, execSync, exec } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import https from "https";
import yauzl from "yauzl";
import * as tar from "tar";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
const MC_DIR = process.env.MC_DIR || (isVercel
    ? path.join(os.tmpdir(), "minecraft")
    : path.join(process.cwd(), "minecraft"));

const MAX_LOG_LINES = 500;
const JAVA_DIR = path.join(MC_DIR, ".mcpanel", "java");

// State for installation progress since it may take a while
let isInstallingJava = false;

function getJavaExecutablePath(): string | null {
    if (!fs.existsSync(JAVA_DIR)) return null;

    // The downloaded eclipse Temurin usually extracts into a sub-folder like `jdk-17.0.x+y`
    // We need to find the bin/java executable inside it.

    let entries;
    try {
        entries = fs.readdirSync(JAVA_DIR, { withFileTypes: true });
    } catch {
        return null;
    }

    const javaBinName = os.platform() === "win32" ? "java.exe" : "java";

    // Standard search: .mcpanel/java/jdk-*/bin/java
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const potentialPath = path.join(JAVA_DIR, entry.name, "bin", javaBinName);
            if (fs.existsSync(potentialPath)) {
                return potentialPath;
            }

            // macOS sometimes has it inside jdk-*/Contents/Home/bin/java
            const macPath = path.join(JAVA_DIR, entry.name, "Contents", "Home", "bin", javaBinName);
            if (fs.existsSync(macPath)) {
                return macPath;
            }
        }
    }

    // Fallback: what if it's extracted directly to .mcpanel/java/bin/java?
    const directPath = path.join(JAVA_DIR, "bin", javaBinName);
    if (fs.existsSync(directPath)) return directPath;

    return null;
}

function isJavaAvailable(): boolean {
    // 1. Check local .mcpanel Java first
    if (getJavaExecutablePath()) return true;

    // 2. Fallback to system Java
    try {
        execSync("java -version", { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

interface ServerState {
    process: ChildProcess | null;
    logs: string[];
    players: Set<string>;
    startedAt: number | null;
    version: string | null;
}

const state: ServerState = {
    process: null,
    logs: [],
    players: new Set(),
    startedAt: null,
    version: null,
};

function parseLine(line: string) {
    // Player join: [Server thread/INFO]: PlayerName joined the game
    const joinMatch = line.match(
        /\[Server thread\/INFO\]:\s+(\S+) joined the game/
    );
    if (joinMatch) {
        state.players.add(joinMatch[1]);
    }

    // Player leave: [Server thread/INFO]: PlayerName left the game
    const leaveMatch = line.match(
        /\[Server thread\/INFO\]:\s+(\S+) left the game/
    );
    if (leaveMatch) {
        state.players.delete(leaveMatch[1]);
    }

    // Server version: [Server thread/INFO]: Starting minecraft server version X.X.X
    const versionMatch = line.match(
        /Starting minecraft server version\s+(.+)/
    );
    if (versionMatch) {
        state.version = versionMatch[1];
    }
}

function appendLog(data: string) {
    const lines = data.split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
        parseLine(line);
        state.logs.push(line);
        if (state.logs.length > MAX_LOG_LINES) {
            state.logs.shift();
        }
    }
}

export function startServer(): {
    success: boolean;
    message: string;
    pid?: number;
    installing?: boolean;
} {
    if (state.process && !state.process.killed) {
        return { success: false, message: "Server is already running" };
    }

    if (isInstallingJava) {
        return { success: false, installing: true, message: "Java is currently being installed. Please wait..." };
    }

    // Check if Java is installed
    if (!isJavaAvailable()) {
        // Kick off asynchronous Java installation
        installJava().catch(err => {
            console.error("Failed to install Java:", err);
            isInstallingJava = false;
        });

        return {
            success: false,
            installing: true,
            message: "Java not found. Automatically downloading and installing Java 17...",
        };
    }

    // Detect active loader jar
    const { jarFile } = getLoaderInfo();
    const jarPath = path.join(MC_DIR, jarFile);

    if (!fs.existsSync(jarPath)) {
        return { success: false, message: `Executable jar (${jarFile}) not found in minecraft directory` };
    }

    const localJavaPath = getJavaExecutablePath();
    const javaCommand = localJavaPath || "java";

    state.logs = [];
    state.players.clear();
    state.version = null;

    const child = spawn(
        javaCommand,
        ["-Xmx1G", "-Xms1G", "-jar", jarFile, "nogui"],
        {
            cwd: MC_DIR,
            stdio: ["pipe", "pipe", "pipe"],
        }
    );

    state.process = child;
    state.startedAt = Date.now();

    child.stdout?.on("data", (data: Buffer) => {
        appendLog(data.toString());
    });

    child.stderr?.on("data", (data: Buffer) => {
        appendLog(data.toString());
    });

    child.on("exit", (code) => {
        appendLog(`[MCPanel] Server process exited with code ${code} `);
        state.process = null;
        state.startedAt = null;
        state.players.clear();
    });

    child.on("error", (err) => {
        appendLog(`[MCPanel] Process error: ${err.message} `);
        state.process = null;
        state.startedAt = null;
    });

    return {
        success: true,
        message: "Server starting",
        pid: child.pid,
    };
}

export function stopServer(): { success: boolean; message: string } {
    if (!state.process || state.process.killed) {
        return { success: false, message: "Server is not running" };
    }

    sendCommand("stop");
    return { success: true, message: "Stop command sent" };
}

export function killServer(): { success: boolean; message: string } {
    if (!state.process || state.process.killed) {
        return { success: false, message: "Server is not running" };
    }

    state.process.kill("SIGKILL");
    appendLog(`[MCPanel] Process forcefully killed by user.`);
    return { success: true, message: "Server process killed" };
}

export async function restartServer(): Promise<{
    success: boolean;
    message: string;
    pid?: number;
    installing?: boolean;
}> {
    if (state.process && !state.process.killed) {
        sendCommand("stop");

        // Wait for the process to exit (max 15 seconds)
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                // Force kill if it hasn't stopped
                if (state.process && !state.process.killed) {
                    state.process.kill("SIGKILL");
                }
                resolve();
            }, 15000);

            const check = setInterval(() => {
                if (!state.process || state.process.killed) {
                    clearInterval(check);
                    clearTimeout(timeout);
                    resolve();
                }
            }, 500);
        });
    }

    return startServer();
}

export function sendCommand(command: string): {
    success: boolean;
    message: string;
} {
    if (!state.process || state.process.killed) {
        return { success: false, message: "Server is not running" };
    }

    if (!state.process.stdin?.writable) {
        return { success: false, message: "Server stdin is not writable" };
    }

    state.process.stdin.write(command + "\n");
    appendLog(`> ${command} `);
    return { success: true, message: `Command sent: ${command} ` };
}

export function getStatus() {
    const running = !!(state.process && !state.process.killed);
    return {
        running,
        pid: state.process?.pid ?? null,
        uptime: state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : null,
        players: Array.from(state.players),
        playerCount: state.players.size,
        version: state.version,
    };
}

export function getLogs(lines: number = 100): string[] {
    return state.logs.slice(-lines);
}

export function getProperties(): Record<string, string> {
    const propsPath = path.join(MC_DIR, "server.properties");
    if (!fs.existsSync(propsPath)) {
        return {};
    }

    const content = fs.readFileSync(propsPath, "utf-8");
    const props: Record<string, string> = {};

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const eqIndex = trimmed.indexOf("=");
        const key = trimmed.substring(0, eqIndex);
        const value = trimmed.substring(eqIndex + 1);
        props[key] = value;
    }

    return props;
}

export function setProperties(
    updates: Record<string, string>
): { success: boolean; message: string } {
    const propsPath = path.join(MC_DIR, "server.properties");
    if (!fs.existsSync(propsPath)) {
        return { success: false, message: "server.properties not found" };
    }

    let content = fs.readFileSync(propsPath, "utf-8");

    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^ ${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.* $`, "m");
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value} `);
        } else {
            content += `\n${key}=${value} `;
        }
    }

    fs.writeFileSync(propsPath, content, "utf-8");
    return {
        success: true,
        message: "Properties updated. Restart the server for changes to take effect.",
    };
}

// ═══════════════════════════════════════
// PLUGIN MANAGEMENT
// ═══════════════════════════════════════

export interface PluginInfo {
    name: string;
    filename: string;
    enabled: boolean;
    size: number;
}

export function getPlugins(): PluginInfo[] {
    const pluginsDir = path.join(MC_DIR, "plugins");
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        return [];
    }

    const files = fs.readdirSync(pluginsDir);
    const plugins: PluginInfo[] = [];

    for (const file of files) {
        const isJar = file.endsWith(".jar");
        const isDisabled = file.endsWith(".jar.disabled");

        if (!isJar && !isDisabled) continue;

        const filePath = path.join(pluginsDir, file);
        const stats = fs.statSync(filePath);
        const name = file.replace(/\.jar(\.disabled)?$/, "");

        plugins.push({
            name,
            filename: file,
            enabled: isJar && !isDisabled,
            size: stats.size,
        });
    }

    return plugins.sort((a, b) => a.name.localeCompare(b.name));
}

export function togglePlugin(filename: string): { success: boolean; message: string } {
    const pluginsDir = path.join(MC_DIR, "plugins");
    const filePath = path.join(pluginsDir, filename);

    if (!fs.existsSync(filePath)) {
        return { success: false, message: `Plugin ${filename} not found` };
    }

    let newPath: string;
    let action: string;

    if (filename.endsWith(".jar.disabled")) {
        // Enable: remove .disabled
        newPath = path.join(pluginsDir, filename.replace(".jar.disabled", ".jar"));
        action = "enabled";
    } else if (filename.endsWith(".jar")) {
        // Disable: add .disabled
        newPath = path.join(pluginsDir, filename + ".disabled");
        action = "disabled";
    } else {
        return { success: false, message: "Invalid plugin file" };
    }

    fs.renameSync(filePath, newPath);
    return { success: true, message: `Plugin ${action}. Restart server to apply.` };
}

export function deletePlugin(filename: string): { success: boolean; message: string } {
    const pluginsDir = path.join(MC_DIR, "plugins");
    const filePath = path.join(pluginsDir, filename);

    if (!fs.existsSync(filePath)) {
        return { success: false, message: `Plugin ${filename} not found` };
    }

    fs.unlinkSync(filePath);
    return { success: true, message: `Plugin ${filename} deleted.` };
}

// ═══════════════════════════════════════
// FILE MANAGEMENT
// ═══════════════════════════════════════

export interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
}

export function getFiles(relativePath: string = ""): FileItem[] {
    const targetDir = path.join(MC_DIR, relativePath);

    // Security: prevent directory traversal
    const resolved = path.resolve(targetDir);
    if (!resolved.startsWith(path.resolve(MC_DIR))) {
        return [];
    }

    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        return [];
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const items: FileItem[] = [];

    for (const entry of entries) {
        // Skip hidden files and node_modules-like dirs
        if (entry.name.startsWith(".")) continue;

        const fullPath = path.join(targetDir, entry.name);
        const relPath = path.join(relativePath, entry.name).replace(/\\/g, "/");
        const stats = fs.statSync(fullPath);

        items.push({
            name: entry.name,
            path: relPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
        });
    }

    // Directories first, then files
    return items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });
}

export function readFile(relativePath: string): { success: boolean; content?: string; message?: string } {
    const filePath = path.join(MC_DIR, relativePath);

    // Security check
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(MC_DIR))) {
        return { success: false, message: "Access denied" };
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return { success: false, message: "File not found" };
    }

    // Check if it's a binary file (only allow text files)
    const ext = path.extname(filePath).toLowerCase();
    const textExts = [".properties", ".json", ".yml", ".yaml", ".txt", ".log", ".cfg", ".conf", ".toml", ".md", ".csv", ".xml", ".html", ".css", ".js", ".ts", ".sh", ".bat", ".cmd"];
    if (!textExts.includes(ext) && ext !== "") {
        return { success: false, message: "Binary files cannot be edited" };
    }

    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return { success: true, content };
    } catch {
        return { success: false, message: "Failed to read file" };
    }
}

export function writeFile(relativePath: string, content: string): { success: boolean; message: string } {
    const filePath = path.join(MC_DIR, relativePath);

    // Security check
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(MC_DIR))) {
        return { success: false, message: "Access denied" };
    }

    try {
        fs.writeFileSync(filePath, content, "utf-8");
        return { success: true, message: "File saved" };
    } catch {
        return { success: false, message: "Failed to write file" };
    }
}

export function createFolder(relativePath: string): { success: boolean; message: string } {
    const folderPath = path.join(MC_DIR, relativePath);

    // Security check
    const resolved = path.resolve(folderPath);
    if (!resolved.startsWith(path.resolve(MC_DIR))) {
        return { success: false, message: "Access denied" };
    }

    if (fs.existsSync(folderPath)) {
        return { success: false, message: "Folder already exists" };
    }

    try {
        fs.mkdirSync(folderPath, { recursive: true });
        return { success: true, message: "Folder created" };
    } catch {
        return { success: false, message: "Failed to create folder" };
    }
}

export function deleteItem(relativePath: string): { success: boolean; message: string } {
    const itemPath = path.join(MC_DIR, relativePath);

    // Security check
    const resolved = path.resolve(itemPath);
    if (!resolved.startsWith(path.resolve(MC_DIR))) {
        return { success: false, message: "Access denied" };
    }

    if (!fs.existsSync(itemPath)) {
        return { success: false, message: "Item not found" };
    }

    // Prevent deleting the root minecraft dir
    if (resolved === path.resolve(MC_DIR)) {
        return { success: false, message: "Cannot delete root directory" };
    }

    try {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(itemPath);
        }
        return { success: true, message: "Deleted successfully" };
    } catch {
        return { success: false, message: "Failed to delete" };
    }
}

export function renameItem(oldRelPath: string, newRelPath: string): { success: boolean; message: string } {
    const oldPath = path.join(MC_DIR, oldRelPath);
    const newPath = path.join(MC_DIR, newRelPath);

    // Security check
    const resolvedOld = path.resolve(oldPath);
    const resolvedNew = path.resolve(newPath);
    if (!resolvedOld.startsWith(path.resolve(MC_DIR)) || !resolvedNew.startsWith(path.resolve(MC_DIR))) {
        return { success: false, message: "Access denied" };
    }

    if (!fs.existsSync(oldPath)) {
        return { success: false, message: "Item not found" };
    }

    if (fs.existsSync(newPath)) {
        return { success: false, message: "An item with that name already exists" };
    }

    try {
        fs.renameSync(oldPath, newPath);
        return { success: true, message: "Renamed successfully" };
    } catch {
        return { success: false, message: "Failed to rename" };
    }
}

export function copyItem(oldRelPath: string, newRelPath: string): { success: boolean; message: string } {
    const oldPath = path.join(MC_DIR, oldRelPath);
    const newPath = path.join(MC_DIR, newRelPath);

    // Security check
    const resolvedOld = path.resolve(oldPath);
    const resolvedNew = path.resolve(newPath);
    if (!resolvedOld.startsWith(path.resolve(MC_DIR)) || !resolvedNew.startsWith(path.resolve(MC_DIR))) {
        return { success: false, message: "Access denied" };
    }

    if (!fs.existsSync(oldPath)) {
        return { success: false, message: "Item not found" };
    }
    if (fs.existsSync(newPath)) {
        return { success: false, message: "An item with that name already exists" };
    }

    try {
        fs.cpSync(oldPath, newPath, { recursive: true });
        return { success: true, message: "Copied successfully" };
    } catch {
        return { success: false, message: "Failed to copy" };
    }
}

export function saveUploadedFile(relativePath: string, buffer: Buffer): { success: boolean; message: string } {
    const filePath = path.join(MC_DIR, relativePath);

    // Security check
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(MC_DIR))) {
        return { success: false, message: "Access denied" };
    }

    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, buffer);
        return { success: true, message: "File uploaded" };
    } catch {
        return { success: false, message: "Failed to upload file" };
    }
}

// ═══════════════════════════════════════
// LOADER INFO
// ═══════════════════════════════════════

export interface LoaderInfo {
    type: "vanilla" | "paper" | "fabric" | "forge" | "quilt" | "unknown";
    jarFile: string;
    size: number;
}

export function getLoaderInfo(): LoaderInfo {
    // Check for known jar files
    const files = fs.readdirSync(MC_DIR);
    let jarFile = "server.jar";
    let type: LoaderInfo["type"] = "vanilla";

    for (const file of files) {
        const lower = file.toLowerCase();
        if (lower.includes("paper") && lower.endsWith(".jar")) {
            type = "paper";
            jarFile = file;
        } else if (lower.includes("fabric") && lower.endsWith(".jar")) {
            type = "fabric";
            jarFile = file;
        } else if (lower.includes("forge") && lower.endsWith(".jar")) {
            type = "forge";
            jarFile = file;
        } else if (lower.includes("quilt") && lower.endsWith(".jar")) {
            type = "quilt";
            jarFile = file;
        }
    }

    const jarPath = path.join(MC_DIR, jarFile);
    const size = fs.existsSync(jarPath) ? fs.statSync(jarPath).size : 0;

    return { type, jarFile, size };
}

// ═══════════════════════════════════════
// RESOURCE MONITORING
// ═══════════════════════════════════════

export interface ResourceInfo {
    memoryUsedMB: number;
    memoryTotalMB: number;
    memoryPercent: number;
    diskUsedMB: number;
    diskTotalMB: number;
    diskFreeMB: number;
    diskPercent: number;
    cpuPercent: number;
    serverMemoryMB: number | null;
}

export function getResources(): ResourceInfo {
    const os = require("os");
    const { execSync } = require("child_process");
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Disk usage for MC directory
    let diskUsed = 0;
    try {
        diskUsed = getDirSizeRecursive(MC_DIR);
    } catch { /* */ }

    // Get total and free disk space for the drive containing MC_DIR
    let diskTotalMB = 0;
    let diskFreeMB = 0;
    try {
        if (process.platform === "win32") {
            // Windows: use wmic to get disk info
            const drive = path.resolve(MC_DIR).substring(0, 2); // e.g. "C:"
            const out = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get Size, FreeSpace / format: csv`, { encoding: "utf-8" });
            const lines = out.trim().split("\n").filter((l: string) => l.trim() && !l.startsWith("Node"));
            if (lines.length > 0) {
                const parts = lines[lines.length - 1].split(",");
                // CSV: Node,FreeSpace,Size
                const freeSpace = parseInt(parts[1]) || 0;
                const totalSpace = parseInt(parts[2]) || 0;
                diskTotalMB = Math.round(totalSpace / 1024 / 1024);
                diskFreeMB = Math.round(freeSpace / 1024 / 1024);
            }
        } else {
            // Linux/Mac: use df
            const out = execSync(`df - B1 "${MC_DIR}" | tail - 1`, { encoding: "utf-8" });
            const parts = out.trim().split(/\s+/);
            if (parts.length >= 4) {
                diskTotalMB = Math.round(parseInt(parts[1]) / 1024 / 1024);
                diskFreeMB = Math.round(parseInt(parts[3]) / 1024 / 1024);
            }
        }
    } catch { /* fallback: keep 0 */ }

    const diskUsedMB = Math.round(diskUsed / 1024 / 1024);
    const diskPercent = diskTotalMB > 0 ? Math.round(((diskTotalMB - diskFreeMB) / diskTotalMB) * 100) : 0;

    // Estimate CPU from load average (or 0 on Windows)
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const cpuPercent = Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100));

    // Server process memory
    let serverMemMB: number | null = null;
    if (state.process && !state.process.killed && state.process.pid) {
        try {
            const usage = process.memoryUsage();
            serverMemMB = Math.round(usage.heapUsed / 1024 / 1024);
        } catch { /* */ }
    }

    return {
        memoryUsedMB: Math.round(usedMem / 1024 / 1024),
        memoryTotalMB: Math.round(totalMem / 1024 / 1024),
        memoryPercent: Math.round((usedMem / totalMem) * 100),
        diskUsedMB,
        diskTotalMB,
        diskFreeMB,
        diskPercent,
        cpuPercent,
        serverMemoryMB: serverMemMB,
    };
}

function getDirSizeRecursive(dir: string): number {
    let size = 0;
    if (!fs.existsSync(dir)) return 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                size += getDirSizeRecursive(fullPath);
            } else {
                size += fs.statSync(fullPath).size;
            }
        }
    } catch { /* */ }
    return size;
}

// ═══════════════════════════════════════
// WORLD MANAGEMENT
// ═══════════════════════════════════════

export interface WorldInfo {
    name: string;
    path: string;
    size: number;
    isDefault: boolean;
    hasNether: boolean;
    hasEnd: boolean;
}

export function getWorlds(): WorldInfo[] {
    const props = getProperties();
    const defaultWorld = props["level-name"] || "world";
    const worlds: WorldInfo[] = [];

    if (!fs.existsSync(MC_DIR)) return worlds;

    const entries = fs.readdirSync(MC_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Check if it looks like a world directory (contains level.dat)
        const levelDat = path.join(MC_DIR, entry.name, "level.dat");
        if (!fs.existsSync(levelDat)) continue;

        const worldPath = path.join(MC_DIR, entry.name);
        const hasNether = fs.existsSync(path.join(MC_DIR, entry.name + "_nether")) ||
            fs.existsSync(path.join(worldPath, "DIM-1"));
        const hasEnd = fs.existsSync(path.join(MC_DIR, entry.name + "_the_end")) ||
            fs.existsSync(path.join(worldPath, "DIM1"));

        worlds.push({
            name: entry.name,
            path: entry.name,
            size: getDirSizeRecursive(worldPath),
            isDefault: entry.name === defaultWorld,
            hasNether,
            hasEnd,
        });
    }

    return worlds.sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name)));
}

// ═══════════════════════════════════════
// NEW: AUTO INSTALL LOADER
// ═══════════════════════════════════════
export async function installLoader(downloadUrl: string, loaderName: string): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            return { success: false, message: `Failed to download ${loaderName} (HTTP ${response.status})` };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const jarPath = path.join(MC_DIR, "server.jar");

        // Save downloaded jar
        fs.writeFileSync(jarPath, buffer);

        // Update loader info file so the system knows what's running
        const infoFolder = path.join(MC_DIR, ".mcpanel");
        const infoFile = path.join(infoFolder, "loader-info.json");

        if (!fs.existsSync(infoFolder)) {
            fs.mkdirSync(infoFolder, { recursive: true });
        }

        const loaderInfo = {
            id: loaderName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            name: loaderName,
            version: "Latest", // We don't always know exact version from a direct URL request hook
            installedAt: new Date().toISOString()
        };
        fs.writeFileSync(infoFile, JSON.stringify(loaderInfo, null, 2), "utf-8");

        return { success: true, message: `Successfully installed ${loaderName}` };
    } catch (e: any) {
        console.error("Install Loader error:", e);
        return { success: false, message: `Installation error: ${e.message}` };
    }
}

// ═══════════════════════════════════════
// JAVA INSTALLER LOGIC
// ═══════════════════════════════════════

async function installJava(): Promise<void> {
    if (isInstallingJava) return;
    isInstallingJava = true;

    try {
        const platform = os.platform();
        let arch = os.arch();

        // Map Node arch to Adoptium arch
        if (arch === "x64") arch = "x64";
        else if (arch === "arm64") arch = "aarch64";
        else throw new Error(`Unsupported architecture: ${arch}`);

        // Map Node OS to Adoptium OS
        let adoptOs = "";
        if (platform === "win32") adoptOs = "windows";
        else if (platform === "linux") adoptOs = "linux";
        else if (platform === "darwin") adoptOs = "mac";
        else throw new Error(`Unsupported OS: ${platform}`);

        const extension = adoptOs === "windows" ? "zip" : "tar.gz";
        const downloadUrl = `https://api.adoptium.net/v3/binary/latest/17/ga/${adoptOs}/${arch}/jre/hotspot/normal/eclipse`;

        const archivePath = path.join(MC_DIR, ".mcpanel", `java-17.${extension}`);

        if (!fs.existsSync(path.dirname(archivePath))) {
            fs.mkdirSync(path.dirname(archivePath), { recursive: true });
        }

        appendLog(`[MCPanel] Downloading Java 17 for ${adoptOs}-${arch}...`);

        await downloadFile(downloadUrl, archivePath);

        appendLog(`[MCPanel] Extracting Java 17...`);

        // Clean old java dir if exists
        if (fs.existsSync(JAVA_DIR)) {
            fs.rmSync(JAVA_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(JAVA_DIR, { recursive: true });

        if (extension === "zip") {
            await extractZip(archivePath, JAVA_DIR);
        } else {
            await tar.x({ file: archivePath, cwd: JAVA_DIR });
        }

        appendLog(`[MCPanel] Java 17 installed successfully to local environment.`);

        // Clean up archive
        if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
        }

        // Now that Java is installed, actually start the server
        appendLog(`[MCPanel] Automatically starting server with new Java 17 runtime...`);
        startServer();

    } catch (error: any) {
        appendLog(`[MCPanel] Failed to install Java automatically: ${error.message}`);
        console.error("Java auto-install failed:", error);
    } finally {
        isInstallingJava = false;
    }
}

function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);

        const request = https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });
        });

        request.on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });

        file.on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

function extractZip(sourceZip: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        yauzl.open(sourceZip, { lazyEntries: true }, (err, zipfile) => {
            if (err) return reject(err);
            if (!zipfile) return reject(new Error("Failed to open zipfile"));

            zipfile.readEntry();
            zipfile.on("entry", (entry) => {
                const fullPath = path.join(destDir, entry.fileName);

                // Security check to prevent zip slip
                if (!path.resolve(fullPath).startsWith(path.resolve(destDir))) {
                    console.warn(`Skipping malicious zip entry: ${entry.fileName}`);
                    zipfile.readEntry();
                    return;
                }

                if (/\/$/.test(entry.fileName)) {
                    // Directory file names end with '/'
                    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
                    zipfile.readEntry();
                } else {
                    // File entry
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) return reject(err);
                        if (!readStream) return reject(new Error("Failed to get readStream"));

                        const writeStream = fs.createWriteStream(fullPath);
                        readStream.pipe(writeStream);

                        writeStream.on("close", () => {
                            zipfile.readEntry();
                        });
                    });
                }
            });

            zipfile.on("end", resolve);
            zipfile.on("error", reject);
        });
    });
}
