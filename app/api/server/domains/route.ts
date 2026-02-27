import { getDomainConfig, setDomainConfig, generateDnsRecords, getPublicIp } from "@/lib/domains";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const config = getDomainConfig();
        const detect = request.nextUrl.searchParams.get("detect") === "true";

        let detectedIp: string | null = null;

        if (detect) {
            // Only auto-detect IP when explicitly requested by the user
            detectedIp = await getPublicIp();
            if (detectedIp && detectedIp !== "127.0.0.1") {
                config.serverIp = detectedIp;
                // Persist the detected IP so it doesn't change on next request
                setDomainConfig({ serverIp: detectedIp });
            }
        }

        const dns = generateDnsRecords(config);
        return Response.json({ config, dns, ...(detectedIp ? { detectedIp } : {}) });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to read domain config";
        return Response.json({ success: false, message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }
    try {
        const result = setDomainConfig(body);
        const dns = generateDnsRecords(result.config);
        return Response.json({ ...result, dns });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save domain config";
        return Response.json({ success: false, message }, { status: 500 });
    }
}

