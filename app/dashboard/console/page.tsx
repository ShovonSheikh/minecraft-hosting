"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function logClass(l: string): string {
    if (l.startsWith(">")) return "log-cmd";
    if (l.includes("/WARN") || l.includes("[MCPanel]")) return "log-warn";
    if (l.includes("/ERROR") || l.includes("Exception")) return "log-error";
    return "log-info";
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
            setLogs((await lr.json()).logs || []);
            setOn((await sr.json()).running);
        } catch { /* */ }
    }, []);

    useEffect(() => { poll(); const i = setInterval(poll, 2000); return () => clearInterval(i); }, [poll]);
    useEffect(() => { if (auto && outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; }, [logs, auto]);

    const send = async () => {
        const c = cmd.trim(); if (!c) return;
        setSending(true);
        setHist(p => [c, ...p.slice(0, 49)]); setHistI(-1); setCmd("");
        try { await fetch("/api/server/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: c }) }); setTimeout(poll, 500); }
        catch { /* */ }
        finally { setSending(false); inRef.current?.focus(); }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
        else if (e.key === "ArrowUp" && hist.length) { e.preventDefault(); const n = Math.min(histI + 1, hist.length - 1); setHistI(n); setCmd(hist[n]); }
        else if (e.key === "ArrowDown") { e.preventDefault(); if (histI > 0) { setHistI(histI - 1); setCmd(hist[histI - 1]); } else { setHistI(-1); setCmd(""); } }
    };

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><h2 className="page-title">Console</h2><p className="page-subtitle">Live server output & command interface</p></div>
                    <span className={`badge ${on ? "badge-on" : "badge-off"}`}><span className={`status-dot ${on ? "on" : "off"}`} />{on ? "Running" : "Stopped"}</span>
                </div>
            </div>
            <div className="console-wrap" style={{ height: "calc(100vh - 170px)" }}>
                <div className="console-bar">
                    <div className="console-dots"><span className="d-r" /><span className="d-y" /><span className="d-g" /></div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{logs.length} lines</span>
                </div>
                <div className="console-output" ref={outRef} onScroll={() => { if (!outRef.current) return; const { scrollTop, scrollHeight, clientHeight } = outRef.current; setAuto(scrollHeight - scrollTop - clientHeight < 40); }}>
                    {logs.length === 0
                        ? <div style={{ color: "var(--text-muted)", padding: 30, textAlign: "center" }}>{on ? "Waiting for output..." : "Server is stopped."}</div>
                        : logs.map((l, i) => <div key={i} className={logClass(l)}>{l}</div>)}
                </div>
                <div className="console-input">
                    <span className="prompt-char">&gt;</span>
                    <input ref={inRef} placeholder={on ? "Type a command... (↑↓ history)" : "Server offline"} value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={onKey} disabled={!on || sending} autoFocus />
                    <button className="btn btn-primary btn-sm" onClick={send} disabled={!on || sending || !cmd.trim()}>{sending ? <span className="spinner" /> : "Send"}</button>
                </div>
            </div>
        </>
    );
}
