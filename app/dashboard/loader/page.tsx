"use client";

import { useState, useEffect } from "react";

interface Loader {
    id: string;
    name: string;
    version: string;
    installedAt: string;
}

const AVAILABLE_LOADERS = [
    { id: 'paper', name: 'Paper', desc: 'High performance fork of Spigot. Best for most servers.', type: 'server', icon: 'fa-bolt' },
    { id: 'vanilla', name: 'Vanilla', desc: 'The official standard server software by Mojang.', type: 'server', icon: 'fa-cubes' },
    { id: 'fabric', name: 'Fabric', desc: 'Lightweight and modular mod loader. Very popular.', type: 'modded', icon: 'fa-feather' },
    { id: 'forge', name: 'Forge', desc: 'The classic mod loader. Required for many older mods.', type: 'modded', icon: 'fa-hammer' },
    { id: 'purpur', name: 'Purpur', desc: 'Drop-in replacement for Paper with more features.', type: 'server', icon: 'fa-wand-magic-sparkles' },
    { id: 'quilt', name: 'Quilt', desc: 'Modern fork of Fabric with a focus on ecosystem.', type: 'modded', icon: 'fa-layer-group' }
];

export default function LoaderPage() {
    const [current, setCurrent] = useState<Loader | null>(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

    useEffect(() => {
        const fetchCurrent = async () => {
            try {
                const res = await fetch("/api/server/loader");
                const data = await res.json();
                setCurrent(data.loader);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchCurrent();
    }, []);

    const handleInstall = async (lId: string, lName: string) => {
        if (!confirm(`Are you sure you want to install ${lName}? This will replace your current server.jar.`)) return;
        setInstalling(lId);
        try {
            const res = await fetch("/api/server/loader/install", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loaderId: lId, loaderName: lName })
            });
            const data = await res.json();
            msg(data.message);
            if (data.success) {
                // Refresh current loader state manually to reflect immediate change
                setCurrent({
                    id: lId,
                    name: lName,
                    version: "Latest",
                    installedAt: new Date().toISOString()
                });
            }
        } catch (e: any) {
            msg(`Installation failed: ${e.message}`);
        } finally {
            setInstalling(null);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="spinner spinner-lg" /></div>;

    return (
        <div className="p-6">
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2 className="page-title">Server Loader</h2>
                        <p className="page-subtitle">Manage server software and version</p>
                    </div>
                    {current && (
                        <div className="badge badge-success" style={{ fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                            Currently Running: {current.name} {current.version}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid">
                {AVAILABLE_LOADERS.map(loader => {
                    const isCurrent = current?.id === loader.id;
                    const isInstalling = installing === loader.id;

                    return (
                        <div key={loader.id} className="card" style={{
                            borderColor: isCurrent ? 'var(--primary)' : 'var(--border)',
                            backgroundColor: isCurrent ? 'rgba(248, 184, 78, 0.02)' : 'var(--bg-card)'
                        }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '8px',
                                        backgroundColor: isCurrent ? 'rgba(248, 184, 78, 0.1)' : 'var(--bg-elevated)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isCurrent ? 'var(--primary)' : 'var(--text-muted)'
                                    }}>
                                        <i className={`fa-solid ${loader.icon} fa-lg`}></i>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: isCurrent ? 'var(--primary)' : 'var(--text-bright)' }}>
                                                {loader.name}
                                            </h3>
                                            <span className={`badge ${loader.type === 'modded' ? 'badge-warning' : 'badge-info'}`} style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                                                {loader.type}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--text-normal)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                            {loader.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                                {isCurrent ? (
                                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Installed {new Date(current.installedAt).toLocaleDateString()}
                                        </span>
                                        <button className="btn btn-secondary" disabled>Active</button>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleInstall(loader.id, loader.name)}
                                        disabled={installing !== null}
                                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                    >
                                        {isInstalling ? (
                                            <>
                                                <i className="fa-solid fa-circle-notch fa-spin"></i> Downloading...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-download"></i> Install Latest
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
