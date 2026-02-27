"use client";

import { useState, useEffect, useCallback } from "react";

interface Backup { name: string; filename: string; size: number; createdAt: string; type: "manual" | "auto"; }

function fmtSize(b: number): string { const mb = b / 1024 / 1024; return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : mb >= 1 ? `${mb.toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`; }
function fmtDate(d: string): string { return new Date(d).toLocaleString(); }

export default function BackupsPage() {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [totalSize, setTotalSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

    const poll = useCallback(async () => {
        try {
            const data = await (await fetch("/api/server/backups")).json();
            setBackups(data.backups || []);
            setTotalSize(data.totalSize || 0);
        } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); }, [poll]);

    const create = async () => {
        setCreating(true);
        try {
            const r = await fetch("/api/server/backups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
            msg((await r.json()).message);
            poll();
        } catch { msg("Backup failed"); }
        finally { setCreating(false); }
    };

    const del = async (b: Backup) => {
        if (!confirm(`Delete backup "${b.name}"?`)) return;
        try {
            const r = await fetch("/api/server/backups", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: b.filename }) });
            msg((await r.json()).message);
            poll();
        } catch { msg("Delete failed"); }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><h2 className="page-title">Backups</h2><p className="page-subtitle">Create and manage server backups</p></div>
                    <button className="btn btn-primary" onClick={create} disabled={creating}>
                        {creating ? <span className="spinner" /> : "⟲ Create Backup"}
                    </button>
                </div>
            </div>

            <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                    <div className="stat-label">Total Backups</div>
                    <div className="stat-value">{backups.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Size</div>
                    <div className="stat-value" style={{ fontSize: 20 }}>{fmtSize(totalSize)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Last Backup</div>
                    <div className="stat-value" style={{ fontSize: 14 }}>{backups[0] ? fmtDate(backups[0].createdAt) : "Never"}</div>
                </div>
            </div>

            {backups.length === 0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">⟲</div><h3>No Backups</h3><p>Create your first backup to protect your server data.</p></div></div>
            ) : (
                <div className="backup-list">
                    {backups.map((b, i) => (
                        <div key={b.filename} className="backup-row" style={{ animationDelay: `${i * 0.03}s` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: b.type === "auto" ? "var(--sky-dim)" : "var(--amber-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                                    {b.type === "auto" ? "⏰" : "💾"}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-bright)" }}>{b.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                                        {fmtDate(b.createdAt)} · {fmtSize(b.size)}
                                    </div>
                                </div>
                            </div>
                            <div className="btn-row">
                                <span className={`badge ${b.type === "auto" ? "badge-sky" : "badge-amber"}`}>{b.type}</span>
                                <button className="btn btn-outline btn-sm" style={{ color: "var(--coral)" }} onClick={() => del(b)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
