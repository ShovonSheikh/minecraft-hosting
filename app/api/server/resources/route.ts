import { getResources } from "@/lib/mc-server";

export const dynamic = "force-dynamic";

export async function GET() {
    const resources = getResources();
    return Response.json({ resources });
}
