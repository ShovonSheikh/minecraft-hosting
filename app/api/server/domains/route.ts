import { getDomainConfig, setDomainConfig, generateDnsRecords } from "@/lib/domains";

export const dynamic = "force-dynamic";

export async function GET() {
    const config = getDomainConfig();
    const dns = generateDnsRecords(config);
    return Response.json({ config, dns });
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const result = setDomainConfig(body);
        const dns = generateDnsRecords(result.config);
        return Response.json({ ...result, dns });
    } catch {
        return Response.json({ success: false, message: "Invalid JSON" }, { status: 400 });
    }
}
