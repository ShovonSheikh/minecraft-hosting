import { NextRequest } from "next/server";
import { installLoader } from "@/lib/mc-server";

export const dynamic = "force-dynamic";

// Hardcoded latest URLs for MVP auto-installer. 
// A production system would use Mojang/Paper API to find the exact latest build URL.
const LOADER_URLS: Record<string, string> = {
    "vanilla": "https://piston-data.mojang.com/v1/objects/450698d1863ab5180c25d7c804ef0fe6369dd1ba/server.jar", // 1.21.1
    "paper": "https://api.papermc.io/v2/projects/paper/versions/1.21.1/builds/131/downloads/paper-1.21.1-131.jar",
    "fabric": "https://meta.fabricmc.net/v2/versions/loader/1.21.1/0.16.5/1.0.1/server/jar",
    "forge": "https://maven.minecraftforge.net/net/minecraftforge/forge/1.21.1-53.0.0/forge-1.21.1-53.0.0-installer.jar", // Note: Forge usually requires a complex installer rather than direct execution
    "neoforge": "https://maven.neoforged.net/releases/net/neoforged/neoforge/21.1.61/neoforge-21.1.61-installer.jar",
    "quilt": "https://meta.quiltmc.org/v3/versions/loader/1.21.1/0.26.2/server/jar",
    "purpur": "https://api.purpurmc.org/v2/purpur/1.21.1/latest/download",
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const loaderId = body.loaderId?.toLowerCase();

        if (!loaderId || !LOADER_URLS[loaderId]) {
            return Response.json({ success: false, message: "Invalid or unsupported loader selected." }, { status: 400 });
        }

        const url = LOADER_URLS[loaderId];
        const result = await installLoader(url, body.loaderName || loaderId);

        return Response.json(result, { status: result.success ? 200 : 500 });
    } catch (e: any) {
        return Response.json({ success: false, message: e.message || "Internal server error" }, { status: 500 });
    }
}
