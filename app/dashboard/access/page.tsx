"use client";

import { useState, useEffect, useCallback } from "react";

interface User { id: string; username: string; role: "admin" | "operator" | "viewer"; createdAt: string; }

export default function AccessPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<User["role"]>("viewer");
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/users");
            const data = await res.json();
            setUsers(data.users || []);
        } catch { /* silently fail */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleAdd = async () => {
        if (!newUsername.trim() || !newPassword.trim()) { showToast("Fill in all fields"); return; }
        setActionLoading(true);
        try {
            const res = await fetch("/api/auth/users", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
            });
            const data = await res.json();
            showToast(data.message);
            if (data.success) {
                setShowModal(false);
                setNewUsername(""); setNewPassword(""); setNewRole("viewer");
                fetchUsers();
            }
        } catch { showToast("Failed to add user"); }
        finally { setActionLoading(false); }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`Delete user ${user.username}?`)) return;
        try {
            const res = await fetch("/api/auth/users", {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: user.id }),
            });
            const data = await res.json();
            showToast(data.message);
            fetchUsers();
        } catch { showToast("Failed to delete"); }
    };

    const handleRoleChange = async (user: User, role: User["role"]) => {
        try {
            const res = await fetch("/api/auth/users", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: user.id, role }),
            });
            const data = await res.json();
            showToast(data.message);
            fetchUsers();
        } catch { showToast("Failed to update role"); }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2>◉ Access Control</h2>
                        <p>Manage dashboard users and permissions</p>
                    </div>
                    <button className="btn btn-emerald" onClick={() => setShowModal(true)}>+ Add User</button>
                </div>
            </div>

            {/* Role legend */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--text-bright)", marginBottom: 14, letterSpacing: "0.02em" }}>
                    ROLE PERMISSIONS
                </h3>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="role-badge admin">Admin</span> Full access — start, stop, config, users
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="role-badge operator">Operator</span> Control server, manage players
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="role-badge viewer">Viewer</span> Read-only — view status and logs
                    </div>
                </div>
            </div>

            {/* Users list */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {users.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">◉</div><h3>No Users</h3><p>Add users to control dashboard access.</p></div>
                ) : (
                    users.map((user) => (
                        <div key={user.id} className="user-card">
                            <div className="user-info">
                                <div className="user-avatar">{user.username[0].toUpperCase()}</div>
                                <div>
                                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--text-bright)" }}>{user.username}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <select className="form-input" style={{ width: 130, padding: "6px 12px", fontSize: 13 }}
                                    value={user.role} onChange={(e) => handleRoleChange(user, e.target.value as User["role"])}>
                                    <option value="admin">Admin</option>
                                    <option value="operator">Operator</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                                <button className="btn btn-ghost btn-sm" style={{ color: "var(--redstone)" }} onClick={() => handleDelete(user)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add user modal */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal">
                        <h3>Add New User</h3>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input className="form-input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter username" autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter password" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select className="form-input" value={newRole} onChange={(e) => setNewRole(e.target.value as User["role"])}>
                                <option value="admin">Admin</option>
                                <option value="operator">Operator</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-emerald" onClick={handleAdd} disabled={actionLoading}>
                                {actionLoading ? <span className="spinner" /> : "Create User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </>
    );
}
