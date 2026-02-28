import fs from 'fs';
import path from 'path';
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

import os from "os";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
const MC_DIR = process.env.MC_DIR || (isVercel
    ? path.join(os.tmpdir(), "minecraft")
    : path.join(process.cwd(), "minecraft"));

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, version = "1.21.1", loaders = ["fabric", "forge", "neoforge", "quilt"], type = "mod" } = body;

        if (!projectId) {
            return Response.json({ success: false, message: "Missing project ID" }, { status: 400 });
        }

        // 1. Get the latest compatible version for this project from Modrinth
        // Filter by game version and loaders
        const loadersQuery = JSON.stringify(loaders);
        const versionsUrl = `https://api.modrinth.com/v2/project/${projectId}/version?game_versions=["${version}"]&loaders=${loadersQuery}`;

        const vRes = await fetch(versionsUrl, {
            headers: { "User-Agent": "MCPanel-Dashboard/1.0.0" }
        });

        if (!vRes.ok) throw new Error("Failed to fetch project versions");

        const versionsData = await vRes.json();
        if (!versionsData || versionsData.length === 0) {
            return Response.json({ success: false, message: `No compatible ${version} versions found for the selected loaders.` }, { status: 404 });
        }

        // Modrinth returns versions sorted newest first by default. Grab the primary file of the first one.
        const latestVersion = versionsData[0];
        const primaryFile = latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0];

        if (!primaryFile || !primaryFile.url) {
            return Response.json({ success: false, message: "No download URL found in the latest release." }, { status: 404 });
        }

        // 2. Download the file
        const dlRes = await fetch(primaryFile.url);
        if (!dlRes.ok) throw new Error("Failed to download file");

        const arrayBuffer = await dlRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Save to appropriate directory based on type
        // 'mod' goes to plugins/mods, 'resourcepack' goes to resourcepacks etc.
        // For simplicity, we drop mods/plugins into /plugins to keep things uniform in a bucket, 
        // though standard modded servers use /mods. Let's create the folder if it doesn't exist.
        // If it's a Bukkit plugin it goes to plugins, if Fabric/Forge it goes to mods.
        // Modrinth supports both. We'll check the loaders list to decide the folder.

        let targetFolder = "mods";
        if (loaders.includes("bukkit") || loaders.includes("spigot") || loaders.includes("paper") || loaders.includes("purpur")) {
            targetFolder = "plugins";
        }
        if (type === "resourcepack") targetFolder = "resourcepacks";
        if (type === "shader") targetFolder = "shaderpacks";
        if (type === "datapack") targetFolder = path.join("world", "datapacks"); // Assuming default world name

        const targetDir = path.join(MC_DIR, targetFolder);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const safeFilename = primaryFile.filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const filePath = path.join(targetDir, safeFilename);

        fs.writeFileSync(filePath, buffer);

        return Response.json({
            success: true,
            message: `Successfully installed ${safeFilename} into /${targetFolder}`,
            file: safeFilename
        });

    } catch (e: any) {
        console.error("Modrinth Install Error:", e);
        return Response.json({ success: false, message: e.message || "Installation failed" }, { status: 500 });
    }
}
