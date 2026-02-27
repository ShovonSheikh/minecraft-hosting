"use client";

import { useState, useEffect, useCallback } from "react";

export default function PlayersPage() {
    const [status, setStatus] = useState<{ running: boolean; players: string[]; playerCount: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    const poll = useCallback(async () => {
        try { setStatus(await (await fetch("/api/server/status")).json()); } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); const i = setInterval(poll, 5000); return () => clearInterval(i); }, [poll]);

    const act = async (p: string, a: string, label: string) => {
        setBusy(`${p}-${a}`);
        const cmds: Record<string, string> = { kick: `kick ${p}`, ban: `ban ${p}`, op: `op ${p}`, deop: `deop ${p}` };
        try { await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: cmds[a] }) }); msg(`${label}: ${p}`); setTimeout(poll, 2000); }
        catch { msg("Failed"); } finally { setBusy(null); }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;
    const on = status?.running ?? false, players = status?.players ?? [];

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><h2 className="page-title">Players</h2><p className="page-subtitle">Manage connected players</p></div>
                    <span className={`badge ${on ? "badge-on" : "badge-off"}`}>{players.length} / 20</span>
                </div>
            </div>

            {!on ? (
                <div className="card"><div className="empty"><div className="empty-icon">⏸</div><h3>Server Offline</h3><p>Start the server to manage players.</p></div></div>
            ) : players.length === 0 ? (
                <div className="card"><div className="empty"><div className="empty-icon">◌</div><h3>No Players</h3><p>Players will appear when they connect.</p></div></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <table className="table">
                        <thead><tr><th>Player</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                        <tbody>{players.map(n => (
                            <tr key={n}>
                                <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <img className="avatar" src={`https://mc-heads.net/avatar/${n}/32`} alt={n} width={32} height={32} />
                                        <div><div style={{ fontWeight: 700, fontSize: 14 }}>{n}</div><div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>online</div></div>
                                    </div>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                    <div className="btn-row" style={{ justifyContent: "flex-end" }}>
                                        <button className="btn btn-outline btn-sm" disabled={busy !== null} onClick={() => act(n, "op", "Opped")}>👑 OP</button>
                                        <button className="btn btn-outline btn-sm" disabled={busy !== null} onClick={() => act(n, "deop", "De-opped")}>DeOP</button>
                                        <button className="btn btn-outline btn-sm" style={{ color: "var(--amber)" }} disabled={busy !== null} onClick={() => act(n, "kick", "Kicked")}>Kick</button>
                                        <button className="btn btn-outline btn-sm" style={{ color: "var(--coral)" }} disabled={busy !== null} onClick={() => act(n, "ban", "Banned")}>Ban</button>
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}

            {on && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><span className="card-title">Quick Commands</span></div>
                    <div className="btn-row" style={{ flexWrap: "wrap" }}>
                        {[{ l: "Whitelist On", c: "whitelist on" }, { l: "Whitelist Off", c: "whitelist off" }, { l: "List", c: "list" }, { l: "Ban List", c: "banlist" }, { l: "Pardon All", c: "pardon" }].map(({ l, c }) => (
                            <button key={c} className="btn btn-outline btn-sm" onClick={async () => { await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: c }) }); msg(`Sent: ${c}`); }}>{l}</button>
                        ))}
                    </div>
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
