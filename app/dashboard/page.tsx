"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function DashboardClient() {
    const [status, setStatus] = useState({ running: false, playerCount: 0 });
    const [resources, setResources] = useState({
        cpuPercent: 0,
        memoryUsage: "0.0",
        memoryLimit: "8.0",
        memoryPercent: 0,
        storageUsage: "12.4", // Static example matched to HTML
        storageLimit: "25.0",
        storagePercent: 49,
        netIn: "0.0",
        netOut: "0.0"
    });
    const [players, setPlayers] = useState<any[]>([]);
    const [isActioning, setIsActioning] = useState<string | null>(null);

    // Live console state
    const [logs, setLogs] = useState<string[]>([]);
    const [commandInput, setCommandInput] = useState("");
    const terminalRef = useRef<HTMLDivElement>(null);
    const [isAutoScroll, setIsAutoScroll] = useState(true);

    // Initial log fetch just to populate
    useEffect(() => {
        const fetchInitialLogs = async () => {
            try {
                const res = await fetch("/api/server/logs?lines=50");
                const data = await res.json();
                if (data.logs) {
                    setLogs(data.logs.split("\n").filter((l: string) => l.trim()));
                }
            } catch { /* */ }
        };
        fetchInitialLogs();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch("/api/server/status");
            const data = await res.json();
            setStatus({ running: data.running, playerCount: data.playerCount });
            if (data.players) setPlayers(data.players);

            // Simulating network inbound/outbound slightly fluctuating
            setResources(prev => ({
                ...prev,
                netIn: (Math.random() * 2 + 0.5).toFixed(1),
                netOut: (Math.random() * 1.5 + 0.2).toFixed(1)
            }));
        } catch { /* */ }
    };

    const fetchResources = async () => {
        try {
            const res = await fetch("/api/server/resources");
            const data = await res.json();
            setResources(prev => {
                const cpu = typeof data.cpu === 'number' ? data.cpu : 0;
                const memUsage = typeof data.memory === 'string' ? data.memory : "0.0";
                const memLimit = parseFloat(prev.memoryLimit) || 8.0;
                const memPercent = (parseFloat(memUsage) / memLimit) * 100;

                return {
                    ...prev,
                    cpuPercent: cpu,
                    memoryUsage: memUsage,
                    memoryPercent: isNaN(memPercent) ? 0 : memPercent
                };
            });
        } catch { /* */ }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch("/api/server/logs?lines=20");
            const data = await res.json();
            if (data.logs) {
                setLogs(data.logs.split("\n").filter((l: string) => l.trim()));
            }
        } catch { /* */ }
    };

    useEffect(() => {
        fetchStatus();
        fetchResources();

        const i1 = setInterval(fetchStatus, 5000);
        const i2 = setInterval(fetchResources, 3000);
        const i3 = setInterval(fetchLogs, 2000);

        return () => { clearInterval(i1); clearInterval(i2); clearInterval(i3); };
    }, []);

    // Auto-scroll terminal
    useEffect(() => {
        if (isAutoScroll && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs, isAutoScroll]);

    const handleAction = async (action: string) => {
        setIsActioning(action);
        try {
            await fetch(`/api/server/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            setTimeout(fetchStatus, 2000);
        } catch { /* */ }
        finally {
            setIsActioning(null);
        }
    };

    const handleCommand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commandInput.trim()) return;

        const cmd = commandInput.trim();
        setCommandInput("");

        try {
            await fetch("/api/server/command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: cmd })
            });
            setTimeout(fetchLogs, 500);
        } catch { /* */ }
    };

    const formatLog = (log: string) => {
        // Simple colorization for info/warn/error
        if (log.includes("WARN")) return <span className="text-[#F8B84E]">{log}</span>;
        if (log.includes("ERROR") || log.includes("Exception")) return <span className="text-[#FF6B6B]">{log}</span>;
        if (log.includes("Server thread/INFO")) return <span className="text-[#B9C1D1]">{log}</span>;
        return <span className="text-[#828D9F]">{log}</span>;
    };

    return (
        <div id="page-overview" className="page-section max-w-7xl mx-auto space-y-6 block p-6">

            {/* Quick Actions / Power Panel */}
            <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-[#FFFFFF] font-semibold">Power Controls</h2>
                    <p className="text-sm text-[#828D9F]">Manage your server's power state.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => handleAction("start")}
                        disabled={isActioning !== null || status.running}
                        className={`flex-1 sm:flex-none px-4 py-2 bg-[#36D7B7] hover:bg-[#36D7B7]/80 text-[#090A0C] font-medium rounded-lg ${status.running ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-[#36D7B7]/20'} transition-all flex items-center justify-center gap-2`}
                    >
                        {isActioning === "start" ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-play text-sm"></i>} Start
                    </button>
                    <button
                        onClick={() => handleAction("restart")}
                        disabled={isActioning !== null || !status.running}
                        className={`flex-1 sm:flex-none px-4 py-2 bg-[#4299E1] hover:bg-[#4299E1]/80 text-[#FFFFFF] font-medium rounded-lg ${!status.running ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-[#4299E1]/20'} transition-all flex items-center justify-center gap-2`}
                    >
                        {isActioning === "restart" ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-rotate-right text-sm"></i>} Restart
                    </button>
                    <button
                        onClick={() => handleAction("stop")}
                        disabled={isActioning !== null || !status.running}
                        className={`flex-1 sm:flex-none px-4 py-2 bg-[#FF6B6B] hover:bg-[#FF6B6B]/80 text-[#FFFFFF] font-medium rounded-lg ${!status.running ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-[#FF6B6B]/20'} transition-all flex items-center justify-center gap-2`}
                    >
                        {isActioning === "stop" ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-power-off text-sm"></i>} Stop
                    </button>
                </div>
            </div>

            {/* Resource Metrics (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

                {/* CPU Card */}
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-[#B9C1D1]">
                            <i className="fa-solid fa-microchip"></i>
                            <span className="text-sm font-medium">CPU Usage</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${resources.cpuPercent > 80 ? 'text-[#FF6B6B] bg-[#FF6B6B]/10' : resources.cpuPercent > 50 ? 'text-[#F8B84E] bg-[#F8B84E]/10' : 'text-[#36D7B7] bg-[#36D7B7]/10'}`}>
                            {resources.cpuPercent > 80 ? 'Critical' : resources.cpuPercent > 50 ? 'High' : 'Normal'}
                        </span>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl font-bold text-[#FFFFFF]">{resources.cpuPercent.toFixed(1)}</span>
                        <span className="text-[#828D9F] font-medium mb-1">%</span>
                    </div>
                    <div className="w-full h-2 bg-[#121418] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${resources.cpuPercent > 80 ? 'bg-[#FF6B6B]' : resources.cpuPercent > 50 ? 'bg-[#F8B84E]' : 'bg-[#4299E1]'}`}
                            style={{ width: `${Math.min(resources.cpuPercent, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* RAM Card */}
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-[#B9C1D1]">
                            <i className="fa-solid fa-memory"></i>
                            <span className="text-sm font-medium">Memory</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${resources.memoryPercent > 80 ? 'text-[#FF6B6B] bg-[#FF6B6B]/10' : resources.memoryPercent > 60 ? 'text-[#F8B84E] bg-[#F8B84E]/10' : 'text-[#36D7B7] bg-[#36D7B7]/10'}`}>
                            {resources.memoryPercent > 80 ? 'Critical' : resources.memoryPercent > 60 ? 'High' : 'Normal'}
                        </span>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl font-bold text-[#FFFFFF]">{resources.memoryUsage}</span>
                        <span className="text-[#828D9F] font-medium mb-1">/ {resources.memoryLimit} GB</span>
                    </div>
                    <div className="w-full h-2 bg-[#121418] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${resources.memoryPercent > 80 ? 'bg-[#FF6B6B]' : resources.memoryPercent > 60 ? 'bg-[#F8B84E]' : 'bg-[#E09030]'}`}
                            style={{ width: `${Math.min(resources.memoryPercent, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Storage Card */}
                <div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-[#B9C1D1]">
                            <i className="fa-solid fa-hard-drive"></i>
                            <span className="text-sm font-medium">Storage (NVMe)</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl font-bold text-[#FFFFFF]">{resources.storageUsage}</span>
                        <span className="text-[#828D9F] font-medium mb-1">/ {resources.storageLimit} GB</span>
                    </div>
                    <div className="w-full h-2 bg-[#121418] rounded-full overflow-hidden">
                        <div className="h-full bg-[#6B46C1] rounded-full" style={{ width: `${resources.storagePercent}%` }}></div>
                    </div>
                </div >

                {/* Network Card */}
                < div className="bg-[#1A1D24] border border-[#333947] rounded-xl p-5" >
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-[#B9C1D1]">
                            <i className="fa-solid fa-network-wired"></i>
                            <span className="text-sm font-medium">Network</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <span className="text-xs text-[#828D9F] block mb-1">Inbound <i className="fa-solid fa-arrow-down text-[#36D7B7]"></i></span>
                            <span className="text-lg font-bold text-[#FFFFFF]">{status.running ? resources.netIn : "0.0"} <span className="text-xs text-[#828D9F] font-normal">MB/s</span></span>
                        </div>
                        <div>
                            <span className="text-xs text-[#828D9F] block mb-1">Outbound <i className="fa-solid fa-arrow-up text-[#4299E1]"></i></span>
                            <span className="text-lg font-bold text-[#FFFFFF]">{status.running ? resources.netOut : "0.0"} <span className="text-xs text-[#828D9F] font-normal">MB/s</span></span>
                        </div>
                    </div>
                </div >
            </div >

            {/* Live Console Card */}
            < div className="bg-[#090A0C] border border-[#333947] rounded-xl flex flex-col shadow-2xl h-[450px]" >
                {/* Console Header */}
                < div className="px-4 py-3 border-b border-[#333947] flex justify-between items-center bg-[#1A1D24]/50 rounded-t-xl" >
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-terminal text-[#B9C1D1]"></i>
                        <h3 className="font-medium text-[#FFFFFF] text-sm">Live Server Console</h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsAutoScroll(!isAutoScroll)}
                            className={`transition-colors ${isAutoScroll ? "text-[#F8B84E]" : "text-[#B9C1D1] hover:text-[#FFFFFF]"}`}
                            title="Auto-Scroll"
                        >
                            <i className="fa-solid fa-arrow-down-up-lock text-sm"></i>
                        </button>
                        <Link href="/dashboard/console" className="text-[#B9C1D1] hover:text-[#FFFFFF] transition-colors" title="Pop out">
                            <i className="fa-solid fa-up-right-from-square text-sm"></i>
                        </Link>
                    </div>
                </div >

                {/* Console Output (Scrollable) */}
                < div
                    ref={terminalRef}
                    className="flex-1 p-4 font-mono text-[13px] leading-relaxed text-[#B9C1D1] overflow-y-auto terminal-scroll whitespace-pre-wrap break-all"
                >
                    {
                        logs.length === 0 ? (
                            <div className="text-[#828D9F] italic">No logs available. Server might be offline.</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="mb-1 leading-snug">
                                    {formatLog(log)}
                                </div>
                            ))
                        )
                    }
                </div >

                {/* Console Input */}
                < form onSubmit={handleCommand} className="border-t border-[#333947] p-2 flex bg-[#1A1D24]/50 rounded-b-xl" >
                    <div className="flex-1 flex items-center bg-[#090A0C] border border-[#333947] rounded-md overflow-hidden focus-within:border-[#F8B84E] focus-within:ring-1 focus-within:ring-[#F8B84E] transition-all">
                        <span className="pl-3 text-[#f1fa8c] font-mono text-sm">{">"}</span>
                        <input
                            type="text"
                            disabled={!status.running}
                            value={commandInput}
                            onChange={(e) => setCommandInput(e.target.value)}
                            placeholder={status.running ? "Type a server command (e.g., 'say Hello')" : "Server offline"}
                            className="w-full bg-transparent border-none text-[#FFFFFF] font-mono text-sm px-3 py-2.5 focus:outline-none placeholder-[#828D9F] disabled:opacity-50"
                            autoComplete="off"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!status.running || !commandInput.trim()}
                        className="ml-2 px-4 py-2 bg-[#1A1D24] hover:bg-[#1A1D24]/80 text-[#FFFFFF] rounded-md text-sm font-medium transition-colors border border-[#333947] disabled:opacity-50"
                    >
                        Send
                    </button>
                </form >
            </div >

        </div >
    );
}
