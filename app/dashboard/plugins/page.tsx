"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ModrinthProject {
    project_id: string;
    project_type: string;
    slug: string;
    title: string;
    description: string;
    categories: string[];
    display_categories: string[];
    client_side: string;
    server_side: string;
    downloads: number;
    icon_url: string;
    author: string;
    date_modified: string;
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

export default function PluginsPage() {
    const [activeTab, setActiveTab] = useState("mod");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Filters
    const [activeLoaders, setActiveLoaders] = useState<string[]>(["fabric", "forge", "neoforge", "quilt"]);
    const [mcVersion, setMcVersion] = useState("1.21.1");

    const [results, setResults] = useState<ModrinthProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const msg = (m: string, t: 'success' | 'error' = 'success') => {
        setToast({ msg: m, type: t });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const fetchModrinth = useCallback(async () => {
        setLoading(true);
        try {
            const loadersParam = activeLoaders.length > 0 ? activeLoaders.join(",") : "fabric,forge,neoforge,quilt";
            const url = `/api/server/modrinth/search?q=${encodeURIComponent(debouncedQuery)}&type=${activeTab}&loaders=${loadersParam}&version=${mcVersion}&limit=20`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.success && json.data && json.data.hits) {
                setResults(json.data.hits);
            } else {
                setResults([]);
            }
        } catch (e) {
            console.error(e);
            msg("Failed to search Modrinth", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedQuery, activeTab, activeLoaders, mcVersion]);

    useEffect(() => {
        fetchModrinth();
    }, [fetchModrinth]);

    const handleInstall = async (project: ModrinthProject) => {
        setInstalling(project.project_id);
        try {
            const res = await fetch("/api/server/modrinth/install", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: project.project_id,
                    version: mcVersion,
                    loaders: activeLoaders,
                    type: activeTab
                })
            });
            const data = await res.json();

            if (data.success) {
                msg(`Successfully downloaded ${project.title}`, "success");
            } else {
                msg(`Installer Error: ${data.message}`, "error");
            }
        } catch (e: any) {
            msg(`Failed to connect to installer: ${e.message}`, "error");
        } finally {
            setInstalling(null);
        }
    };

    const toggleLoader = (loader: string) => {
        if (activeLoaders.includes(loader)) {
            if (activeLoaders.length > 1) {
                setActiveLoaders(activeLoaders.filter(l => l !== loader));
            }
        } else {
            setActiveLoaders([...activeLoaders, loader]);
        }
    };

    const TABS = [
        { id: "mod", name: "Mods" },
        { id: "modpack", name: "Modpacks" },
        { id: "resourcepack", name: "Resource Packs" },
        { id: "shader", name: "Shaders" },
        { id: "datapack", name: "Data Packs" }
    ];

    const LOADERS_CONFIG = [
        { id: "fabric", name: "Fabric", icon: "fa-feather", color: "var(--emerald)" },
        { id: "forge", name: "Forge", icon: "fa-hammer", color: "var(--gold)" },
        { id: "neoforge", name: "NeoForge", icon: "fa-fire", color: "var(--amber)" },
        { id: "quilt", name: "Quilt", icon: "fa-layer-group", color: "var(--lapis)" },
        { id: "paper", name: "Paper", icon: "fa-bolt", color: "var(--text-bright)" },
        { id: "purpur", name: "Purpur", icon: "fa-wand-magic-sparkles", color: "var(--amethyst)" }
    ];

    return (
        <div className="p-6">
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2 className="page-title">Plugin Explorer</h2>
                        <p className="page-subtitle">Install mods, plugins, and server packages from Modrinth</p>
                    </div>
                    <Link href="/dashboard/plugins/local" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <i className="fa-solid fa-folder-open"></i> Local Mods
                    </Link>
                </div>
            </div>

            <div className="card p-0" style={{ display: "flex", height: "calc(100vh - 200px)", minHeight: "600px", overflow: "hidden" }}>

                {/* Main Results Listing */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>

                    {/* Search & Tabs Header */}
                    <div style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>

                        <div className="custom-select-wrapper" style={{ width: "160px" }}>
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value)}
                                className="form-input"
                                style={{ width: "100%", paddingRight: "30px", backgroundColor: "var(--bg-main)", cursor: "pointer" }}
                            >
                                {TABS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div style={{ flex: 1, position: "relative" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}></i>
                            <input
                                type="text"
                                className="form-input"
                                style={{ width: "100%", paddingLeft: "36px", backgroundColor: "var(--bg-main)" }}
                                placeholder="Search Modrinth..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="terminal-scroll" style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
                        {loading ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", gap: "1rem" }}>
                                <div className="spinner spinner-lg"></div>
                                <span style={{ fontSize: "0.9rem", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>Querying Modrinth API</span>
                            </div>
                        ) : results.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.5 }}>
                                <i className="fa-solid fa-ghost" style={{ fontSize: "3rem", marginBottom: "1rem" }}></i>
                                <p>No {activeTab}s found matching your criteria</p>
                            </div>
                        ) : (
                            results.map((project) => (
                                <div key={project.project_id} style={{
                                    display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1rem",
                                    borderBottom: "1px solid var(--border)", transition: "background 0.2s"
                                }} className="hover:bg-[var(--bg-elevated)]">

                                    <div style={{ width: "64px", height: "64px", borderRadius: "12px", overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-main)", border: "1px solid var(--border)" }}>
                                        {project.icon_url ? (
                                            <img src={project.icon_url} alt={project.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="fa-solid fa-puzzle-piece" style={{ color: "var(--text-muted)", fontSize: "1.5rem" }}></i></div>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-bright)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.title}</h3>
                                        </div>

                                        <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-normal)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{project.description}</p>

                                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                <i className="fa-solid fa-user" style={{ fontSize: "10px" }}></i> {project.author}
                                            </span>
                                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                <i className="fa-solid fa-download" style={{ fontSize: "10px" }}></i> {formatNumber(project.downloads)}
                                            </span>
                                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                <i className="fa-regular fa-clock" style={{ fontSize: "10px" }}></i> {timeAgo(project.date_modified)}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-end" }}>
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                            {LOADERS_CONFIG.filter(lc => project.categories?.includes(lc.id)).map(lc => (
                                                <div key={lc.id} className="badge" style={{ backgroundColor: "var(--bg-main)", color: "var(--text-bright)", gap: "4px", padding: "4px 8px" }} title={lc.name}>
                                                    <i className={`fa-solid ${lc.icon} text-[10px]`} style={{ color: lc.color }}></i>
                                                    {lc.name}
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <a
                                                href={`https://modrinth.com/${project.project_type}/${project.slug}`}
                                                target="_blank"
                                                className="btn btn-secondary"
                                                style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                                            >
                                                View
                                            </a>
                                            <button
                                                onClick={() => handleInstall(project)}
                                                disabled={installing === project.project_id}
                                                className="btn btn-primary"
                                                style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", minWidth: "90px" }}
                                            >
                                                {installing === project.project_id ? (
                                                    <><i className="fa-solid fa-circle-notch fa-spin"></i></>
                                                ) : (
                                                    <><i className="fa-solid fa-download" style={{ marginRight: "6px" }}></i>Install</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Sidebar Filters */}
                <div style={{ width: "260px", backgroundColor: "var(--bg-elevated)", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", gap: "8px" }}>
                        <div style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "var(--primary-dim)", color: "var(--primary)", border: "1px solid var(--primary)", textAlign: "center", fontWeight: "bold", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                            <i className="fa-solid fa-leaf"></i> Modrinth
                        </div>
                    </div>

                    <div className="terminal-scroll" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", flex: 1 }}>

                        {/* Game Version Filter */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Game Version</label>
                            <div className="custom-select-wrapper">
                                <select
                                    value={mcVersion}
                                    onChange={(e) => setMcVersion(e.target.value)}
                                    className="form-input"
                                    style={{ width: "100%", backgroundColor: "var(--bg-main)" }}
                                >
                                    <option value="1.21.1">1.21.1</option>
                                    <option value="1.21">1.21</option>
                                    <option value="1.20.4">1.20.4</option>
                                    <option value="1.20.1">1.20.1</option>
                                    <option value="1.19.4">1.19.4</option>
                                    <option value="1.19.2">1.19.2</option>
                                    <option value="1.18.2">1.18.2</option>
                                    <option value="1.16.5">1.16.5</option>
                                    <option value="1.12.2">1.12.2</option>
                                    <option value="1.8.9">1.8.9</option>
                                </select>
                            </div>
                        </div>

                        {/* Mod Loaders Filter */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", display: "flex", justifyContent: "space-between" }}>
                                Loaders <span className="badge" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{activeLoaders.length}</span>
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                {LOADERS_CONFIG.map(loader => {
                                    const isActive = activeLoaders.includes(loader.id);
                                    return (
                                        <button
                                            key={loader.id}
                                            onClick={() => toggleLoader(loader.id)}
                                            style={{
                                                padding: "0.6rem 0.5rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid",
                                                transition: "all 0.2s", display: "flex", alignItems: "center", gap: "6px",
                                                background: isActive ? "var(--primary-dim)" : "var(--bg-main)",
                                                borderColor: isActive ? "var(--primary)" : "var(--border)",
                                                color: isActive ? "var(--text-bright)" : "var(--text-normal)"
                                            }}
                                        >
                                            <div style={{
                                                width: "14px", height: "14px", borderRadius: "4px", border: "1px solid",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                background: isActive ? "var(--primary)" : "transparent",
                                                borderColor: isActive ? "var(--primary)" : "var(--border)"
                                            }}>
                                                {isActive && <i className="fa-solid fa-check" style={{ fontSize: "8px", color: "#fff" }}></i>}
                                            </div>
                                            {loader.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>{toast.msg}</div>}
        </div>
    );
}
