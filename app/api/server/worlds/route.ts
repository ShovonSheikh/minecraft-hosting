import { getWorlds } from "@/lib/mc-server";

export const dynamic = "force-dynamic";

export async function GET() {
    const worlds = getWorlds();
    return Response.json({ worlds });
}
