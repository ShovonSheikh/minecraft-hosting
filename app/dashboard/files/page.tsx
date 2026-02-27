"use client";

import { useState, useEffect, useCallback } from "react";

interface FileItem { name: string; path: string; isDirectory: boolean; size: number; }
function fmtSize(b: number): string { if (b === 0) return "0"; const kb = b / 1024; return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`; }
function icon(name: string, isDir: boolean): string {
    if (isDir) return "📁";
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const m: Record<string, string> = { jar: "☕", json: "{ }", yml: "📋", yaml: "📋", properties: "⚙", txt: "📝", log: "📊", toml: "📋", xml: "📐", png: "🖼", jpg: "🖼", dat: "💾" };
    return m[ext] || "📄";
}

export default function FilesPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [curPath, setCurPath] = useState("");
    const [selFile, setSelFile] = useState<string | null>(null);
    const [content, setContent] = useState("");
    const [orig, setOrig] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

    const fetchDir = useCallback(async (p: string = "") => {
        try { const d = await (await fetch(`/api/server/files?path=${encodeURIComponent(p)}`)).json(); setFiles(d.files || []); setCurPath(p); } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchDir(); }, [fetchDir]);

    const open = async (fp: string) => {
        try {
            const d = await (await fetch("/api/server/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: fp }) })).json();
            if (d.success) { setSelFile(fp); setContent(d.content); setOrig(d.content); } else msg(d.message);
        } catch { msg("Failed"); }
    };

    const save = async () => {
        if (!selFile) return;
        setSaving(true);
        try { const d = await (await fetch("/api/server/files", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: selFile, content }) })).json(); msg(d.message); if (d.success) setOrig(content); }
        catch { msg("Failed"); } finally { setSaving(false); }
    };

    const nav = (p: string) => { setSelFile(null); setContent(""); fetchDir(p); };
    const up = () => { const parts = curPath.split("/").filter(Boolean); parts.pop(); nav(parts.join("/")); };
    const crumbs = curPath.split("/").filter(Boolean);
    const changed = content !== orig;

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <>
            <div className="page-header"><h2 className="page-title">Files</h2><p className="page-subtitle">Browse & edit server files</p></div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
                <span style={{ cursor: "pointer", color: "var(--amber)" }} onClick={() => nav("")}>minecraft</span>
                {crumbs.map((c, i) => <span key={i}><span style={{ margin: "0 3px" }}>/</span><span style={{ cursor: "pointer", color: i === crumbs.length - 1 ? "var(--text-primary)" : "var(--amber)" }} onClick={() => nav(crumbs.slice(0, i + 1).join("/"))}>{c}</span></span>)}
            </div>

            <div className="file-split">
                <div className="file-tree">
                    {curPath && <div className="file-row" onClick={up}><span className="f-icon">↩</span><span className="f-name">..</span></div>}
                    {files.map(f => (
                        <div key={f.path} className={`file-row ${selFile === f.path ? "active" : ""}`} onClick={() => f.isDirectory ? nav(f.path) : open(f.path)}>
                            <span className="f-icon">{icon(f.name, f.isDirectory)}</span>
                            <span className="f-name">{f.name}</span>
                            {!f.isDirectory && <span className="f-size">{fmtSize(f.size)}</span>}
                        </div>
                    ))}
                    {files.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Empty</div>}
                </div>

                <div className="file-editor">
                    {selFile ? (
                        <>
                            <div className="file-editor-bar">
                                <span className="fe-path">{selFile}</span>
                                <div className="btn-row">
                                    {changed && <button className="btn btn-outline btn-sm" onClick={() => setContent(orig)}>Discard</button>}
                                    <button className="btn btn-primary btn-sm" onClick={save} disabled={!changed || saving}>{saving ? <span className="spinner" /> : "Save"}</button>
                                </div>
                            </div>
                            <textarea value={content} onChange={e => setContent(e.target.value)} spellCheck={false} />
                        </>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Select a file to edit</div>
                    )}
                </div>
            </div>

            {changed && <div className="unsaved-bar"><span>⚠ Unsaved changes</span><button className="btn btn-outline btn-sm" onClick={() => setContent(orig)}>Discard</button><button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Save</button></div>}
            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
