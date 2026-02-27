import { listBackups, createBackup, deleteBackup, getBackupDirSize } from "@/lib/backups";

export const dynamic = "force-dynamic";

export async function GET() {
    const backups = listBackups();
    const totalSize = getBackupDirSize();
    return Response.json({ backups, totalSize });
}

export async function POST(request: Request) {
    try {
        const { label } = await request.json().catch(() => ({ label: undefined }));
        const result = createBackup(label);
        return Response.json(result, { status: result.success ? 200 : 500 });
    } catch {
        return Response.json({ success: false, message: "Backup failed" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { filename } = await request.json();
        if (!filename) return Response.json({ success: false, message: "Missing filename" }, { status: 400 });
        const result = deleteBackup(filename);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}
