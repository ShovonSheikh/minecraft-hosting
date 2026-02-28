"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const NAV = [
    {
        label: "Management",
        items: [
            { href: "/dashboard", label: "Overview", icon: "fa-solid fa-chart-pie" },
            { href: "/dashboard/terminal", label: "Terminal", icon: "fa-solid fa-terminal" },
            { href: "/dashboard/files", label: "File Manager", icon: "fa-solid fa-folder-open" },
            { href: "/dashboard/players", label: "Players", icon: "fa-solid fa-users" },
        ],
    },
    {
        label: "Configuration",
        items: [
            { href: "/dashboard/plugins", label: "Plugins/Mods", icon: "fa-solid fa-puzzle-piece" },
            { href: "/dashboard/domains", label: "Domains", icon: "fa-solid fa-globe" },
            { href: "/dashboard/schedule", label: "Schedule", icon: "fa-solid fa-clock" },
            { href: "/dashboard/security", label: "Security", icon: "fa-solid fa-shield-halved" },
            { href: "/dashboard/worlds", label: "Worlds", icon: "fa-solid fa-earth-americas" },
            { href: "/dashboard/backups", label: "Backups", icon: "fa-solid fa-floppy-disk" },
            { href: "/dashboard/settings", label: "Settings", icon: "fa-solid fa-gear" },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [status, setStatus] = useState<{ running: boolean; playerCount: number; version: string | null }>({
        running: false, playerCount: 0, version: null,
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [domainConfig, setDomainConfig] = useState<{ serverIp: string; serverPort: number; customDomain: string } | null>(null);

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
        ? `${domainConfig.customDomain || domainConfig.serverIp}${domainConfig.serverPort !== 25565 ? `:${domainConfig.serverPort}` : ""}`
        : null;

    return (
        <div className="bg-[#090A0C] text-[#B9C1D1] font-sans fixed inset-0 flex overflow-hidden selection:bg-[#F8B84E]/30">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`w-64 bg-[#121418] border-r border-[#333947] flex flex-col ${mobileOpen ? 'fixed inset-y-0 left-0 animate-slide-right' : 'hidden'} md:flex transition-all z-30`}>
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-[#333947] shrink-0">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-[#E09030] to-[#F8B84E] flex items-center justify-center mr-3 shadow-lg shadow-[#F8B84E]/20 text-[#090A0C]">
                        <i className="fa-solid fa-cube text-[16px]"></i>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-[#FFFFFF]">MCPanel</span>
                </div>

                {/* Nav Links */}
                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {NAV.map((section, idx) => (
                        <div key={section.label} className={idx > 0 ? "pt-4 pb-2" : ""}>
                            <p className="px-3 text-xs font-semibold text-[#828D9F] uppercase tracking-wider mb-2">{section.label}</p>

                            {section.items.map((item) => {
                                const active = item.href === "/dashboard"
                                    ? pathname === "/dashboard"
                                    : pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-link flex items-center px-3 py-2.5 rounded-lg group transition-colors ${active
                                            ? "bg-[#F8B84E]/10 text-[#F8B84E]"
                                            : "text-[#B9C1D1] hover:text-[#FFFFFF] hover:bg-[#1A1D24]/80"
                                            }`}
                                    >
                                        <i className={`${item.icon} w-5 text-center mr-3 ${active ? "text-[#F8B84E]" : ""}`}></i>
                                        <span className="font-medium flex-1">{item.label}</span>
                                        {item.href === "/dashboard/players" && (
                                            <span className="bg-[#1A1D24] border border-[#333947] text-xs py-0.5 px-2 rounded-full text-[#B9C1D1]">
                                                {status.playerCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative min-w-0 overflow-hidden">

                {/* Top Header */}
                <header className="h-16 bg-[#1A1D24]/80 backdrop-blur-md border-b border-[#333947] flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 w-full">
                    <div className="flex items-center gap-4 min-w-0">
                        <button className="md:hidden text-[#B9C1D1] hover:text-[#FFFFFF]" onClick={() => setMobileOpen(true)}>
                            <i className="fa-solid fa-bars text-xl"></i>
                        </button>

                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-[#FFFFFF] leading-tight truncate">Minecraft Server</h1>
                            <div className="flex items-center gap-2 text-xs text-[#828D9F] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className={`flex items-center gap-1.5 ${status.running ? "text-[#36D7B7]" : "text-[#FF6B6B]"} font-medium`}>
                                    <span className="relative flex h-2 w-2 shrink-0">
                                        {status.running && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#36D7B7] opacity-75"></span>}
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${status.running ? "bg-[#36D7B7]" : "bg-[#FF6B6B]"}`}></span>
                                    </span>
                                    {status.running ? "Online" : "Offline"}
                                </span>
                                {connectionAddr && (
                                    <>
                                        <span className="hidden sm:inline">&bull;</span>
                                        <span
                                            className="hidden sm:flex items-center gap-1 hover:text-[#FFFFFF] cursor-pointer transition-colors truncate"
                                            onClick={() => navigator.clipboard.writeText(connectionAddr)}
                                        >
                                            {connectionAddr} <i className="fa-regular fa-copy ml-1"></i>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <div className="text-xs text-[#828D9F] font-mono hidden sm:block">
                            {status.version || "Vanilla"}
                        </div>
                        <button className="w-8 h-8 rounded-full bg-[#121418] border border-[#333947] flex items-center justify-center hover:bg-[#1A1D24] transition-colors">
                            <i className="fa-solid fa-bell text-[#B9C1D1] text-sm"></i>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-[#090A0C] border-2 border-[#E09030] overflow-hidden cursor-pointer flex items-center justify-center">
                            <i className="fa-solid fa-user text-[#B9C1D1] text-sm hidden"></i>
                            <img src={`https://mc-heads.net/avatar/Steve/32`} alt="User" className="w-full h-full object-cover rendering-pixelated" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto w-full relative">
                    {children}
                </div>
            </main>
        </div>
    );
}
