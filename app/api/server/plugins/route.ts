import { getPlugins, deletePlugin } from "@/lib/mc-server";
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
    const plugins = getPlugins();
    return Response.json({ plugins });
}

export async function POST(request: NextRequest) {
    // Handle file upload
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file || !file.name.endsWith(".jar")) {
            return Response.json(
                { success: false, message: "Please upload a .jar file" },
                { status: 400 }
            );
        }

        const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
        const mcDir = process.env.MC_DIR || (isVercel ? path.join(require('os').tmpdir(), "minecraft") : path.join(process.cwd(), "minecraft"));
        const pluginsDir = path.join(mcDir, "plugins");
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir, { recursive: true });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(pluginsDir, file.name);

        fs.writeFileSync(filePath, buffer);

        return Response.json({
            success: true,
            message: `Plugin ${file.name} installed. Restart server to load.`,
        });
    } catch {
        return Response.json(
            { success: false, message: "Failed to upload plugin" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { filename } = await request.json();
        if (!filename) {
            return Response.json(
                { success: false, message: "Missing filename" },
                { status: 400 }
            );
        }
        const result = deletePlugin(filename);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json(
            { success: false, message: "Invalid request" },
            { status: 400 }
        );
    }
}
