"use client";

import { useState, useEffect, useCallback } from "react";

interface FileItem { name: string; path: string; isDirectory: boolean; size: number; }
function fmtSize(b: number): string { if (b === 0) return "0 KB"; const kb = b / 1024; return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`; }

function FileIcon({ name, isDir }: { name: string, isDir: boolean }) {
    if (isDir) return <i className="fa-solid fa-folder text-[#4299E1] text-lg"></i>;
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (ext === "json" || ext === "yml" || ext === "yaml") return <i className="fa-solid fa-file-code text-[#B9C1D1] text-lg"></i>;
    if (ext === "properties" || ext === "txt" || ext === "log") return <i className="fa-regular fa-file-lines text-[#828D9F] text-lg"></i>;
    if (ext === "jar") return <i className="fa-solid fa-mug-hot text-[#F8B84E] text-lg"></i>;
    return <i className="fa-solid fa-file text-[#828D9F] text-lg"></i>;
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
        try {
            const d = await (await fetch(`/api/server/files?path=${encodeURIComponent(p)}`)).json();
            setFiles(d.files || []);
            setCurPath(p);
        } catch { /* */ }
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
        try {
            const d = await (await fetch("/api/server/files", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: selFile, content }) })).json();
            msg(d.message);
            if (d.success) setOrig(content);
        }
        catch { msg("Failed"); }
        finally { setSaving(false); }
    };

    const nav = (p: string) => { setSelFile(null); setContent(""); fetchDir(p); };
    const up = () => { const parts = curPath.split("/").filter(Boolean); parts.pop(); nav(parts.join("/")); };
    const crumbs = curPath.split("/").filter(Boolean);
    const changed = content !== orig;

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#F8B84E]"></i></div>;

    return (
        <div id="page-filemanager" className="page-section max-w-7xl mx-auto space-y-6 block">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-[#828D9F] bg-[#1A1D24] px-4 py-2 rounded-lg border border-[#333947] w-full sm:w-auto overflow-x-auto">
                    <i className="fa-solid fa-house hover:text-[#FFFFFF] cursor-pointer transition-colors" onClick={() => nav("")}></i>
                    {crumbs.length > 0 && <span className="text-[#333947]">/</span>}
                    {crumbs.map((c, i) => (
                        <span key={i} className="flex items-center gap-2">
                            <span
                                className="hover:text-[#FFFFFF] cursor-pointer transition-colors"
                                onClick={() => nav(crumbs.slice(0, i + 1).join("/"))}
                            >
                                {c}
                            </span>
                            {i < crumbs.length - 1 && <span className="text-[#333947]">/</span>}
                        </span>
                    ))}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-4 py-2 bg-[#1A1D24] hover:bg-[#1A1D24]/80 text-[#FFFFFF] rounded-lg text-sm font-medium transition-colors border border-[#333947]">
                        <i className="fa-solid fa-folder-plus mr-2"></i>New Folder
                    </button>
                    <button className="flex-1 sm:flex-none px-4 py-2 bg-[#4299E1] hover:bg-[#4299E1]/80 text-[#FFFFFF] rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[#4299E1]/20">
                        <i className="fa-solid fa-upload mr-2"></i>Upload
                    </button>
                </div>
            </div>

            <div className="bg-[#1A1D24] border border-[#333947] rounded-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                {/* File List */}
                <div className="md:w-1/3 xl:w-1/4 border-r border-[#333947] overflow-y-auto max-h-[600px]">
                    <table className="w-full text-left border-collapse">
                        <tbody className="text-sm text-[#B9C1D1] divide-y divide-[#333947]/50">
                            {curPath && (
                                <tr className="hover:bg-[#1A1D24]/70 transition-colors group cursor-pointer" onClick={up}>
                                    <td className="p-3 flex items-center gap-3">
                                        <i className="fa-solid fa-level-up-alt text-[#828D9F] text-lg"></i>
                                        <span className="font-medium group-hover:text-[#F8B84E] transition-colors">..</span>
                                    </td>
                                    <td className="p-3 text-right"></td>
                                </tr>
                            )}
                            {files.map((f) => (
                                <tr key={f.path} className={`hover:bg-[#1A1D24]/70 transition-colors group cursor-pointer ${selFile === f.path ? "bg-[#1A1D24]/90 border-l-2 border-[#F8B84E]" : ""}`} onClick={() => f.isDirectory ? nav(f.path) : open(f.path)}>
                                    <td className="p-3 flex items-center gap-3 overflow-hidden">
                                        <FileIcon name={f.name} isDir={f.isDirectory} />
                                        <span className="font-medium group-hover:text-[#F8B84E] transition-colors truncate">{f.name}</span>
                                    </td>
                                    <td className="p-3 text-right text-xs text-[#828D9F] whitespace-nowrap">
                                        {!f.isDirectory ? fmtSize(f.size) : "-"}
                                    </td>
                                </tr>
                            ))}
                            {files.length === 0 && (
                                <tr><td colSpan={2} className="p-6 text-center text-[#828D9F] italic">Empty directory</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* File Editor */}
                <div className="flex-1 flex flex-col bg-[#090A0C]">
                    {selFile ? (
                        <>
                            <div className="px-4 py-3 border-b border-[#333947] flex justify-between items-center bg-[#1A1D24]/50">
                                <div className="flex items-center gap-2">
                                    <FileIcon name={selFile.split('/').pop() || ""} isDir={false} />
                                    <span className="font-medium text-sm text-[#FFFFFF]">{selFile.split('/').pop()}</span>
                                    {changed && <span className="text-xs bg-[#F8B84E]/10 text-[#F8B84E] px-2 py-0.5 rounded ml-2">Unsaved</span>}
                                </div>
                                <div className="flex gap-2">
                                    {changed && (
                                        <button onClick={() => setContent(orig)} className="px-3 py-1.5 text-xs font-medium text-[#828D9F] hover:text-[#FFFFFF] transition-colors">
                                            Discard
                                        </button>
                                    )}
                                    <button
                                        onClick={save}
                                        disabled={!changed || saving}
                                        className="px-3 py-1.5 bg-[#4299E1] hover:bg-[#4299E1]/80 text-[#FFFFFF] rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                                        Save
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                spellCheck={false}
                                className="flex-1 w-full bg-transparent text-[#B9C1D1] font-mono text-sm p-4 focus:outline-none resize-none"
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[#828D9F]">
                            <i className="fa-solid fa-file-code text-4xl mb-3 opacity-20"></i>
                            <span className="text-sm">Select a file from the sidebar to edit</span>
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#1A1D24] border border-[#333947] shadow-xl text-[#FFFFFF] px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in z-50">
                    <i className="fa-solid fa-bell text-[#F8B84E]"></i>
                    <span className="text-sm font-medium">{toast}</span>
                </div>
            )}
        </div>
    );
}
