import { togglePlugin } from "@/lib/mc-server";

export async function POST(request: Request) {
    try {
        const { filename } = await request.json();
        if (!filename) {
            return Response.json(
                { success: false, message: "Missing filename" },
                { status: 400 }
            );
        }
        const result = togglePlugin(filename);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json(
            { success: false, message: "Invalid request" },
            { status: 400 }
        );
    }
}
