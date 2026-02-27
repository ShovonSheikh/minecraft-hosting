"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface FileItem { name: string; path: string; isDirectory: boolean; size: number; }
function fmtSize(b: number): string { if (b === 0) return "0 KB"; const kb = b / 1024; return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`; }

function FileIcon({ name, isDir }: { name: string, isDir: boolean }) {
    if (isDir) return <i className="fa-solid fa-folder text-lg" style={{ color: "var(--primary)" }}></i>;
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (ext === "json" || ext === "yml" || ext === "yaml") return <i className="fa-solid fa-file-code text-lg text-emerald-500"></i>;
    if (ext === "properties" || ext === "txt" || ext === "log") return <i className="fa-regular fa-file-lines text-lg" style={{ color: "var(--text-muted)" }}></i>;
    if (ext === "jar") return <i className="fa-solid fa-mug-hot text-lg text-amber-500"></i>;
    return <i className="fa-solid fa-file text-lg" style={{ color: "var(--text-muted)" }}></i>;
}

export default function FilesPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [curPath, setCurPath] = useState("");
    const [selFile, setSelFile] = useState<string | null>(null);
    const [content, setContent] = useState("");
    const [orig, setOrig] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // New Folder modal
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [creatingFolder, setCreatingFolder] = useState(false);

    // Upload
    const uploadRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Rename
    const [renamingItem, setRenamingItem] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");

    // Delete
    const [deleting, setDeleting] = useState<string | null>(null);

    // Clipboard (Cut/Copy/Paste)
    const [clipboard, setClipboard] = useState<{ path: string; isCut: boolean } | null>(null);
    const [pasting, setPasting] = useState(false);

    const msg = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ msg: m, type: t });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchDir = useCallback(async (p: string = "") => {
        try {
            const res = await fetch(`/api/server/files?path=${encodeURIComponent(p)}`);
            const d = await res.json();
            setFiles(d.files || []);
            setCurPath(p);
        } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchDir(); }, [fetchDir]);

    const open = async (fp: string) => {
        try {
            const d = await (await fetch("/api/server/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: fp }) })).json();
            if (d.success) { setSelFile(fp); setContent(d.content); setOrig(d.content); } else msg(d.message, 'error');
        } catch { msg("Failed to open file", 'error'); }
    };

    const save = async () => {
        if (!selFile) return;
        setSaving(true);
        try {
            const d = await (await fetch("/api/server/files", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: selFile, content }) })).json();
            if (d.success) {
                msg("File saved successfully", 'success');
                setOrig(content);
            } else {
                msg(d.message, 'error');
            }
        }
        catch { msg("Failed to save file", 'error'); }
        finally { setSaving(false); }
    };

    const nav = (p: string) => { setSelFile(null); setContent(""); setRenamingItem(null); fetchDir(p); };
    const up = () => { const parts = curPath.split("/").filter(Boolean); parts.pop(); nav(parts.join("/")); };
    const crumbs = curPath.split("/").filter(Boolean);
    const changed = content !== orig;

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) { msg("Folder name required", 'error'); return; }
        setCreatingFolder(true);
        try {
            const folderPath = curPath ? `${curPath}/${newFolderName.trim()}` : newFolderName.trim();
            const d = await (await fetch("/api/server/files", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mkdir", path: folderPath })
            })).json();
            if (d.success) {
                msg("Folder created", 'success');
                setShowNewFolder(false);
                setNewFolderName("");
                fetchDir(curPath);
            } else {
                msg(d.message, 'error');
            }
        } catch { msg("Failed to create folder", 'error'); }
        finally { setCreatingFolder(false); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("path", curPath);
            const d = await (await fetch("/api/server/files", { method: "POST", body: fd })).json();
            if (d.success) {
                msg("File uploaded successfully", 'success');
                fetchDir(curPath);
            } else {
                msg(d.message, 'error');
            }
        } catch { msg("Upload failed", 'error'); }
        finally { setUploading(false); if (uploadRef.current) uploadRef.current.value = ""; }
    };

    const handleDelete = async (fpath: string, isDirectory: boolean = false) => {
        if (!confirm(`Delete "${fpath.split('/').pop()}"? ${isDirectory ? "This will delete all contents." : ""}`)) return;
        setDeleting(fpath);
        try {
            const d = await (await fetch("/api/server/files", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: fpath })
            })).json();

            if (d.success) {
                msg("Deleted successfully", 'success');
                if (selFile === fpath) { setSelFile(null); setContent(""); }
                fetchDir(curPath);
            } else {
                msg(d.message, 'error');
            }
        } catch { msg("Delete failed", 'error'); }
        finally { setDeleting(null); }
    };

    const startRename = (f: FileItem) => {
        setRenamingItem(f.path);
        setRenameValue(f.name);
    };

    const handleRename = async (oldPath: string, newVal: string) => {
        const oldName = oldPath.split("/").pop();
        if (!newVal.trim() || newVal.trim() === oldName) { setRenamingItem(null); return; }
        const parentPath = oldPath.split("/").slice(0, -1).join("/");
        const newPath = parentPath ? `${parentPath}/${newVal.trim()}` : newVal.trim();
        try {
            const d = await (await fetch("/api/server/files", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oldPath, newPath })
            })).json();
            if (d.success) {
                msg("Renamed successfully", 'success');
                if (selFile === oldPath) setSelFile(newPath);
                fetchDir(curPath);
            } else {
                msg(d.message, 'error');
            }
        } catch { msg("Rename failed", 'error'); }
        finally { setRenamingItem(null); }
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        setPasting(true);
        const fileName = clipboard.path.split("/").pop() || "unknown";
        const newPath = curPath ? `${curPath}/${fileName}` : fileName;

        try {
            if (clipboard.isCut) {
                const d = await (await fetch("/api/server/files", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ oldPath: clipboard.path, newPath })
                })).json();
                if (d.success) {
                    msg("Pasted successfully", 'success');
                    setClipboard(null);
                    fetchDir(curPath);
                } else msg(d.message, 'error');
            } else {
                const d = await (await fetch("/api/server/files", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "copy", oldPath: clipboard.path, newPath })
                })).json();
                if (d.success) {
                    msg("Pasted successfully", 'success');
                    fetchDir(curPath);
                } else msg(d.message, 'error');
            }
        } catch { msg("Failed to paste", 'error'); }
        finally { setPasting(false); }
    };

    const isCutSrc = (p: string) => clipboard?.isCut && clipboard.path === p;

    if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}><div className="spinner spinner-lg"></div></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-elevated)", padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", width: "100%", overflowX: "auto" }}>
                    <i className="fa-solid fa-house" style={{ color: "var(--text-muted)", cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-bright)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"} onClick={() => nav("")}></i>
                    {crumbs.length > 0 && <span style={{ color: "var(--border)" }}>/</span>}
                    {crumbs.map((c, i) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                                style={{ color: "var(--text-normal)", cursor: "pointer", transition: "color 0.2s" }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-bright)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-normal)"}
                                onClick={() => nav(crumbs.slice(0, i + 1).join("/"))}
                            >
                                {c}
                            </span>
                            {i < crumbs.length - 1 && <span style={{ color: "var(--border)" }}>/</span>}
                        </span>
                    ))}
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    {clipboard && (
                        <button
                            onClick={handlePaste}
                            disabled={pasting}
                            className="btn btn-primary"
                            style={{ display: "flex", gap: "8px", alignItems: "center", backgroundColor: "var(--gold)" }}
                        >
                            {pasting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paste"></i>}
                            Paste ({clipboard.path.split('/').pop()})
                        </button>
                    )}

                    <button
                        onClick={() => setShowNewFolder(true)}
                        className="btn btn-secondary"
                        style={{ display: "flex", gap: "8px", alignItems: "center" }}
                    >
                        <i className="fa-solid fa-folder-plus"></i>New Folder
                    </button>
                    <button
                        onClick={() => uploadRef.current?.click()}
                        disabled={uploading}
                        className="btn btn-primary"
                        style={{ display: "flex", gap: "8px", alignItems: "center" }}
                    >
                        {uploading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-upload"></i>}
                        {uploading ? "Uploading..." : "Upload"}
                    </button>
                    <input ref={uploadRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
                </div>
            </div>

            <div className="card p-0 flex flex-col md:flex-row shadow-xl" style={{ minHeight: "600px", height: "calc(100vh - 200px)", overflow: "hidden" }}>
                {/* File List */}
                <div style={{ width: "350px", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-elevated)", flexShrink: 0 }}>
                    <div className="terminal-scroll" style={{ overflowY: "auto", flex: 1 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <tbody>
                                {curPath && (
                                    <tr style={{ cursor: "pointer", transition: "background 0.2s" }} className="hover:bg-[var(--bg-card)] group" onClick={up}>
                                        <td style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                                            <i className="fa-solid fa-level-up-alt" style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}></i>
                                            <span style={{ fontWeight: 500, color: "var(--text-normal)" }} className="group-hover:text-[var(--text-bright)]">..</span>
                                        </td>
                                        <td style={{ padding: "12px 16px", textAlign: "right" }}></td>
                                    </tr>
                                )}
                                {files.map((f) => {
                                    const isCut = isCutSrc(f.path);
                                    const isSelected = selFile === f.path;
                                    return (
                                        <tr
                                            key={f.path}
                                            style={{
                                                cursor: "pointer", transition: "background 0.2s",
                                                backgroundColor: isSelected ? "var(--bg-main)" : "transparent",
                                                borderLeft: `2px solid ${isSelected ? "var(--primary)" : "transparent"}`,
                                                opacity: isCut ? 0.4 : 1
                                            }}
                                            className="hover:bg-[var(--bg-main)] group"
                                        >
                                            <td
                                                style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}
                                                onClick={() => f.isDirectory ? nav(f.path) : open(f.path)}
                                            >
                                                <div style={{ filter: isSelected ? "drop-shadow(0 0 5px var(--primary-dim))" : "none" }}>
                                                    <FileIcon name={f.name} isDir={f.isDirectory} />
                                                </div>
                                                {renamingItem === f.path ? (
                                                    <input
                                                        type="text"
                                                        value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        onBlur={() => handleRename(f.path, renameValue)}
                                                        onKeyDown={e => { if (e.key === "Enter") handleRename(f.path, renameValue); if (e.key === "Escape") setRenamingItem(null); }}
                                                        className="form-input"
                                                        style={{ padding: "4px 8px", width: "100%" }}
                                                        autoFocus
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span
                                                        style={{ fontWeight: 500, color: isSelected ? "var(--text-bright)" : "var(--text-normal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                                        className="group-hover:text-[var(--text-bright)] transition-colors"
                                                        onDoubleClick={(e) => { e.stopPropagation(); startRename(f); }}
                                                    >
                                                        {f.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", opacity: 0, transition: "opacity 0.2s" }} className="group-hover:opacity-100">
                                                    <button onClick={(e) => { e.stopPropagation(); setClipboard({ path: f.path, isCut: false }); msg("Copied to clipboard", 'success'); }} className="btn btn-sm btn-secondary" style={{ padding: "4px 8px" }} title="Copy"><i className="fa-regular fa-copy"></i></button>
                                                    <button onClick={(e) => { e.stopPropagation(); startRename(f); }} className="btn btn-sm btn-secondary" style={{ padding: "4px 8px" }} title="Rename"><i className="fa-solid fa-pen"></i></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(f.path, f.isDirectory); }} disabled={deleting === f.path} className="btn btn-sm btn-danger" style={{ padding: "4px 8px" }} title="Delete">
                                                        {deleting === f.path ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-trash"></i>}
                                                    </button>
                                                </div>
                                                {!f.isDirectory && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }} className="group-hover:hidden">{fmtSize(f.size)}</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {files.length === 0 && (
                                    <tr><td colSpan={2} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>Empty directory</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* File Editor Pane */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "var(--bg-main)" }}>
                    {selFile ? (
                        <>
                            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", background: "var(--bg-elevated)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <FileIcon name={selFile.split('/').pop() || ""} isDir={false} />
                                    {renamingItem === selFile ? (
                                        <input
                                            type="text"
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            onBlur={() => handleRename(selFile, renameValue)}
                                            onKeyDown={e => { if (e.key === "Enter") handleRename(selFile, renameValue); if (e.key === "Escape") setRenamingItem(null); }}
                                            className="form-input"
                                            style={{ padding: "2px 8px", width: "200px" }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            style={{ fontWeight: 600, color: "var(--text-bright)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--border)", textUnderlineOffset: "4px" }}
                                            onDoubleClick={() => { setRenamingItem(selFile); setRenameValue(selFile.split('/').pop() || ""); }}
                                            title="Double-click to rename"
                                        >
                                            {selFile.split('/').pop()}
                                        </span>
                                    )}
                                    {changed && <span className="badge badge-warning" style={{ marginLeft: "8px" }}>Unsaved</span>}
                                </div>

                                {/* Header Action Toolbar */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--bg-main)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                    <button
                                        onClick={() => { setRenamingItem(selFile); setRenameValue(selFile.split('/').pop() || ""); }}
                                        className="btn btn-sm btn-secondary" style={{ border: "none" }} title="Rename"
                                    ><i className="fa-solid fa-pen" style={{ marginRight: "6px", opacity: 0.7 }}></i>Rename</button>

                                    <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border)" }}></div>

                                    <button
                                        onClick={() => { setClipboard({ path: selFile, isCut: true }); msg("Cut to clipboard", 'success'); }}
                                        className={`btn btn-sm ${isCutSrc(selFile) ? 'btn-primary' : 'btn-secondary'}`} style={{ border: "none" }} title="Cut"
                                    ><i className="fa-solid fa-scissors" style={{ marginRight: "6px", opacity: 0.7 }}></i>Cut</button>

                                    <button
                                        onClick={() => { setClipboard({ path: selFile, isCut: false }); msg("Copied to clipboard", 'success'); }}
                                        className="btn btn-sm btn-secondary" style={{ border: "none" }} title="Copy"
                                    ><i className="fa-regular fa-copy" style={{ marginRight: "6px", opacity: 0.7 }}></i>Copy</button>

                                    <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border)" }}></div>

                                    <button
                                        onClick={() => handleDelete(selFile, false)}
                                        disabled={deleting === selFile}
                                        className="btn btn-sm btn-secondary text-red-400 hover:text-red-300 hover:bg-red-500/10" style={{ border: "none" }} title="Delete"
                                    ><i className={`fa-solid ${deleting === selFile ? 'fa-spinner fa-spin' : 'fa-trash'}`} style={{ marginRight: "6px", opacity: 0.7 }}></i>Delete</button>

                                    <button
                                        onClick={save}
                                        disabled={!changed || saving}
                                        className="btn btn-sm btn-primary ml-2" style={{ padding: "6px 12px" }}
                                    >
                                        <i className={`fa-solid ${saving ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} style={{ marginRight: "6px" }}></i>
                                        {saving ? 'Saving...' : 'Save File'}
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                spellCheck={false}
                                className="terminal-scroll"
                                style={{ flex: 1, width: "100%", backgroundColor: "transparent", border: "none", color: "var(--text-bright)", fontFamily: "monospace", fontSize: "0.85rem", padding: "1.5rem", outline: "none", resize: "none", lineHeight: 1.6 }}
                            />
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", background: "radial-gradient(ellipse at center, var(--bg-elevated) 0%, transparent 70%)" }}>
                            <div style={{ width: "64px", height: "64px", borderRadius: "16px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.3))" }}>
                                <i className="fa-solid fa-file-code" style={{ fontSize: "1.5rem", color: "var(--primary)", opacity: 0.8 }}></i>
                            </div>
                            <h3 style={{ color: "var(--text-bright)", fontWeight: 500, margin: "0 0 4px 0" }}>No File Selected</h3>
                            <span style={{ fontSize: "0.9rem" }}>Click a file from the list to view and edit its contents</span>
                        </div>
                    )}
                </div>
            </div>

            {showNewFolder && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) setShowNewFolder(false); }}>
                    <div className="card" style={{ width: "90%", maxWidth: "400px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--primary-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <i className="fa-solid fa-folder-plus text-primary"></i>
                            </div>
                            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Create Folder</h3>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Folder Name</label>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); }}
                                placeholder="e.g. plugins, worlds..."
                                className="form-input"
                                style={{ width: "100%", padding: "10px 14px", fontSize: "1rem" }}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                            <button
                                onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                disabled={creatingFolder || !newFolderName.trim()}
                                className="btn btn-primary"
                            >
                                {creatingFolder ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>{toast.msg}</div>}
        </div>
    );
}
