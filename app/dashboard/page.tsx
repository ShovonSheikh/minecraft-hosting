"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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

function statusBadge(p: number): { label: string; cls: string } {
    if (p < 50) return { label: "Normal", cls: "badge-on" };
    if (p < 80) return { label: "High", cls: "badge-amber" };
    return { label: "Critical", cls: "badge-danger" };
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
                fetch("/api/server/logs?lines=8"), fetch("/api/server/loader"),
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
    const connectionAddress = domainConfig?.serverIp
        ? `${domainConfig.customDomain || domainConfig.serverIp}${domainConfig.serverPort !== 25565 ? `:${domainConfig.serverPort}` : ""}`
        : null;

    return (
        <>
            {/* ── Power Controls Card ── */}
            <div className="power-card">
                <div className="power-card-info">
                    <h2 className="power-card-title">Power Controls</h2>
                    <p className="power-card-subtitle">
                        {on ? `Server online · ${status?.playerCount ?? 0} player${(status?.playerCount ?? 0) !== 1 ? "s" : ""}` : "Server is currently offline"}
                        {loader ? ` · ${loader.type}` : ""}
                    </p>
                </div>
                <div className="power-card-buttons">
                    <button className="power-btn power-btn-start" disabled={on || action !== null} onClick={() => doAction("start")}>
                        {action === "start" ? <span className="spinner" /> : <>▶ Start</>}
                    </button>
                    <button className="power-btn power-btn-restart" disabled={!on || action !== null} onClick={() => doAction("restart")}>
                        {action === "restart" ? <span className="spinner" /> : <>↻ Restart</>}
                    </button>
                    <button className="power-btn power-btn-stop" disabled={!on || action !== null} onClick={() => doAction("stop")}>
                        {action === "stop" ? <span className="spinner" /> : <>⏻ Stop</>}
                    </button>
                </div>
            </div>

            {/* ── Resource Metrics Grid ── */}
            {resources && (
                <div className="metrics-grid">
                    {/* CPU */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-icon-label">
                                <span className="metric-icon">⚡</span>
                                <span className="metric-label">CPU Usage</span>
                            </div>
                            <span className={`badge ${statusBadge(resources.cpuPercent).cls}`}>
                                {statusBadge(resources.cpuPercent).label}
                            </span>
                        </div>
                        <div className="metric-value-row">
                            <span className="metric-value">{resources.cpuPercent}</span>
                            <span className="metric-unit">%</span>
                        </div>
                        <div className="metric-bar">
                            <div className="metric-bar-fill metric-bar-sky" style={{ width: `${Math.max(2, resources.cpuPercent)}%` }} />
                        </div>
                    </div>

                    {/* Memory */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-icon-label">
                                <span className="metric-icon">🧠</span>
                                <span className="metric-label">Memory</span>
                            </div>
                            <span className={`badge ${statusBadge(resources.memoryPercent).cls}`}>
                                {statusBadge(resources.memoryPercent).label}
                            </span>
                        </div>
                        <div className="metric-value-row">
                            <span className="metric-value">{(resources.memoryUsedMB / 1024).toFixed(1)}</span>
                            <span className="metric-unit">/ {(resources.memoryTotalMB / 1024).toFixed(1)} GB</span>
                        </div>
                        <div className="metric-bar">
                            <div className="metric-bar-fill metric-bar-amber" style={{ width: `${Math.max(2, resources.memoryPercent)}%` }} />
                        </div>
                    </div>

                    {/* Disk */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-icon-label">
                                <span className="metric-icon">💾</span>
                                <span className="metric-label">Storage</span>
                            </div>
                        </div>
                        <div className="metric-value-row">
                            {resources.diskTotalMB > 0 ? (
                                <>
                                    <span className="metric-value">{((resources.diskTotalMB - resources.diskFreeMB) / 1024).toFixed(1)}</span>
                                    <span className="metric-unit">/ {(resources.diskTotalMB / 1024).toFixed(1)} GB</span>
                                </>
                            ) : (
                                <>
                                    <span className="metric-value">{fmtMB(resources.diskUsedMB)}</span>
                                    <span className="metric-unit">MC dir</span>
                                </>
                            )}
                        </div>
                        <div className="metric-bar">
                            <div className="metric-bar-fill metric-bar-violet" style={{ width: `${Math.max(2, resources.diskPercent || 5)}%` }} />
                        </div>
                    </div>

                    {/* Server Info */}
                    <div className="metric-card">
                        <div className="metric-header">
                            <div className="metric-icon-label">
                                <span className="metric-icon">📡</span>
                                <span className="metric-label">Server Info</span>
                            </div>
                        </div>
                        <div className="metric-info-grid">
                            <div>
                                <span className="metric-info-label">Version</span>
                                <span className="metric-info-value">{status?.version ?? "—"}</span>
                            </div>
                            <div>
                                <span className="metric-info-label">Uptime</span>
                                <span className="metric-info-value">{fmt(status?.uptime ?? null)}</span>
                            </div>
                            <div>
                                <span className="metric-info-label">Players</span>
                                <span className="metric-info-value">{status?.playerCount ?? 0}</span>
                            </div>
                            <div>
                                <span className="metric-info-label">PID</span>
                                <span className="metric-info-value">{status?.pid ?? "—"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Connection + Players Row ── */}
            {(domainConfig || (on && status && status.players.length > 0)) && (
                <div className="connection-players-row">
                    {/* Connection */}
                    {domainConfig && (
                        <div className="connection-card">
                            <div className="connection-card-left">
                                <span className="connection-icon">🎮</span>
                                <div>
                                    <div className="connection-label">Player Connection Address</div>
                                    <div className={`connection-address ${connectionAddress ? "" : "muted"}`}>
                                        {connectionAddress || "Not configured"}
                                    </div>
                                </div>
                            </div>
                            <Link href="/dashboard/domains" className="connection-manage-link">
                                Manage Domains →
                            </Link>
                        </div>
                    )}

                    {/* Online Players */}
                    {on && status && status.players.length > 0 && (
                        <div className="card" style={{ flex: 1 }}>
                            <div className="card-header"><span className="card-title">Online Players</span><span className="badge badge-on">{status.playerCount}</span></div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {status.players.map((n) => (
                                    <div key={n} className="player-chip">
                                        <img src={`https://mc-heads.net/avatar/${n}/22`} alt={n} width={22} height={22} style={{ borderRadius: 4, imageRendering: "pixelated" as const }} />
                                        {n}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Live Console Preview ── */}
            <div className="console-preview">
                <div className="console-preview-header">
                    <div className="console-preview-title-row">
                        <span className="console-preview-icon">▸</span>
                        <span className="console-preview-title">Live Server Console</span>
                    </div>
                    <Link href="/dashboard/console" className="console-preview-link">
                        Open Full Console →
                    </Link>
                </div>
                <div className="console-preview-output">
                    {logs.length === 0
                        ? <span style={{ color: "var(--text-muted)" }}>No console output yet. Start the server to see logs.</span>
                        : logs.map((l, i) => <div key={i} className="console-line">{l}</div>)
                    }
                </div>
            </div>

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
