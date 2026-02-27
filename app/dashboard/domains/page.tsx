"use client";

import { useState, useEffect, useCallback } from "react";

interface DomainConfig {
    serverIp: string;
    serverPort: number;
    customDomain: string;
    dashboardUrl: string;
    notes: string;
}
interface DnsRecord {
    type: string;
    name: string;
    value: string;
    priority?: number;
    weight?: number;
    port?: number;
    ttl: number;
    description: string;
}

export default function DomainsPage() {
    const [config, setConfig] = useState<DomainConfig>({
        serverIp: "", serverPort: 25565, customDomain: "", dashboardUrl: "", notes: "",
    });
    const [orig, setOrig] = useState<DomainConfig | null>(null);
    const [records, setRecords] = useState<DnsRecord[]>([]);
    const [instructions, setInstructions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [detectedIp, setDetectedIp] = useState<string | null>(null);
    const [detecting, setDetecting] = useState(false);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch("/api/server/domains");
            const data = await res.json();
            setConfig(data.config);
            setOrig(data.config);
            setRecords(data.dns?.records || []);
            setInstructions(data.dns?.instructions || []);
            if (data.detectedIp) setDetectedIp(data.detectedIp);
        } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    const detectIp = useCallback(async () => {
        setDetecting(true);
        try {
            const res = await fetch("/api/server/domains?detect=true");
            const data = await res.json();
            if (data.detectedIp) {
                setDetectedIp(data.detectedIp);
                // Also refresh config since detected IP was persisted
                setConfig(data.config);
                setOrig(data.config);
                setRecords(data.dns?.records || []);
                setInstructions(data.dns?.instructions || []);
                msg(`Detected IP: ${data.detectedIp}`);
            } else {
                msg("Could not detect public IP");
            }
        } catch { msg("IP detection failed"); }
        finally { setDetecting(false); }
    }, []);

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

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    const connectionAddress = config.serverIp
        ? `${config.customDomain || config.serverIp}${config.serverPort !== 25565 ? `:${config.serverPort}` : ""}`
        : "Not configured";

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2 className="page-title">Domains & Connection</h2>
                        <p className="page-subtitle">Server address, custom domains & DNS setup</p>
                    </div>
                    <div className="btn-row">
                        <button className="btn btn-outline" onClick={() => { if (orig) setConfig(orig); }} disabled={!hasChanges}>Reset</button>
                        <button className="btn btn-primary" onClick={save} disabled={!hasChanges || saving}>
                            {saving ? <span className="spinner" /> : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Connection Address Hero */}
            <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, var(--bg-card), rgba(248, 184, 78, 0.06))", borderColor: "var(--border-active)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>
                            🎮 Player Connection Address
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: config.serverIp ? "var(--amber)" : "var(--text-muted)", letterSpacing: "-0.02em" }}>
                            {connectionAddress}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                            {config.customDomain
                                ? `Custom domain active · IP: ${config.serverIp}:${config.serverPort}`
                                : config.serverIp
                                    ? "Direct IP connection · Set a custom domain below"
                                    : "Configure your server IP to get started"}
                        </div>
                    </div>
                    {config.serverIp && (
                        <button
                            className="btn btn-outline"
                            onClick={() => copyToClipboard(connectionAddress, "address")}
                            style={{ minWidth: 130 }}
                        >
                            {copied === "address" ? "✓ Copied!" : "📋 Copy Address"}
                        </button>
                    )}
                </div>
            </div>

            {/* Configuration Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 20 }}>

                {/* Server Connection */}
                <div className="card">
                    <div className="card-header"><span className="card-title">🖥 Server Connection</span></div>
                    <div className="field">
                        <label className="field-label">Server IP Address <span className="hint">Public IP of your Minecraft host</span></label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input className="input input-mono" placeholder="e.g. 203.0.113.45" value={config.serverIp}
                                onChange={e => setConfig(c => ({ ...c, serverIp: e.target.value }))}
                                style={{ flex: 1, ...(config.serverIp !== (orig?.serverIp ?? "") ? { borderColor: "var(--amber)", boxShadow: "0 0 0 2px var(--amber-dim)" } : {}) }} />
                            {detectedIp && detectedIp !== "127.0.0.1" ? (
                                <button className="btn btn-outline btn-sm" style={{ whiteSpace: "nowrap", fontSize: 11 }}
                                    onClick={() => setConfig(c => ({ ...c, serverIp: detectedIp }))}>
                                    Use detected: {detectedIp}
                                </button>
                            ) : (
                                <button className="btn btn-outline btn-sm" style={{ whiteSpace: "nowrap", fontSize: 11 }}
                                    onClick={detectIp} disabled={detecting}>
                                    {detecting ? <span className="spinner" /> : "🔍 Detect IP"}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="field">
                        <label className="field-label">Server Port <span className="hint">Default: 25565</span></label>
                        <input className="input input-mono" type="number" value={config.serverPort}
                            onChange={e => setConfig(c => ({ ...c, serverPort: parseInt(e.target.value) || 25565 }))}
                            style={config.serverPort !== (orig?.serverPort ?? 25565) ? { borderColor: "var(--amber)", boxShadow: "0 0 0 2px var(--amber-dim)" } : {}} />
                    </div>
                    <div style={{ padding: "10px 14px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        💡 This is the public IP of the machine running your Minecraft server. It is auto-detected when available — <strong>not</strong> the Vercel/Netlify dashboard URL.
                    </div>
                </div>

                {/* Dashboard URL */}
                <div className="card">
                    <div className="card-header"><span className="card-title">🌐 Dashboard URL</span></div>
                    <div className="field">
                        <label className="field-label">Dashboard URL <span className="hint">Your Vercel/Netlify URL</span></label>
                        <input className="input input-mono" placeholder="e.g. sweetmc.vercel.app" value={config.dashboardUrl}
                            onChange={e => setConfig(c => ({ ...c, dashboardUrl: e.target.value }))} />
                    </div>
                    <div style={{ padding: "10px 14px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        📌 This is where your MCPanel dashboard is hosted — players visit this URL to see server info, but they <strong>connect in-game</strong> using the Server IP or Custom Domain.
                    </div>
                    {config.dashboardUrl && (
                        <div style={{ marginTop: 12 }}>
                            <a href={`https://${config.dashboardUrl}`} target="_blank" rel="noopener noreferrer"
                                style={{ color: "var(--amber)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                                Open Dashboard ↗
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Domain Setup */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><span className="card-title">🔗 Custom Domain for Minecraft</span></div>
                <div className="field">
                    <label className="field-label">Custom Domain <span className="hint">e.g. play.myserver.com</span></label>
                    <input className="input input-mono" placeholder="play.myserver.com" value={config.customDomain}
                        onChange={e => setConfig(c => ({ ...c, customDomain: e.target.value }))}
                        style={config.customDomain !== (orig?.customDomain ?? "") ? { borderColor: "var(--amber)", boxShadow: "0 0 0 2px var(--amber-dim)" } : {}} />
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
                    Instead of giving players your raw IP address, you can use a custom domain like <code style={{ color: "var(--amber)", background: "var(--amber-dim)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>play.myserver.com</code>.
                    Set the domain below, save, and the DNS records you need will be generated automatically.
                </div>
            </div>

            {/* DNS Record Builder */}
            {records.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <span className="card-title">📋 Required DNS Records</span>
                        <span className="badge badge-amber">{records.length} record{records.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Value</th>
                                    <th>TTL</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r, i) => (
                                    <tr key={i}>
                                        <td><span className={`badge ${r.type === "A" ? "badge-on" : "badge-violet"}`}>{r.type}</span></td>
                                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.name}</td>
                                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, maxWidth: 280, wordBreak: "break-all" }}>{r.value}</td>
                                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.ttl}</td>
                                        <td>
                                            <button className="btn btn-outline btn-sm" onClick={() => copyToClipboard(r.value, `rec-${i}`)}>
                                                {copied === `rec-${i}` ? "✓" : "Copy"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Step-by-step instructions */}
                    {instructions.length > 0 && (
                        <div style={{ marginTop: 20, padding: "16px 18px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 12 }}>
                                Setup Instructions
                            </div>
                            <ol style={{ margin: 0, paddingLeft: 20 }}>
                                {instructions.map((inst, i) => (
                                    <li key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 6 }}>
                                        {inst}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}

            {/* Notes */}
            <div className="card">
                <div className="card-header"><span className="card-title">📝 Notes</span></div>
                <textarea className="input" rows={4} placeholder="Any notes about your server setup..."
                    value={config.notes} onChange={e => setConfig(c => ({ ...c, notes: e.target.value }))}
                    style={{ resize: "vertical", fontFamily: "var(--font-body)", fontSize: 13 }} />
            </div>

            {hasChanges && (
                <div className="unsaved-bar">
                    <span>⚠ Unsaved changes</span>
                    <button className="btn btn-outline btn-sm" onClick={() => { if (orig) setConfig(orig); }}>Discard</button>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Save</button>
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
