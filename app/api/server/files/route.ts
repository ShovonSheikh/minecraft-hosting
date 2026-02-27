import { getFiles, readFile, writeFile } from "@/lib/mc-server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get("path") || "";
    const files = getFiles(dirPath);
    return Response.json({ files, path: dirPath });
}

export async function POST(request: Request) {
    try {
        const { path: filePath } = await request.json();
        if (!filePath) {
            return Response.json({ success: false, message: "Missing path" }, { status: 400 });
        }
        const result = readFile(filePath);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const { path: filePath, content } = await request.json();
        if (!filePath || content === undefined) {
            return Response.json({ success: false, message: "Missing path or content" }, { status: 400 });
        }
        const result = writeFile(filePath, content);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}
