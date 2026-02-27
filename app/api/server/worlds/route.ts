import { getWorlds, setProperties, deleteItem } from "@/lib/mc-server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const worlds = getWorlds();
    return Response.json({ worlds });
}

export async function PATCH(request: NextRequest) {
    try {
        const { action, name } = await request.json();
        if (action === "set-default" && name) {
            setProperties({ "level-name": name });
            return Response.json({ success: true, message: `Set ${name} as default world. Restart required.` });
        }
        return Response.json({ success: false, message: "Invalid action" }, { status: 400 });
    } catch {
        return Response.json({ success: false, message: "Server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { name } = await request.json();
        if (!name) return Response.json({ success: false, message: "Missing name" }, { status: 400 });

        const result = deleteItem(name);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Failed to delete world" }, { status: 500 });
    }
}
