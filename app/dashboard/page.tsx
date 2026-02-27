"use client";

import { useState, useEffect, useCallback } from "react";

interface Status { running: boolean; pid: number | null; uptime: number | null; players: string[]; playerCount: number; version: string | null; }
interface Resources { memoryUsedMB: number; memoryTotalMB: number; memoryPercent: number; diskUsedMB: number; diskTotalMB: number; diskFreeMB: number; diskPercent: number; cpuPercent: number; serverMemoryMB: number | null; }

function fmt(s: number | null): string {
    if (s === null) return "—";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function fmtMB(mb: number): string {
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

function gaugeClass(p: number): string {
    if (p < 60) return "low";
    if (p < 85) return "mid";
    return "high";
}

export default function DashboardHome() {
    const [status, setStatus] = useState<Status | null>(null);
    const [resources, setResources] = useState<Resources | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [loader, setLoader] = useState<{ type: string; jarFile: string; size: number } | null>(null);
    const [domainConfig, setDomainConfig] = useState<{ serverIp: string; serverPort: number; customDomain: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    const fetchAll = useCallback(async () => {
        try {
            const [sRes, rRes, lRes, ldRes, dRes] = await Promise.all([
                fetch("/api/server/status"), fetch("/api/server/resources"),
                fetch("/api/server/logs?lines=5"), fetch("/api/server/loader"),
                fetch("/api/server/domains"),
            ]);
            setStatus(await sRes.json());
            setResources((await rRes.json()).resources);
            setLogs((await lRes.json()).logs || []);
            setLoader((await ldRes.json()).loader);
            try { const dd = await dRes.json(); setDomainConfig(dd.config); } catch { /* */ }
        } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 4000); return () => clearInterval(i); }, [fetchAll]);

    const doAction = async (a: "start" | "stop" | "restart") => {
        setAction(a);
        try {
            const r = await fetch(`/api/server/${a}`, { method: "POST" });
            showToast((await r.json()).message);
            setTimeout(fetchAll, 1500);
        } catch { showToast("Failed"); }
        finally { setAction(null); }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    const on = status?.running ?? false;

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2 className="page-title">Dashboard</h2>
                        <p className="page-subtitle">Server overview & resource monitoring</p>
                    </div>
                    <div className="btn-row">
                        <button className="btn btn-primary" disabled={on || action !== null} onClick={() => doAction("start")}>
                            {action === "start" ? <span className="spinner" /> : "▶ Start"}
                        </button>
                        <button className="btn btn-danger" disabled={!on || action !== null} onClick={() => doAction("stop")}>
                            {action === "stop" ? <span className="spinner" /> : "⏹ Stop"}
                        </button>
                        <button className="btn btn-outline" disabled={!on || action !== null} onClick={() => doAction("restart")}>
                            {action === "restart" ? <span className="spinner" /> : "↻ Restart"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Status + Info */}
            <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                    <div className="stat-label">Status</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className={`status-dot ${on ? "on" : "off"}`} />
                        <span className="stat-value" style={{ fontSize: 22 }}>{on ? "Online" : "Offline"}</span>
                    </div>
                    <div className="stat-sub">{loader ? `${loader.type} server` : ""}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Players</div>
                    <div className="stat-value">{status?.playerCount ?? 0}</div>
                    <div className="stat-sub">connected</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Uptime</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{fmt(status?.uptime ?? null)}</div>
                    <div className="stat-sub">since start</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Version</div>
                    <div className="stat-value" style={{ fontSize: status?.version ? 18 : 26 }}>{status?.version ?? "—"}</div>
                    <div className="stat-sub">minecraft</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">PID</div>
                    <div className="stat-value" style={{ fontSize: 18, fontWeight: 600 }}>{status?.pid ?? "—"}</div>
                    <div className="stat-sub">process</div>
                </div>
            </div>

            {/* Connection Info */}
            {domainConfig && (
                <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontSize: 22 }}>🎮</span>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Player Address</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: domainConfig.serverIp ? "var(--amber)" : "var(--text-muted)" }}>
                                {domainConfig.serverIp
                                    ? `${domainConfig.customDomain || domainConfig.serverIp}${domainConfig.serverPort !== 25565 ? `:${domainConfig.serverPort}` : ""}`
                                    : "Not configured"}
                            </div>
                        </div>
                    </div>
                    <a href="/dashboard/domains" style={{ color: "var(--amber)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        Manage Domains →
                    </a>
                </div>
            )}
            {/* Resource Gauges */}
            {resources && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Memory</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{fmtMB(resources.memoryUsedMB)} / {fmtMB(resources.memoryTotalMB)}</span>
                        </div>
                        <div className="gauge">
                            <div className="gauge-bar"><div className={`gauge-fill ${gaugeClass(resources.memoryPercent)}`} style={{ width: `${resources.memoryPercent}%` }} /></div>
                            <div className="gauge-label"><span>{resources.memoryPercent}% used</span></div>
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>CPU</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{resources.cpuPercent}%</span>
                        </div>
                        <div className="gauge">
                            <div className="gauge-bar"><div className={`gauge-fill ${gaugeClass(resources.cpuPercent)}`} style={{ width: `${Math.max(3, resources.cpuPercent)}%` }} /></div>
                            <div className="gauge-label"><span>load average</span></div>
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Disk</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                                {resources.diskTotalMB > 0
                                    ? `${fmtMB(resources.diskTotalMB - resources.diskFreeMB)} / ${fmtMB(resources.diskTotalMB)}`
                                    : `MC: ${fmtMB(resources.diskUsedMB)}`}
                            </span>
                        </div>
                        <div className="gauge">
                            <div className="gauge-bar"><div className={`gauge-fill ${gaugeClass(resources.diskPercent || 0)}`} style={{ width: `${Math.max(3, resources.diskPercent || 0)}%` }} /></div>
                            <div className="gauge-label"><span>{resources.diskPercent > 0 ? `${resources.diskPercent}% used` : `MC dir: ${fmtMB(resources.diskUsedMB)}`}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Players */}
            {on && status && status.players.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><span className="card-title">Online Players</span><span className="badge badge-on">{status.playerCount}</span></div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {status.players.map((n) => (
                            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border-subtle)", fontSize: 13, fontWeight: 600 }}>
                                <img src={`https://mc-heads.net/avatar/${n}/22`} alt={n} width={22} height={22} style={{ borderRadius: 4, imageRendering: "pixelated" as const }} />
                                {n}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mini Console */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
                    <span className="card-title" style={{ fontSize: 12 }}>Console Output</span>
                    <a href="/dashboard/console" style={{ color: "var(--amber)", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>Open Full Console →</a>
                </div>
                <div style={{ background: "var(--console-bg)", padding: 14, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.75, color: "var(--text-secondary)", maxHeight: 180, overflow: "hidden" }}>
                    {logs.length === 0 ? <span style={{ color: "var(--text-muted)" }}>No output.</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
            </div>

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
