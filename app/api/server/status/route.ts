import { getStatus } from "@/lib/mc-server";

export const dynamic = "force-dynamic";

export async function GET() {
    const status = getStatus();
    return Response.json(status);
}
