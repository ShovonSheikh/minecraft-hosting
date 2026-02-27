"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface PluginInfo {
    name: string;
    size: number;
    enabled: boolean;
}

function formatBytes(b: number): string {
    if (b === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

export default function LocalModsPage() {
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const msg = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ msg: m, type: t });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchPlugins = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/server/plugins");
            const data = await res.json();
            setPlugins(data.plugins || []);
        } catch {
            msg("Failed to load local mods", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlugins();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file.name.endsWith(".jar")) {
            msg("Only .jar files are allowed", "error");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/server/plugins", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                msg(`Uploaded ${file.name}`, "success");
                fetchPlugins();
            } else {
                msg(data.message, "error");
            }
        } catch {
            msg("Upload failed", "error");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const togglePlugin = async (filename: string, enable: boolean) => {
        try {
            const res = await fetch("/api/server/plugins/toggle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, enable })
            });
            const data = await res.json();
            if (data.success) {
                fetchPlugins();
            } else {
                msg(data.message, "error");
            }
        } catch {
            msg("Failed to toggle mod", "error");
        }
    };

    const deletePlugin = async (filename: string) => {
        if (!confirm(`Permanently delete ${filename}?`)) return;
        try {
            const res = await fetch("/api/server/plugins", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename })
            });
            const data = await res.json();
            if (data.success) {
                msg(`Deleted ${filename}`, "success");
                fetchPlugins();
            } else {
                msg(data.message, "error");
            }
        } catch {
            msg("Failed to delete mod", "error");
        }
    };

    return (
        <div className="p-6">
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <Link href="/dashboard/plugins" style={{ color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <i className="fa-solid fa-arrow-left"></i> Back to Explorer
                        </Link>
                        <h2 className="page-title">Local Mods & Plugins</h2>
                        <p className="page-subtitle">Manage manually installed modifications</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                        {uploading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-upload"></i>}
                        Upload .jar
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".jar"
                        onChange={handleUpload}
                    />
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="spinner spinner-lg block mx-auto py-12"></div>
                ) : plugins.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                        <i className="fa-solid fa-folder-open" style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}></i>
                        <p>No local mods or plugins installed.</p>
                        <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>Upload a .jar file or install from the Modrinth Explorer.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
                                    <th style={{ padding: "1rem 0" }}>File Name</th>
                                    <th>Size</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plugins.map(p => (
                                    <tr key={p.name} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} className="hover:bg-[var(--bg-elevated)]">
                                        <td style={{ padding: "1rem 0", display: "flex", alignItems: "center", gap: "10px" }}>
                                            <i className="fa-solid fa-box-archive" style={{ color: p.enabled ? "var(--primary)" : "var(--text-muted)" }}></i>
                                            <span style={{ fontWeight: 500, color: p.enabled ? "var(--text-bright)" : "var(--text-muted)" }}>{p.name}</span>
                                        </td>
                                        <td style={{ color: "var(--text-normal)", fontSize: "0.9rem" }}>{formatBytes(p.size)}</td>
                                        <td>
                                            {p.enabled ? (
                                                <span className="badge badge-success">Enabled</span>
                                            ) : (
                                                <span className="badge badge-warning">Disabled</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                onClick={() => togglePlugin(p.name, !p.enabled)}
                                                className={`btn btn-sm ${p.enabled ? 'btn-secondary' : 'btn-primary'}`}
                                                style={{ marginRight: "8px", minWidth: "80px" }}
                                            >
                                                {p.enabled ? "Disable" : "Enable"}
                                            </button>
                                            <button
                                                onClick={() => deletePlugin(p.name)}
                                                className="btn btn-sm btn-danger"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>{toast.msg}</div>}
        </div>
    );
}
