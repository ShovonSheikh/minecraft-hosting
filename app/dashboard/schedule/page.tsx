"use client";

import { useState, useEffect, useCallback } from "react";

interface Task { id: string; name: string; action: string; command?: string; intervalMinutes: number; enabled: boolean; lastRun: string | null; createdAt: string; }

function fmtInterval(m: number): string {
    if (m < 60) return `${m}m`;
    if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
    return `${Math.floor(m / 1440)}d`;
}

export default function SchedulePage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState("");
    const [action, setAction] = useState("restart");
    const [command, setCommand] = useState("");
    const [interval, setInterval_] = useState(60);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    const poll = useCallback(async () => {
        try { setTasks((await (await fetch("/api/server/schedule")).json()).schedules || []); } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); }, [poll]);

    const add = async () => {
        if (!name.trim()) { msg("Name required"); return; }
        setSaving(true);
        try {
            const r = await fetch("/api/server/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, action, command: action === "command" ? command : undefined, intervalMinutes: interval, enabled: true }) });
            msg((await r.json()).message);
            setShowModal(false); setName(""); setCommand(""); poll();
        } catch { msg("Failed"); } finally { setSaving(false); }
    };

    const toggle = async (id: string) => {
        try { await fetch("/api/server/schedule", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); poll(); } catch { /* */ }
    };

    const del = async (t: Task) => {
        if (!confirm(`Delete "${t.name}"?`)) return;
        try { await fetch("/api/server/schedule", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) }); msg("Deleted"); poll(); } catch { /* */ }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <div className="p-6">
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><h2 className="page-title">Schedule</h2><p className="page-subtitle">Automated tasks & maintenance</p></div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Task</button>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">◷</div><h3>No Scheduled Tasks</h3><p>Create automated restart, backup, or maintenance tasks.</p></div></div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tasks.map((t, i) => (
                        <div key={t.id} className="schedule-row" style={{ animationDelay: `${i * 0.03}s`, opacity: t.enabled ? 1 : 0.45 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <button type="button" className={`toggle ${t.enabled ? "on" : ""}`} onClick={() => toggle(t.id)} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-bright)" }}>{t.name}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                                        {t.action}{t.command ? `: ${t.command}` : ""} · every {fmtInterval(t.intervalMinutes)}
                                    </div>
                                </div>
                            </div>
                            <div className="btn-row">
                                <span className={`badge ${t.action === "restart" ? "badge-amber" : t.action === "backup" ? "badge-sky" : t.action === "stop" ? "badge-off" : "badge-on"}`}>{t.action}</span>
                                <button className="btn btn-outline btn-sm" style={{ color: "var(--coral)" }} onClick={() => del(t)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal">
                        <h3>New Scheduled Task</h3>
                        <div className="field">
                            <label className="field-label">Task Name</label>
                            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auto Restart" autoFocus />
                        </div>
                        <div className="field">
                            <label className="field-label">Action</label>
                            <select className="input" value={action} onChange={e => setAction(e.target.value)}>
                                <option value="restart">Restart Server</option>
                                <option value="backup">Create Backup</option>
                                <option value="command">Run Command</option>
                                <option value="stop">Stop Server</option>
                            </select>
                        </div>
                        {action === "command" && (
                            <div className="field">
                                <label className="field-label">Command</label>
                                <input className="input input-mono" value={command} onChange={e => setCommand(e.target.value)} placeholder="say Server restarting in 5 minutes" />
                            </div>
                        )}
                        <div className="field">
                            <label className="field-label">Interval (minutes)</label>
                            <input className="input" type="number" min={1} value={interval} onChange={e => setInterval_(parseInt(e.target.value) || 60)} />
                        </div>
                        <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
                            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={add} disabled={saving}>{saving ? <span className="spinner" /> : "Create"}</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
