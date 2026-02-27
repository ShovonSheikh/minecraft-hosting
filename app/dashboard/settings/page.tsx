"use client";

import { useState, useEffect, useCallback } from "react";

const SECTIONS = [
    { title: "⚙ General", keys: ["server-name", "motd", "gamemode", "difficulty", "max-players", "level-name", "level-seed", "level-type", "hardcore", "pvp", "spawn-protection", "allow-flight"] },
    { title: "◐ World", keys: ["generate-structures", "spawn-monsters", "spawn-animals", "spawn-npcs", "view-distance", "simulation-distance", "max-world-size"] },
    { title: "⟲ Network", keys: ["server-port", "server-ip", "online-mode", "network-compression-threshold", "max-tick-time", "enable-query", "query.port"] },
    { title: "◈ Security", keys: ["white-list", "enforce-whitelist", "enable-rcon", "rcon.password", "rcon.port", "enforce-secure-profile"] },
    { title: "⚡ Performance", keys: ["max-tick-time", "entity-broadcast-range-percentage", "rate-limit", "max-chained-neighbor-updates"] },
];

export default function SettingsPage() {
    const [props, setProps] = useState<Record<string, string>>({});
    const [orig, setOrig] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

    const poll = useCallback(async () => {
        try { const d = (await (await fetch("/api/server/properties")).json()).properties || {}; setProps(d); setOrig(d); } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); }, [poll]);

    const changed = Object.keys(props).filter(k => props[k] !== orig[k]);
    const isBool = (k: string) => ["true", "false"].includes(orig[k]?.toLowerCase?.() ?? "");

    const save = async () => {
        setSaving(true);
        try {
            const updates: Record<string, string> = {}; changed.forEach(k => updates[k] = props[k]);
            const r = await fetch("/api/server/properties", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ properties: updates }) });
            msg((await r.json()).message); setOrig({ ...props });
        } catch { msg("Failed"); } finally { setSaving(false); }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><h2 className="page-title">Settings</h2><p className="page-subtitle">Configure server.properties</p></div>
                    <div className="btn-row">
                        <button className="btn btn-outline" onClick={() => setProps({ ...orig })} disabled={changed.length === 0}>Reset</button>
                        <button className="btn btn-primary" onClick={save} disabled={changed.length === 0 || saving}>
                            {saving ? <span className="spinner" /> : `Save (${changed.length})`}
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-grid">
                {SECTIONS.map(s => {
                    const keys = s.keys.filter(k => k in props);
                    if (keys.length === 0) return null;
                    return (
                        <div key={s.title} className="settings-section">
                            <h3>{s.title}</h3>
                            {keys.map(k => {
                                const mod = props[k] !== orig[k];
                                return (
                                    <div className="field" key={k}>
                                        <label className="field-label">
                                            {k} {mod && <span className="hint" style={{ color: "var(--amber)" }}>• modified</span>}
                                        </label>
                                        {isBool(k) ? (
                                            <button type="button" className={`toggle ${props[k] === "true" ? "on" : ""}`}
                                                onClick={() => setProps(p => ({ ...p, [k]: p[k] === "true" ? "false" : "true" }))} />
                                        ) : (
                                            <input className="input input-mono" value={props[k]} onChange={e => setProps(p => ({ ...p, [k]: e.target.value }))}
                                                style={mod ? { borderColor: "var(--amber)", boxShadow: "0 0 0 2px var(--amber-dim)" } : {}} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {changed.length > 0 && (
                <div className="unsaved-bar">
                    <span>⚠ {changed.length} unsaved</span>
                    <button className="btn btn-outline btn-sm" onClick={() => setProps({ ...orig })}>Discard</button>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Save</button>
                </div>
            )}
            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
