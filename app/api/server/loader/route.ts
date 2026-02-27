import { getLoaderInfo } from "@/lib/mc-server";

export const dynamic = "force-dynamic";

export async function GET() {
    const loader = getLoaderInfo();
    return Response.json({ loader });
}
