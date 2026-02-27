import { restartServer } from "@/lib/mc-server";

export async function POST() {
    const result = await restartServer();
    return Response.json(result, { status: result.success ? 200 : 400 });
}
