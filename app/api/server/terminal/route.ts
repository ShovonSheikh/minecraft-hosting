import { NextRequest } from "next/server";
import { exec } from "child_process";
import util from "util";
import path from "path";
import os from "os";

const execPromise = util.promisify(exec);
export const dynamic = "force-dynamic";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
const MC_DIR = process.env.MC_DIR || (isVercel
    ? path.join(os.tmpdir(), "minecraft")
    : path.join(process.cwd(), "minecraft"));

export async function POST(request: NextRequest) {
    try {
        const { command } = await request.json();

        if (!command || typeof command !== "string") {
            return Response.json({ success: false, message: "Invalid command" });
        }

        const shell = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
        // Execute command in the context of the MC directory
        const { stdout, stderr } = await execPromise(command, {
            cwd: MC_DIR,
            timeout: 10000, // 10s timeout to prevent hanging
            shell: shell
        });

        return Response.json({
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim()
        });

    } catch (error: any) {
        // execPromise throws if exit code is not 0
        return Response.json({
            success: false,
            stderr: error.stderr || error.message || "Unknown error executing command"
        });
    }
}
