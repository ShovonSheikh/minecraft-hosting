"use client";

import { useState, useEffect, useCallback } from "react";

interface LoaderInfo { type: string; jarFile: string; size: number; }

const LOADERS = [
    { id: "vanilla", name: "Vanilla", icon: "🟩", desc: "Official Mojang server. No mods support.", color: "--emerald" },
    { id: "paper", name: "Paper", icon: "📄", desc: "High performance Bukkit/Spigot fork. Most popular.", color: "--emerald" },
    { id: "fabric", name: "Fabric", icon: "🧵", desc: "Lightweight modding toolchain. Fast updates.", color: "--amethyst" },
    { id: "forge", name: "Forge", icon: "🔨", desc: "The original modding platform. Huge mod library.", color: "--gold" },
    { id: "quilt", name: "Quilt", icon: "🪡", desc: "Fabric fork focused on inclusivity and modularity.", color: "--lapis" },
];

function formatBytes(b: number): string {
    if (b === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + s[i];
}

export default function LoaderPage() {
    const [loader, setLoader] = useState<LoaderInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchLoader = useCallback(async () => {
        try {
            const res = await fetch("/api/server/loader");
            const data = await res.json();
            setLoader(data.loader || null);
        } catch { /* silently fail */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLoader(); }, [fetchLoader]);

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2>◈ Server Loader</h2>
                        <p>Choose your server software and modding platform</p>
                    </div>
                    {loader && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="status-badge online" style={{ fontSize: 12 }}>
                                Active: {loader.type.toUpperCase()}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                                {loader.jarFile} · {formatBytes(loader.size)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Current loader info */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                        {LOADERS.find(l => l.id === loader?.type)?.icon || "❓"}
                    </div>
                    <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-bright)" }}>
                            Currently Running: {LOADERS.find(l => l.id === loader?.type)?.name || loader?.type || "Unknown"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                            {LOADERS.find(l => l.id === loader?.type)?.desc || "Unknown server type"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loader cards */}
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--text-bright)", marginBottom: 16, letterSpacing: "0.02em" }}>
                AVAILABLE LOADERS
            </h3>
            <div className="loader-grid">
                {LOADERS.map((l, i) => (
                    <div
                        key={l.id}
                        className={`loader-card ${loader?.type === l.id ? "active" : ""}`}
                        style={{ animationDelay: `${i * 0.05}s` }}
                    >
                        <div className="loader-icon">{l.icon}</div>
                        <div className="loader-name">{l.name}</div>
                        <div className="loader-desc">{l.desc}</div>
                        {loader?.type === l.id ? (
                            <div style={{ marginTop: 16 }}>
                                <span className="status-badge online" style={{ fontSize: 11 }}>
                                    <span className="status-dot online" /> Active
                                </span>
                            </div>
                        ) : (
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}
                                onClick={() => alert(`To switch to ${l.name}, download the server JAR from the official website, rename it to server.jar, replace the existing one in the minecraft/ directory, and restart the server.`)}>
                                Switch to {l.name}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Instructions */}
            <div className="card" style={{ marginTop: 24 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--text-bright)", marginBottom: 10, letterSpacing: "0.02em" }}>
                    HOW TO SWITCH LOADERS
                </h3>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                    <p>1. <strong>Stop the server</strong> from the Dashboard.</p>
                    <p>2. Download the desired server JAR from its official website.</p>
                    <p>3. Use the <strong>File Manager</strong> or manually replace <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>server.jar</code> in the <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>minecraft/</code> directory.</p>
                    <p>4. <strong>Start the server</strong> — it will auto-detect the new loader.</p>
                </div>
            </div>
        </>
    );
}
