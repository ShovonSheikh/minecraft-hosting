"use client";

import { useState, useEffect, useCallback } from "react";

interface World { name: string; path: string; size: number; isDefault: boolean; hasNether: boolean; hasEnd: boolean; }

function fmtMB(b: number): string { const mb = b / 1024 / 1024; return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`; }

export default function WorldsPage() {
    const [worlds, setWorlds] = useState<World[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<string | null>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    const poll = useCallback(async () => {
        try { setWorlds((await (await fetch("/api/server/worlds")).json()).worlds || []); } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); }, [poll]);

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <>
            <div className="page-header">
                <h2 className="page-title">Worlds</h2>
                <p className="page-subtitle">Manage server worlds and dimensions</p>
            </div>

            {worlds.length === 0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">◐</div><h3>No Worlds Found</h3><p>Start the server to generate a world.</p></div></div>
            ) : (
                <div className="item-grid">
                    {worlds.map((w, i) => (
                        <div key={w.name} className="world-card" style={{ animationDelay: `${i * 0.05}s`, animation: "fadeUp 0.3s ease both" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-bright)" }}>{w.name}</div>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmtMB(w.size)}</div>
                                </div>
                                {w.isDefault && <span className="badge badge-amber">Default</span>}
                            </div>

                            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                                <span className="badge badge-on" style={{ fontSize: 10 }}>Overworld</span>
                                {w.hasNether && <span className="badge badge-amber" style={{ fontSize: 10 }}>Nether</span>}
                                {w.hasEnd && <span className="badge badge-violet" style={{ fontSize: 10 }}>The End</span>}
                            </div>

                            <div className="btn-row">
                                <button className="btn btn-outline btn-sm" onClick={async () => {
                                    await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: `save-all` }) });
                                    msg(`World ${w.name} saved`);
                                }}>💾 Save</button>
                                <button className="btn btn-outline btn-sm" onClick={async () => {
                                    try {
                                        const r = await fetch("/api/server/backups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: w.name }) });
                                        msg((await r.json()).message);
                                    } catch { msg("Backup failed"); }
                                }}>⟲ Backup</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><span className="card-title">World Commands</span></div>
                <div className="btn-row" style={{ flexWrap: "wrap" }}>
                    {[{ l: "Save All", c: "save-all" }, { l: "Save Off", c: "save-off" }, { l: "Save On", c: "save-on" }, { l: "Set Weather Clear", c: "weather clear" }, { l: "Set Time Day", c: "time set day" }].map(({ l, c }) => (
                        <button key={c} className="btn btn-outline btn-sm" onClick={async () => {
                            await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: c }) });
                            msg(`Sent: ${c}`);
                        }}>{l}</button>
                    ))}
                </div>
            </div>

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
