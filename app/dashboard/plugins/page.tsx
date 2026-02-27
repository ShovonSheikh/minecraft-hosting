"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Plugin { name: string; filename: string; enabled: boolean; size: number; }
function fmtSize(b: number): string { const kb = b / 1024; return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`; }

export default function PluginsPage() {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

    const poll = useCallback(async () => {
        try { setPlugins((await (await fetch("/api/server/plugins")).json()).plugins || []); } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); }, [poll]);

    const toggle = async (p: Plugin) => {
        setBusy(p.filename);
        try { msg((await (await fetch("/api/server/plugins/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: p.filename }) })).json()).message); poll(); }
        catch { msg("Failed"); } finally { setBusy(null); }
    };

    const del = async (p: Plugin) => {
        if (!confirm(`Delete ${p.name}?`)) return;
        setBusy(p.filename);
        try { msg((await (await fetch("/api/server/plugins", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: p.filename }) })).json()).message); poll(); }
        catch { msg("Failed"); } finally { setBusy(null); }
    };

    const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        if (!f.name.endsWith(".jar")) { msg("Only .jar files"); return; }
        setUploading(true);
        try { const fd = new FormData(); fd.append("file", f); msg((await (await fetch("/api/server/plugins", { method: "POST", body: fd })).json()).message); poll(); }
        catch { msg("Upload failed"); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><h2 className="page-title">Plugins</h2><p className="page-subtitle">Install, enable, disable & manage plugins</p></div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{plugins.length} installed</span>
                </div>
            </div>

            <div className="drop-zone" style={{ marginBottom: 16 }} onClick={() => fileRef.current?.click()}>
                <div className="dz-icon">{uploading ? "⏳" : "📦"}</div>
                <p>{uploading ? "Uploading..." : "Click to install a plugin"}</p>
                <div className="dz-hint">.jar files only · restart server to load</div>
                <input ref={fileRef} type="file" accept=".jar" style={{ display: "none" }} onChange={upload} />
            </div>

            {plugins.length === 0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">◆</div><h3>No Plugins</h3><p>Upload a .jar file to get started.</p></div></div>
            ) : (
                <div className="item-grid">
                    {plugins.map((p, i) => (
                        <div key={p.filename} className={`item-card ${!p.enabled ? "dim" : ""}`} style={{ animationDelay: `${i * 0.04}s` }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                <div>
                                    <div className="item-name">{p.name}</div>
                                    <div className="item-meta">{p.filename} · {fmtSize(p.size)}</div>
                                </div>
                                <button type="button" className={`toggle ${p.enabled ? "on" : ""}`} onClick={() => toggle(p)} disabled={busy === p.filename} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span className={`badge ${p.enabled ? "badge-on" : "badge-off"}`} style={{ fontSize: 10 }}>{p.enabled ? "Enabled" : "Disabled"}</span>
                                <button className="btn btn-outline btn-sm" style={{ color: "var(--coral)", fontSize: 11 }} onClick={() => del(p)} disabled={busy === p.filename}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
