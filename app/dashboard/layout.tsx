"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const NAV = [
    {
        label: "Server",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: "⚡" },
            { href: "/dashboard/console", label: "Console", icon: "▸" },
            { href: "/dashboard/players", label: "Players", icon: "◎" },
        ],
    },
    {
        label: "Management",
        items: [
            { href: "/dashboard/files", label: "Files", icon: "▤" },
            { href: "/dashboard/plugins", label: "Plugins", icon: "◆" },
            { href: "/dashboard/worlds", label: "Worlds", icon: "◐" },
            { href: "/dashboard/backups", label: "Backups", icon: "⟲" },
        ],
    },
    {
        label: "Config",
        items: [
            { href: "/dashboard/domains", label: "Domains", icon: "🌐" },
            { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
            { href: "/dashboard/schedule", label: "Schedule", icon: "◷" },
            { href: "/dashboard/security", label: "Security", icon: "◈" },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [status, setStatus] = useState<{ running: boolean; playerCount: number; version: string | null }>({
        running: false, playerCount: 0, version: null,
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [domainConfig, setDomainConfig] = useState<{ serverIp: string; serverPort: number } | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/server/status");
            const data = await res.json();
            setStatus({ running: data.running, playerCount: data.playerCount, version: data.version });
        } catch { /* */ }
    }, []);

    const fetchDomain = useCallback(async () => {
        try {
            const res = await fetch("/api/server/domains");
            const data = await res.json();
            setDomainConfig(data.config);
        } catch { /* */ }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchDomain();
        const i = setInterval(fetchStatus, 5000);
        return () => clearInterval(i);
    }, [fetchStatus, fetchDomain]);

    // Auto-close mobile drawer on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    const connectionAddr = domainConfig?.serverIp
        ? `${domainConfig.serverIp}${domainConfig.serverPort !== 25565 ? `:${domainConfig.serverPort}` : ""}`
        : null;

    return (
        <div className="app-shell">
            <div className="mobile-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="sidebar-logo">M</div>
                    <div className="sidebar-brand" style={{ display: "block" }}>
                        <h1 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-bright)", letterSpacing: "-0.04em", lineHeight: 1.2 }}>MCPanel</h1>
                    </div>
                </div>
                <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
            </div>

            <div className={`mobile-overlay ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />

            <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">M</div>
                    <div className="sidebar-brand">
                        <h1>MCPanel</h1>
                        <span>Control Panel</span>
                    </div>
                </div>

                <div className="sidebar-status">
                    <div className={`status-dot ${status.running ? "on" : "off"}`} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>
                            {status.running ? "Online" : "Offline"}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>
                            {status.running
                                ? `${status.playerCount} player${status.playerCount !== 1 ? "s" : ""}${status.version ? ` · ${status.version}` : ""}`
                                : "Server stopped"}
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV.map((section) => (
                        <div key={section.label}>
                            <div className="nav-group-label">{section.label}</div>
                            {section.items.map((item) => {
                                const active = item.href === "/dashboard"
                                    ? pathname === "/dashboard"
                                    : pathname.startsWith(item.href);
                                return (
                                    <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}>
                                        <span className="nav-icon">{item.icon}</span>
                                        <span className="nav-text">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">MCPanel v3.0</div>
            </aside>

            <main className="main-content">
                {/* ── Top Header Bar (Reference-style) ── */}
                <div className="top-header">
                    <div className="top-header-left">
                        <span className="top-header-title">Minecraft Server</span>
                        <span className="top-header-separator">•</span>
                        <div className="top-header-status">
                            <div className={`status-dot ${status.running ? "on" : "off"}`} />
                            <span style={{ color: status.running ? "var(--teal)" : "var(--coral)", fontWeight: 600 }}>
                                {status.running ? "Online" : "Offline"}
                            </span>
                        </div>
                        {connectionAddr && (
                            <>
                                <span className="top-header-separator">•</span>
                                <span className="top-header-ip" onClick={() => {
                                    navigator.clipboard?.writeText(connectionAddr);
                                }}>
                                    {connectionAddr} 📋
                                </span>
                            </>
                        )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                            {status.version || ""}
                        </span>
                    </div>
                </div>

                {children}
            </main>
        </div>
    );
}
