import { startServer } from "@/lib/mc-server";

export async function POST() {
    const result = startServer();
    return Response.json(result, { status: result.success ? 200 : 400 });
}
