import { stopServer } from "@/lib/mc-server";

export async function POST() {
    const result = stopServer();
    return Response.json(result, { status: result.success ? 200 : 400 });
}
