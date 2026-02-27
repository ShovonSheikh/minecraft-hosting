import { getLogs } from "@/lib/mc-server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lines = parseInt(searchParams.get("lines") || "100", 10);
    const logs = getLogs(Math.min(lines, MAX_LOG_LINES));
    return Response.json({ logs });
}

const MAX_LOG_LINES = 500;
