import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";

    // Convert generic categories to Modrinth facets
    // Modrinth Project Types: mod, modpack, resourcepack, shader
    const type = searchParams.get("type") || "mod";

    // Support multiple loaders like Lunar, e.g. 'fabric,forge,neoforge'
    const loaders = searchParams.get("loaders") || "fabric,forge,neoforge,quilt";
    const version = searchParams.get("version") || "1.21.1";

    const facets = [
        [`project_type:${type}`],
        loaders.split(',').filter(Boolean).map(l => `categories:${l}`),
        [`versions:${version}`]
    ];

    try {
        const url = new URL("https://api.modrinth.com/v2/search");
        url.searchParams.append("query", query);
        url.searchParams.append("limit", limit);
        url.searchParams.append("offset", offset);
        url.searchParams.append("facets", JSON.stringify(facets));
        url.searchParams.append("index", "relevance"); // or downloads, newest, etc

        const res = await fetch(url.toString(), {
            headers: { "User-Agent": "MCPanel-Dashboard/1.0.0" },
            cache: 'no-store'
        });

        if (!res.ok) throw new Error("Modrinth API error");

        const data = await res.json();
        return Response.json({ success: true, data });
    } catch (e: any) {
        return Response.json({ success: false, message: e.message || "Failed to search Modrinth" }, { status: 500 });
    }
}
