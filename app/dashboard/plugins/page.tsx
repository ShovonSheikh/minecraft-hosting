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

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#F8B84E]"></i></div>;

    return (
        <div id="page-plugins" className="page-section max-w-7xl mx-auto space-y-6 block">
            <div className="flex justify-between items-center border-b border-[#333947] pb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#FFFFFF]">Plugins</h2>
                    <span className="text-xs font-mono text-[#828D9F] ml-2 px-2 py-0.5 bg-[#1A1D24] rounded-md border border-[#333947]">{plugins.length} installed</span>
                </div>
            </div>

            <div
                onClick={() => fileRef.current?.click()}
                className={`bg-[#090A0C] border-2 border-dashed ${uploading ? 'border-[#4299E1]' : 'border-[#333947] hover:border-[#F8B84E] cursor-pointer'} rounded-xl p-10 text-center flex flex-col items-center justify-center transition-colors`}
            >
                <i className={`fa-solid ${uploading ? 'fa-circle-notch fa-spin text-[#4299E1]' : 'fa-box-open text-[#B9C1D1]/40'} text-5xl mb-4`}></i>
                <h2 className="text-lg font-medium text-[#FFFFFF] mb-2">{uploading ? "Uploading Plugin..." : "Click to install a plugin"}</h2>
                <p className="text-sm text-[#828D9F] max-w-md mx-auto mb-2">.jar files only · restart server to load</p>
                <input ref={fileRef} type="file" accept=".jar" style={{ display: "none" }} onChange={upload} />
            </div>

            {plugins.length === 0 ? (
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-12 flex flex-col items-center justify-center text-center mt-6">
                    <i className="fa-solid fa-gem text-4xl text-[#828D9F] mb-4 opacity-50"></i>
                    <h3 className="text-lg font-medium text-[#FFFFFF] mb-1">No Plugins Installed</h3>
                    <p className="text-sm text-[#828D9F]">Upload a .jar file to get started and add features to your server.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {plugins.map((p, i) => (
                        <div key={p.filename} className={`bg-[#1A1D24] border border-[#333947] rounded-xl p-5 flex flex-col transition-all ${!p.enabled ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.enabled ? 'bg-[#F8B84E]/10 text-[#F8B84E]' : 'bg-[#333947] text-[#828D9F]'}`}>
                                        <i className="fa-solid fa-puzzle-piece"></i>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-[#FFFFFF] truncate max-w-[150px]">{p.name || p.filename.replace('.jar', '')}</h4>
                                        <div className="text-xs font-mono text-[#828D9F]">{fmtSize(p.size)}</div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={p.enabled}
                                        onChange={() => toggle(p)}
                                        disabled={busy === p.filename}
                                    />
                                    <div className="w-9 h-5 bg-[#333947] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
                                </label>
                            </div>

                            <div className="mt-auto border-t border-[#333947] pt-4 flex items-center justify-between">
                                <span className="text-xs text-[#828D9F] font-mono truncate max-w-[150px]">{p.filename}</span>
                                <button
                                    onClick={() => del(p)}
                                    disabled={busy === p.filename}
                                    className="text-[#FF6B6B] hover:text-[#FF6B6B]/80 hover:bg-[#FF6B6B]/10 p-1.5 rounded transition-colors"
                                    title="Delete Plugin"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
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
