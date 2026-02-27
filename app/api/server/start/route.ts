import { startServer } from "@/lib/mc-server";

export async function POST() {
    const result = startServer();
    const status = result.success ? 200 : (result.installing ? 202 : 400);
    return Response.json(result, { status });
}
