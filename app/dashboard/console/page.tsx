"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function logClass(l: string): string {
    if (l.includes("WARN")) return "text-[#F8B84E]";
    if (l.includes("ERROR") || l.includes("Exception")) return "text-[#FF6B6B]";
    if (l.includes("Server thread/INFO")) return "text-[#B9C1D1]";
    return "text-[#828D9F]";
}

export default function ConsolePage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [cmd, setCmd] = useState("");
    const [sending, setSending] = useState(false);
    const [on, setOn] = useState(false);
    const [auto, setAuto] = useState(true);
    const [hist, setHist] = useState<string[]>([]);
    const [histI, setHistI] = useState(-1);
    const outRef = useRef<HTMLDivElement>(null);
    const inRef = useRef<HTMLInputElement>(null);

    const poll = useCallback(async () => {
        try {
            const [lr, sr] = await Promise.all([fetch("/api/server/logs?lines=500"), fetch("/api/server/status")]);
            const logsData = await lr.json();
            const statusData = await sr.json();
            // logs is already an array from the API
            const logArr = Array.isArray(logsData.logs) ? logsData.logs : (logsData.logs || "").split("\n");
            setLogs(logArr.filter((l: string) => l.trim()));
            setOn(statusData.running);
        } catch { /* */ }
    }, []);

    useEffect(() => { poll(); const i = setInterval(poll, 2000); return () => clearInterval(i); }, [poll]);

    // Auto scroll logic
    useEffect(() => {
        if (auto && outRef.current) {
            outRef.current.scrollTop = outRef.current.scrollHeight;
        }
    }, [logs, auto]);

    const send = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const c = cmd.trim(); if (!c) return;
        setSending(true);
        setHist(p => [c, ...p.slice(0, 49)]); setHistI(-1); setCmd("");
        try {
            await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: c }) });
            setTimeout(poll, 500);
        }
        catch { /* */ }
        finally { setSending(false); inRef.current?.focus(); }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowUp" && hist.length) {
            e.preventDefault();
            const n = Math.min(histI + 1, hist.length - 1);
            setHistI(n);
            setCmd(hist[n]);
        }
        else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (histI > 0) {
                setHistI(histI - 1);
                setCmd(hist[histI - 1]);
            } else {
                setHistI(-1);
                setCmd("");
            }
        }
    };

    return (
        <div id="page-console" className="page-section max-w-7xl mx-auto h-[calc(100vh-4rem)] block p-6">
            <div className="bg-[#090A0C] border border-[#333947] rounded-xl flex flex-col shadow-2xl h-full">
                {/* Console Header */}
                <div className="px-4 py-3 border-b border-[#333947] flex justify-between items-center bg-[#1A1D24]/50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-terminal text-[#B9C1D1]"></i>
                        <h3 className="font-medium text-[#FFFFFF] text-sm">Full Server Console</h3>
                    </div>
                </div>

                {/* Console Output */}
                <div
                    ref={outRef}
                    onScroll={() => {
                        if (!outRef.current) return;
                        const { scrollTop, scrollHeight, clientHeight } = outRef.current;
                        setAuto(scrollHeight - scrollTop - clientHeight < 40);
                    }}
                    className="flex-1 p-4 font-mono text-[13px] leading-relaxed text-[#B9C1D1] overflow-y-auto terminal-scroll whitespace-pre-wrap break-all"
                >
                    {logs.length === 0
                        ? <div className="text-[#828D9F] text-center italic mt-10">{on ? "Waiting for output..." : "Server is stopped."}</div>
                        : logs.map((l, i) => <div key={i} className={`mb-1 leading-snug ${logClass(l)}`}>{l}</div>)
                    }
                </div>

                {/* Console Input */}
                <form
                    onSubmit={send}
                    className="border-t border-[#333947] p-2 flex bg-[#1A1D24]/50 rounded-b-xl shrink-0"
                >
                    <div className="flex-1 flex items-center bg-[#090A0C] border border-[#333947] rounded-md overflow-hidden focus-within:border-[#F8B84E] focus-within:ring-1 focus-within:ring-[#F8B84E] transition-all">
                        <span className="pl-3 text-[#f1fa8c] font-mono text-sm">{">"}</span>
                        <input
                            ref={inRef}
                            type="text"
                            disabled={!on || sending}
                            value={cmd}
                            onChange={e => setCmd(e.target.value)}
                            onKeyDown={onKey}
                            placeholder={on ? "Type a server command (e.g., 'say Hello', 'time set day')" : "Server offline"}
                            className="w-full bg-transparent border-none text-[#FFFFFF] font-mono text-sm px-3 py-2.5 focus:outline-none placeholder-[#828D9F] disabled:opacity-50"
                            autoComplete="off"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!on || sending || !cmd.trim()}
                        className="ml-2 px-4 py-2 bg-[#1A1D24] hover:bg-[#1A1D24]/80 text-[#FFFFFF] rounded-md text-sm font-medium transition-colors border border-[#333947] disabled:opacity-50 flex items-center gap-2"
                    >
                        {sending ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Send"}
                    </button>
                </form>
            </div>
        </div>
    );
}
