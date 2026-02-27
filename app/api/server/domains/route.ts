import { getDomainConfig, setDomainConfig, generateDnsRecords, getPublicIp } from "@/lib/domains";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const config = getDomainConfig();
        const publicIp = await getPublicIp();
        // If serverIp is empty, auto-populate with detected IP
        if (!config.serverIp && publicIp !== "127.0.0.1") {
            config.serverIp = publicIp;
        }
        const dns = generateDnsRecords(config);
        return Response.json({ config, dns, detectedIp: publicIp });
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

