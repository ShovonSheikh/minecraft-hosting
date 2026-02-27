import { getFiles, readFile, writeFile, createFolder, deleteItem, renameItem, saveUploadedFile, copyItem } from "@/lib/mc-server";
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
        const contentType = request.headers.get("content-type") || "";

        // Handle file upload (multipart/form-data)
        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file") as File | null;
            const uploadPath = (formData.get("path") as string) || "";

            if (!file) {
                return Response.json({ success: false, message: "No file provided" }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const filePath = uploadPath ? `${uploadPath}/${file.name}` : file.name;
            const result = saveUploadedFile(filePath, buffer);
            return Response.json(result, { status: result.success ? 200 : 400 });
        }

        // Handle JSON requests (read file or create folder)
        const body = await request.json();

        // Create folder
        if (body.action === "mkdir" && body.path) {
            const result = createFolder(body.path);
            return Response.json(result, { status: result.success ? 200 : 400 });
        }

        // Copy item
        if (body.action === "copy" && body.oldPath && body.newPath) {
            const result = copyItem(body.oldPath, body.newPath);
            return Response.json(result, { status: result.success ? 200 : 400 });
        }

        // Read file (existing behavior)
        if (!body.path) {
            return Response.json({ success: false, message: "Missing path" }, { status: 400 });
        }
        const result = readFile(body.path);
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

export async function DELETE(request: Request) {
    try {
        const { path: itemPath } = await request.json();
        if (!itemPath) {
            return Response.json({ success: false, message: "Missing path" }, { status: 400 });
        }
        const result = deleteItem(itemPath);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { oldPath, newPath } = await request.json();
        if (!oldPath || !newPath) {
            return Response.json({ success: false, message: "Missing oldPath or newPath" }, { status: 400 });
        }
        const result = renameItem(oldPath, newPath);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}
