import { sendCommand } from "@/lib/mc-server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { command } = body;

        if (!command || typeof command !== "string") {
            return Response.json(
                { success: false, message: "Missing 'command' in request body" },
                { status: 400 }
            );
        }

        const result = sendCommand(command);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json(
            { success: false, message: "Invalid JSON body" },
            { status: 400 }
        );
    }
}
