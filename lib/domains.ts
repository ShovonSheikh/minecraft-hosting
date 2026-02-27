import fs from "fs";
import path from "path";
import os from "os";

// Try writable data dir, fall back to /tmp for serverless (Vercel)
function getDataDir(): string {
    const primary = path.join(process.cwd(), "data");
    try {
        if (!fs.existsSync(primary)) fs.mkdirSync(primary, { recursive: true });
        // Test if writable
        const testFile = path.join(primary, ".write-test");
        fs.writeFileSync(testFile, "ok");
        fs.unlinkSync(testFile);
        return primary;
    } catch {
        // Fallback to tmp (works on Vercel, but data is ephemeral)
        const fallback = path.join(os.tmpdir(), "mcpanel-data");
        if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
        return fallback;
    }
}

function getDomainsPath(): string {
    return path.join(getDataDir(), "domains.json");
}

export interface DomainConfig {
    serverIp: string;          // Public IP of the machine running the MC server
    serverPort: number;        // MC server port (default 25565)
    customDomain: string;      // e.g. "play.myserver.com"
    dashboardUrl: string;      // e.g. "sweetmc.vercel.app"
    notes: string;             // User notes
}

function ensureFile() {
    const filePath = getDomainsPath();
    if (!fs.existsSync(filePath)) {
        const defaults: DomainConfig = {
            serverIp: "",
            serverPort: 25565,
            customDomain: "",
            dashboardUrl: "",
            notes: "",
        };
        fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2));
    }
}

export function getDomainConfig(): DomainConfig {
    ensureFile();
    return JSON.parse(fs.readFileSync(getDomainsPath(), "utf-8"));
}

export function setDomainConfig(update: Partial<DomainConfig>): { success: boolean; config: DomainConfig } {
    const current = getDomainConfig();
    const merged = { ...current, ...update };
    fs.writeFileSync(getDomainsPath(), JSON.stringify(merged, null, 2));
    return { success: true, config: merged };
}

/**
 * Auto-detect the server's public IP address by querying external services.
 */
export async function getPublicIp(): Promise<string> {
    const services = [
        "https://api.ipify.org",
        "https://ifconfig.me/ip",
        "https://icanhazip.com",
    ];
    for (const url of services) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                const ip = (await res.text()).trim();
                if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return ip;
            }
        } catch { /* try next */ }
    }
    // Fallback: return first non-internal IPv4
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === "IPv4" && !net.internal) return net.address;
        }
    }
    return "127.0.0.1";
}

/**
 * Generate DNS records needed for a custom Minecraft domain.
 * 
 * For Minecraft Java Edition, players can connect via a custom domain 
 * using an SRV record. The setup requires:
 * 1. An A record pointing the domain to the server IP
 * 2. An SRV record so Minecraft clients resolve the correct port
 */
export function generateDnsRecords(config: DomainConfig): {
    records: Array<{ type: string; name: string; value: string; priority?: number; weight?: number; port?: number; ttl: number; description: string }>;
    instructions: string[];
} {
    const domain = config.customDomain.trim();
    const ip = config.serverIp.trim();
    const port = config.serverPort || 25565;

    if (!domain || !ip) {
        return { records: [], instructions: ["Please set both Server IP and Custom Domain first."] };
    }

    // Parse the domain parts
    const parts = domain.split(".");
    const isSubdomain = parts.length > 2;
    const subdomain = isSubdomain ? parts[0] : "@";
    const rootDomain = isSubdomain ? parts.slice(1).join(".") : domain;

    type DnsRecord = { type: string; name: string; value: string; priority?: number; weight?: number; port?: number; ttl: number; description: string };

    const records: DnsRecord[] = [
        {
            type: "A",
            name: subdomain,
            value: ip,
            ttl: 3600,
            description: `Points ${domain} to your server at ${ip}`,
        },
    ];

    // SRV record is needed when using a non-default port OR for proper MC resolution
    records.push({
        type: "SRV",
        name: `_minecraft._tcp.${subdomain === "@" ? rootDomain : subdomain + "." + rootDomain}`,
        value: `0 5 ${port} ${domain}`,
        priority: 0,
        weight: 5,
        port: port,
        ttl: 3600,
        description: `Tells Minecraft clients to connect to ${domain}:${port}`,
    });

    const instructions = [
        `Go to your DNS provider for "${rootDomain}"`,
        `Add an A record: Name = "${subdomain}", Value = "${ip}", TTL = 3600`,
        `Add an SRV record: Service = "_minecraft", Protocol = "_tcp", Name = "${subdomain === "@" ? rootDomain : subdomain}", Priority = 0, Weight = 5, Port = ${port}, Target = "${domain}"`,
        `Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)`,
        `Players can then connect using: ${domain}${port !== 25565 ? `:${port}` : ""}`,
    ];

    return { records, instructions };
}
