import { killServer } from "@/lib/mc-server";

export const dynamic = "force-dynamic";

export async function POST() {
    const result = killServer();
    return Response.json(result);
}
