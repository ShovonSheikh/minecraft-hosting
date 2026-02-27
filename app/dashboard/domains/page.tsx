"use client";

import { useState, useEffect, useCallback } from "react";

interface DomainConfig {
    serverIp: string;
    serverPort: number;
    dashboardUrl: string;
    customDomain: string;
    notes: string;
}

interface DNSRecord {
    type: string;
    name: string;
    value: string;
    ttl: string;
}

export default function DomainsPage() {
    const [config, setConfig] = useState<DomainConfig>({
        serverIp: "", serverPort: 25565, dashboardUrl: "", customDomain: "", notes: ""
    });
    const [orig, setOrig] = useState<DomainConfig | null>(null);
    const [records, setRecords] = useState<DNSRecord[]>([]);
    const [instructions, setInstructions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [detectedIp, setDetectedIp] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch("/api/server/domains");
            const data = await res.json();
            if (data.config) {
                setConfig({ ...data.config, notes: data.config.notes || "" });
                setOrig({ ...data.config, notes: data.config.notes || "" });
                if (data.dns) {
                    setRecords(data.dns.records || []);
                    setInstructions(data.dns.instructions || []);
                }
            }
        } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    const detectIp = async () => {
        setDetecting(true);
        try {
            const res = await fetch("https://api.ipify.org?format=json");
            const data = await res.json();
            if (data.ip) setDetectedIp(data.ip);
        } catch { msg("Failed to detect IP"); }
        finally { setDetecting(false); }
    };

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/server/domains", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (data.success) {
                setOrig(data.config);
                setRecords(data.dns?.records || []);
                setInstructions(data.dns?.instructions || []);
                msg("Domain configuration saved!");
            } else { msg(data.message || "Failed to save"); }
        } catch { msg("Save failed"); }
        finally { setSaving(false); }
    };

    const hasChanges = orig ? JSON.stringify(config) !== JSON.stringify(orig) : false;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#F8B84E]"></i></div>;

    const connectionAddress = config.serverIp
        ? `${config.customDomain || config.serverIp}${config.serverPort !== 25565 ? `:${config.serverPort}` : ""}`
        : "Not configured";

    return (
        <div id="page-domains" className="page-section max-w-7xl mx-auto space-y-6 block p-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#FFFFFF]">Domains & Connection</h2>
                    <p className="text-sm text-[#828D9F]">Server address, custom domains & DNS setup</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        className="px-4 py-2 bg-[#1A1D24] text-[#B9C1D1] hover:text-[#FFFFFF] rounded-lg text-sm font-medium transition-colors border border-[#333947] disabled:opacity-50"
                        onClick={() => { if (orig) setConfig(orig); }}
                        disabled={!hasChanges}
                    >
                        Reset
                    </button>
                    <button
                        className="px-4 py-2 bg-[#F8B84E] hover:bg-[#E09030] text-[#090A0C] rounded-lg text-sm font-bold transition-colors shadow-lg shadow-[#F8B84E]/20 flex items-center gap-2 disabled:opacity-50 disabled:bg-[#1A1D24] disabled:text-[#828D9F] disabled:shadow-none"
                        onClick={save}
                        disabled={!hasChanges || saving}
                    >
                        {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* Connection Address Hero */}
            <div className="bg-[#1A1D24] border border-[#F8B84E]/30 rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#F8B84E]/10 to-transparent rounded-bl-full -z-0 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-[#F8B84E] uppercase tracking-wider mb-2">
                            <i className="fa-solid fa-gamepad"></i> Player Connection Address
                        </div>
                        <div className={`font-mono text-3xl font-bold tracking-tight mb-2 ${config.serverIp ? "text-[#FFFFFF]" : "text-[#828D9F]"}`}>
                            {connectionAddress}
                        </div>
                        <div className="text-sm text-[#828D9F]">
                            {config.customDomain
                                ? `Custom domain active • IP: ${config.serverIp}:${config.serverPort}`
                                : config.serverIp
                                    ? "Direct IP connection • Set a custom domain below"
                                    : "Configure your server IP to get started"}
                        </div>
                    </div>
                    {config.serverIp && (
                        <button
                            className="shrink-0 px-4 py-2.5 bg-[#090A0C] border border-[#333947] hover:border-[#F8B84E] text-[#FFFFFF] rounded-lg text-sm font-medium transition-all shadow-lg flex items-center justify-center gap-2 group-hover:shadow-[#F8B84E]/10"
                            onClick={() => copyToClipboard(connectionAddress, "address")}
                        >
                            <i className={`fa-solid ${copied === "address" ? "fa-check text-[#10B981]" : "fa-copy text-[#828D9F]"}`}></i>
                            {copied === "address" ? "Copied!" : "Copy Address"}
                        </button>
                    )}
                </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Server Connection */}
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-[#333947] bg-[#090A0C]/50 flex items-center gap-2">
                        <i className="fa-solid fa-server text-[#828D9F]"></i>
                        <h3 className="font-semibold text-[#FFFFFF] text-sm">Server Connection</h3>
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-5">
                        <div>
                            <label className="flex items-center justify-between text-xs font-medium text-[#828D9F] mb-1.5">
                                <span>Server IP Address</span>
                                <span>Public IP of your Minecraft host</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-[#090A0C] border border-[#333947] focus:border-[#F8B84E] focus:ring-1 focus:ring-[#F8B84E] rounded-md px-3 py-2 text-[#FFFFFF] font-mono text-sm placeholder-[#828D9F]/50 transition-all outline-none"
                                    placeholder="e.g. 203.0.113.45"
                                    value={config.serverIp}
                                    onChange={e => setConfig(c => ({ ...c, serverIp: e.target.value }))}
                                />
                                {detectedIp && detectedIp !== "127.0.0.1" ? (
                                    <button
                                        className="shrink-0 px-3 py-2 bg-[#4299E1]/10 text-[#4299E1] hover:bg-[#4299E1]/20 rounded-md text-xs font-medium transition-colors border border-[#4299E1]/20 whitespace-nowrap"
                                        onClick={() => setConfig(c => ({ ...c, serverIp: detectedIp }))}
                                    >
                                        Use: {detectedIp}
                                    </button>
                                ) : (
                                    <button
                                        className="shrink-0 px-3 py-2 bg-[#333947] hover:bg-[#828D9F] text-[#FFFFFF] rounded-md text-xs font-medium transition-colors border border-[#828D9F]/30 whitespace-nowrap flex items-center gap-2"
                                        onClick={detectIp}
                                        disabled={detecting}
                                    >
                                        {detecting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>} Detect IP
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center justify-between text-xs font-medium text-[#828D9F] mb-1.5">
                                <span>Server Port</span>
                                <span>Default: 25565</span>
                            </label>
                            <input
                                className="w-full bg-[#090A0C] border border-[#333947] focus:border-[#F8B84E] focus:ring-1 focus:ring-[#F8B84E] rounded-md px-3 py-2 text-[#FFFFFF] font-mono text-sm transition-all outline-none"
                                type="number"
                                value={config.serverPort}
                                onChange={e => setConfig(c => ({ ...c, serverPort: parseInt(e.target.value) || 25565 }))}
                            />
                        </div>
                        <div className="mt-auto bg-[#F8B84E]/10 border border-[#F8B84E]/20 rounded-lg p-3 flex gap-3 text-xs text-[#F8B84E]/90 leading-relaxed">
                            <i className="fa-solid fa-lightbulb mt-0.5"></i>
                            <div>This is the public IP of the machine running your Minecraft server. It is auto-detected when available — <strong>not</strong> the Vercel/Netlify dashboard URL.</div>
                        </div>
                    </div>
                </div>

                {/* Dashboard URL */}
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-[#333947] bg-[#090A0C]/50 flex items-center gap-2">
                        <i className="fa-solid fa-globe text-[#4299E1]"></i>
                        <h3 className="font-semibold text-[#FFFFFF] text-sm">Dashboard URL</h3>
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-5">
                        <div>
                            <label className="flex items-center justify-between text-xs font-medium text-[#828D9F] mb-1.5">
                                <span>Dashboard URL</span>
                                <span>Your Vercel/Netlify URL</span>
                            </label>
                            <input
                                className="w-full bg-[#090A0C] border border-[#333947] focus:border-[#4299E1] focus:ring-1 focus:ring-[#4299E1] rounded-md px-3 py-2 text-[#FFFFFF] font-mono text-sm placeholder-[#828D9F]/50 transition-all outline-none"
                                placeholder="e.g. sweetmc.vercel.app"
                                value={config.dashboardUrl}
                                onChange={e => setConfig(c => ({ ...c, dashboardUrl: e.target.value }))}
                            />
                        </div>
                        <div className="mt-auto bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-lg p-3 flex gap-3 text-xs text-[#FF6B6B]/90 leading-relaxed">
                            <i className="fa-solid fa-thumbtack mt-0.5 rotate-45"></i>
                            <div>This is where your MCPanel dashboard is hosted — players visit this URL to see server info, but they <strong>connect in-game</strong> using the Server IP or Custom Domain.</div>
                        </div>
                        {config.dashboardUrl && (
                            <a
                                href={`https://${config.dashboardUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-[#4299E1] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 self-start"
                            >
                                Open Dashboard <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Domain Setup */}
            <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-link text-[#B9C1D1]"></i>
                    <h3 className="font-semibold text-[#FFFFFF] text-base">Custom Domain for Minecraft</h3>
                </div>

                <div className="mb-6 max-w-2xl">
                    <label className="flex items-center justify-between text-xs font-medium text-[#828D9F] mb-1.5">
                        <span>Custom Domain</span>
                        <span>e.g. play.myserver.com</span>
                    </label>
                    <input
                        className="w-full bg-[#090A0C] border border-[#333947] focus:border-[#F8B84E] focus:ring-1 focus:ring-[#F8B84E] rounded-md px-4 py-3 text-[#FFFFFF] font-mono text-sm transition-all outline-none"
                        placeholder="play.myserver.com"
                        value={config.customDomain}
                        onChange={e => setConfig(c => ({ ...c, customDomain: e.target.value }))}
                    />
                </div>

                <p className="text-sm text-[#828D9F] leading-relaxed max-w-3xl">
                    Instead of giving players your raw IP address, you can use a custom domain like <code className="text-[#F8B84E] bg-[#F8B84E]/10 px-1.5 py-0.5 rounded text-xs font-mono ml-0.5 mr-0.5">play.myserver.com</code>.
                    Set the domain above, save, and the DNS records you need will be generated automatically.
                </p>
            </div>

            {/* DNS Record Builder */}
            {records.length > 0 && (
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl overflow-hidden shadow-lg shadow-[#090A0C]/50">
                    <div className="px-5 py-4 border-b border-[#333947] flex items-center justify-between bg-[#090A0C]/50">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-list-check text-[#10B981]"></i>
                            <h3 className="font-semibold text-[#FFFFFF] text-sm">Required DNS Records</h3>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 bg-[#10B981]/20 text-[#10B981] rounded border border-[#10B981]/30">
                            {records.length} record{records.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-[#1A1D24] border-b border-[#333947] text-[#828D9F] text-xs uppercase tracking-wider">
                                    <th className="px-5 py-3 font-medium">Type</th>
                                    <th className="px-5 py-3 font-medium">Name</th>
                                    <th className="px-5 py-3 font-medium">Value</th>
                                    <th className="px-5 py-3 font-medium">TTL</th>
                                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333947]/50 text-sm text-[#B9C1D1]">
                                {records.map((r, i) => (
                                    <tr key={i} className="hover:bg-[#090A0C]/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${r.type === "A" ? "bg-[#4299E1]/20 text-[#4299E1] border border-[#4299E1]/30" : "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30"}`}>
                                                {r.type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-mono text-[13px]">{r.name}</td>
                                        <td className="px-5 py-4 font-mono text-[13px] max-w-xs truncate" title={r.value}>{r.value}</td>
                                        <td className="px-5 py-4 font-mono text-[13px] text-[#828D9F]">{r.ttl}</td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                className="px-3 py-1.5 bg-[#090A0C] hover:bg-[#333947] text-[#B9C1D1] hover:text-[#FFFFFF] rounded text-xs font-medium transition-colors border border-[#333947]"
                                                onClick={() => copyToClipboard(r.value, `rec-${i}`)}
                                            >
                                                {copied === `rec-${i}` ? <span className="text-[#10B981]"><i className="fa-solid fa-check"></i> Copied</span> : "Copy Value"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Step-by-step instructions */}
                    {instructions.length > 0 && (
                        <div className="p-5 md:p-6 bg-[#090A0C]/50 border-t border-[#333947]">
                            <div className="flex items-center gap-2 mb-4">
                                <i className="fa-solid fa-book text-[#828D9F]"></i>
                                <h4 className="text-sm font-semibold text-[#FFFFFF] uppercase tracking-wider">Setup Instructions</h4>
                            </div>
                            <ol className="list-decimal list-outside ml-5 space-y-2 text-sm text-[#828D9F]">
                                {instructions.map((inst, i) => (
                                    <li key={i} className="pl-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: inst.replace(/`(.*?)`/g, '<code class="text-[#F8B84E] bg-[#F8B84E]/10 px-1 py-0.5 rounded font-mono text-[12px] mx-0.5">$1</code>') }}></li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}

            {/* Notes */}
            <div className="bg-[#1A1D24] border border-[#333947] rounded-xl flex flex-col mt-6">
                <div className="px-5 py-3 border-b border-[#333947] bg-[#090A0C]/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-clipboard text-[#828D9F]"></i>
                        <h3 className="font-semibold text-[#FFFFFF] text-sm">Notes</h3>
                    </div>
                </div>
                <textarea
                    className="w-full bg-transparent border-none focus:ring-0 p-5 text-sm text-[#B9C1D1] placeholder-[#828D9F]/50 outline-none resize-y min-h-[100px]"
                    rows={4}
                    placeholder="Any notes about your server setup..."
                    value={config.notes}
                    onChange={e => setConfig(c => ({ ...c, notes: e.target.value }))}
                />
            </div>

            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#090A0C] border border-[#F8B84E] shadow-2xl shadow-[#F8B84E]/10 text-[#FFFFFF] px-6 py-4 rounded-xl flex items-center justify-between gap-6 animate-fade-in z-50 w-[90%] max-w-md">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-triangle-exclamation text-[#F8B84E]"></i>
                        <span className="text-sm font-medium">Unsaved changes</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 text-xs font-medium text-[#828D9F] hover:text-[#FFFFFF] transition-colors"
                            onClick={() => { if (orig) setConfig(orig); }}
                        >
                            Discard
                        </button>
                        <button
                            className="px-4 py-1.5 bg-[#F8B84E] hover:bg-[#E09030] text-[#090A0C] rounded text-xs font-bold transition-colors disabled:opacity-50"
                            onClick={save}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1D24] border border-[#333947] shadow-xl text-[#FFFFFF] px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in z-50">
                    <i className="fa-solid fa-bell text-[#F8B84E]"></i>
                    <span className="text-sm font-medium">{toast}</span>
                </div>
            )}
        </div>
    );
}
