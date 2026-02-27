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
        try {
            await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: cmds[a] }) });
            msg(`${label}: ${p}`);
            setTimeout(poll, 2000);
        }
        catch { msg("Failed"); }
        finally { setBusy(null); }
    };

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#F8B84E]"></i></div>;
    const on = status?.running ?? false, players = status?.players ?? [];

    return (
        <div id="page-players" className="page-section max-w-7xl mx-auto space-y-6 block p-6">
            <div className="flex justify-between items-center border-b border-[#333947] pb-4">
                <div className="flex gap-4 sm:gap-6 text-sm font-medium overflow-x-auto w-full">
                    <button className="text-[#4299E1] border-b-2 border-[#4299E1] pb-4 -mb-4 whitespace-nowrap">
                        Online ({players.length})
                    </button>
                    <button className="text-[#828D9F] hover:text-[#FFFFFF] pb-4 -mb-4 transition-colors whitespace-nowrap">Whitelist</button>
                    <button className="text-[#828D9F] hover:text-[#FFFFFF] pb-4 -mb-4 transition-colors whitespace-nowrap">Bans</button>
                    <button className="text-[#828D9F] hover:text-[#FFFFFF] pb-4 -mb-4 transition-colors whitespace-nowrap">Operators</button>
                </div>
            </div>

            {!on ? (
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-12 flex flex-col items-center justify-center text-center">
                    <i className="fa-solid fa-pause text-4xl text-[#828D9F] mb-4 opacity-50"></i>
                    <h3 className="text-lg font-medium text-[#FFFFFF] mb-1">Server Offline</h3>
                    <p className="text-sm text-[#828D9F]">Start the server to manage players.</p>
                </div>
            ) : players.length === 0 ? (
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-12 flex flex-col items-center justify-center text-center">
                    <i className="fa-solid fa-users text-4xl text-[#828D9F] mb-4 opacity-50"></i>
                    <h3 className="text-lg font-medium text-[#FFFFFF] mb-1">No Players Online</h3>
                    <p className="text-sm text-[#828D9F]">Players will appear here when they connect.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {players.map(n => (
                        <div key={n} className="bg-[#1A1D24] border border-[#333947] rounded-xl p-4 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <img src={`https://mc-heads.net/avatar/${n}/40`} alt={n} className="w-10 h-10 rounded shadow-sm" />
                                <div>
                                    <div className="font-medium text-[#FFFFFF]">{n}</div>
                                    <div className="text-xs text-[#828D9F] flex items-center gap-1 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> Online
                                    </div>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    className="w-8 h-8 rounded-lg bg-[#333947] hover:bg-[#F8B84E] text-[#B9C1D1] hover:text-[#1A1D24] transition-colors flex items-center justify-center"
                                    title="Operator (OP)"
                                    disabled={busy !== null}
                                    onClick={() => act(n, "op", "Opped")}
                                >
                                    <i className="fa-solid fa-crown text-xs"></i>
                                </button>
                                <button
                                    className="w-8 h-8 rounded-lg bg-[#333947] hover:bg-[#FF6B6B] text-[#B9C1D1] hover:text-[#FFFFFF] transition-colors flex items-center justify-center"
                                    title="Kick Player"
                                    disabled={busy !== null}
                                    onClick={() => act(n, "kick", "Kicked")}
                                >
                                    <i className="fa-solid fa-user-minus text-xs"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {on && (
                <div className="mt-8 pt-8 border-t border-[#333947]">
                    <h4 className="text-sm font-medium text-[#B9C1D1] mb-4 uppercase tracking-wider">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { l: "Whitelist On", c: "whitelist on", icon: "fa-lock" },
                            { l: "Whitelist Off", c: "whitelist off", icon: "fa-lock-open" },
                            { l: "List Info", c: "list", icon: "fa-list" },
                            { l: "Ban List", c: "banlist", icon: "fa-ban" },
                            { l: "Pardon All", c: "pardon", icon: "fa-heart" }
                        ].map(({ l, c, icon }) => (
                            <button
                                key={c}
                                className="px-4 py-2 bg-[#1A1D24] border border-[#333947] hover:bg-[#333947] text-[#B9C1D1] hover:text-[#FFFFFF] rounded-lg text-sm transition-colors flex items-center gap-2"
                                onClick={async () => { await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: c }) }); msg(`Sent: ${c}`); }}
                            >
                                <i className={`fa-solid ${icon} text-[#828D9F]`}></i> {l}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1D24] border border-[#333947] shadow-xl text-[#FFFFFF] px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in z-50">
                    <i className="fa-solid fa-bell text-[#F8B84E]"></i>
                    <span className="text-sm font-medium">{toast}</span>
                </div>
            )}
        </div>
    );
}
