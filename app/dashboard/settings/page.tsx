"use client";

import { useState, useEffect, useCallback } from "react";

const SECTIONS = [
    { title: "General", icon: "fa-gear", keys: ["server-name", "motd", "gamemode", "difficulty", "max-players", "level-name", "level-seed", "level-type", "hardcore", "pvp", "spawn-protection", "allow-flight"] },
    { title: "World", icon: "fa-globe", keys: ["generate-structures", "spawn-monsters", "spawn-animals", "spawn-npcs", "view-distance", "simulation-distance", "max-world-size"] },
    { title: "Network", icon: "fa-network-wired", keys: ["server-port", "server-ip", "online-mode", "network-compression-threshold", "max-tick-time", "enable-query", "query.port"] },
    { title: "Security", icon: "fa-shield-halved", keys: ["white-list", "enforce-whitelist", "enable-rcon", "rcon.password", "rcon.port", "enforce-secure-profile"] },
    { title: "Performance", icon: "fa-bolt", keys: ["entity-broadcast-range-percentage", "rate-limit", "max-chained-neighbor-updates"] },
];

export default function SettingsPage() {
    const [props, setProps] = useState<Record<string, string>>({});
    const [orig, setOrig] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<"visual" | "raw">("visual");
    const [rawContent, setRawContent] = useState("");

    const msg = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ msg: m, type: t });
        setTimeout(() => setToast(null), 3000);
    };

    const poll = useCallback(async () => {
        try {
            const res = await fetch("/api/server/properties");
            const d = await res.json();
            const fetchedProps = d.properties || {};
            setProps(fetchedProps);
            setOrig(fetchedProps);

            // Build raw content
            const raw = Object.entries(fetchedProps).map(([k, v]) => `${k}=${v}`).join("\n");
            setRawContent(raw);
        } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); }, [poll]);

    const changedKeys = Object.keys(props).filter(k => props[k] !== orig[k]);
    const isBool = (k: string) => ["true", "false"].includes(orig[k]?.toLowerCase?.() ?? "");

    const saveVisual = async () => {
        setSaving(true);
        try {
            const updates: Record<string, string> = {};
            changedKeys.forEach(k => updates[k] = props[k]);
            const r = await fetch("/api/server/properties", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ properties: updates }) });
            const d = await r.json();
            if (d.success) {
                msg("Settings saved successfully", 'success');
                setOrig({ ...props });
                setRawContent(Object.entries(props).map(([k, v]) => `${k}=${v}`).join("\n"));
            } else {
                msg(d.message, 'error');
            }
        } catch { msg("Failed to save", 'error'); }
        finally { setSaving(false); }
    };

    const saveRaw = async () => {
        setSaving(true);
        try {
            const updates: Record<string, string> = {};
            rawContent.split("\n").forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                    const idx = trimmed.indexOf("=");
                    updates[trimmed.substring(0, idx)] = trimmed.substring(idx + 1);
                }
            });
            const r = await fetch("/api/server/properties", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ properties: updates }) });
            const d = await r.json();
            if (d.success) {
                msg("Raw settings saved successfully", 'success');
                poll();
            } else {
                msg(d.message, 'error');
            }
        } catch { msg("Failed to save raw settings", 'error'); }
        finally { setSaving(false); }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    const mappedKeys = new Set(SECTIONS.flatMap(s => s.keys));
    const otherKeys = Object.keys(props).filter(k => !mappedKeys.has(k)).sort();

    // Check if raw text actually has modifications compared to state
    const currentRaw = Object.entries(props).map(([k, v]) => `${k}=${v}`).join("\n");
    const rawChanged = rawContent !== currentRaw;

    return (
        <div className="p-6 space-y-6">
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <h2 className="page-title">Server Settings</h2>
                        <p className="page-subtitle">Configure server.properties directly</p>
                    </div>
                    <div style={{ display: "flex", backgroundColor: "var(--bg-elevated)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <button
                            className={`btn btn-sm ${activeTab === 'visual' ? 'btn-primary' : ''}`}
                            style={activeTab === 'visual' ? {} : { background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                            onClick={() => setActiveTab("visual")}
                        >
                            <i className="fa-solid fa-table-list mr-2"></i> Visual Editor
                        </button>
                        <button
                            className={`btn btn-sm ${activeTab === 'raw' ? 'btn-primary' : ''}`}
                            style={activeTab === 'raw' ? {} : { background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                            onClick={() => {
                                setRawContent(Object.entries(props).map(([k, v]) => `${k}=${v}`).join("\n"));
                                setActiveTab("raw");
                            }}
                        >
                            <i className="fa-solid fa-code mr-2"></i> Raw Editor
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === "visual" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
                        {SECTIONS.map(s => {
                            const sectionKeys = s.keys.filter(k => k in props);
                            if (sectionKeys.length === 0) return null;
                            return (
                                <div key={s.title} className="card" style={{ padding: "0" }}>
                                    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", gap: "10px" }}>
                                        <i className={`fa-solid ${s.icon}`} style={{ color: "var(--primary)" }}></i>
                                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{s.title}</h3>
                                    </div>
                                    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                        {sectionKeys.map(k => {
                                            const mod = props[k] !== orig[k];
                                            return (
                                                <div key={k} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-normal)" }}>{k}</label>
                                                        {mod && <span className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Modified</span>}
                                                    </div>
                                                    {isBool(k) ? (
                                                        <div className="custom-select-wrapper">
                                                            <select
                                                                className="form-input"
                                                                value={props[k]}
                                                                onChange={e => setProps(p => ({ ...p, [k]: e.target.value }))}
                                                                style={mod ? { borderColor: "var(--amber)", backgroundColor: "var(--amber-dim)" } : {}}
                                                            >
                                                                <option value="true">true</option>
                                                                <option value="false">false</option>
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            className="form-input"
                                                            value={props[k]}
                                                            onChange={e => setProps(p => ({ ...p, [k]: e.target.value }))}
                                                            style={mod ? { borderColor: "var(--amber)", backgroundColor: "var(--amber-dim)" } : {}}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {otherKeys.length > 0 && (
                            <div className="card" style={{ padding: "0" }}>
                                <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", gap: "10px" }}>
                                    <i className="fa-solid fa-ellipsis" style={{ color: "var(--primary)" }}></i>
                                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Other Properties</h3>
                                </div>
                                <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {otherKeys.map(k => {
                                        const mod = props[k] !== orig[k];
                                        return (
                                            <div key={k} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-normal)", wordBreak: "break-all" }}>{k}</label>
                                                    {mod && <span className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Modified</span>}
                                                </div>
                                                <input
                                                    className="form-input"
                                                    value={props[k]}
                                                    onChange={e => setProps(p => ({ ...p, [k]: e.target.value }))}
                                                    style={mod ? { borderColor: "var(--amber)", backgroundColor: "var(--amber-dim)" } : {}}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {changedKeys.length > 0 && (
                        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-elevated)", border: "1px solid var(--amber)", position: "sticky", bottom: "24px", zIndex: 10, filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.5))" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--amber-dim)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, color: "var(--text-bright)" }}>Unsaved Changes</h4>
                                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>You have {changedKeys.length} pending modification{changedKeys.length > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button className="btn btn-secondary" onClick={() => setProps({ ...orig })}>Discard</button>
                                <button className="btn btn-primary" onClick={saveVisual} disabled={saving}>
                                    {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Save Properties"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="card p-0 flex flex-col shadow-xl" style={{ minHeight: "600px", height: "calc(100vh - 200px)" }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-elevated)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <i className="fa-solid fa-file-lines" style={{ color: "var(--text-muted)" }}></i>
                            <span style={{ fontWeight: 600, color: "var(--text-bright)" }}>server.properties</span>
                            {rawChanged && <span className="badge badge-warning" style={{ marginLeft: "8px" }}>Unsaved</span>}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setRawContent(currentRaw)} disabled={!rawChanged}>Discard</button>
                            <button className="btn btn-sm btn-primary" onClick={saveRaw} disabled={!rawChanged || saving}>
                                {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Save File"}
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={rawContent}
                        onChange={(e) => setRawContent(e.target.value)}
                        className="terminal-scroll"
                        style={{ flex: 1, width: "100%", backgroundColor: "var(--bg-main)", border: "none", color: "var(--text-bright)", fontFamily: "monospace", fontSize: "0.85rem", padding: "1.5rem", outline: "none", resize: "none", lineHeight: 1.6 }}
                        spellCheck={false}
                    />
                </div>
            )}

            {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>{toast.msg}</div>}
        </div>
    );
}
