"use client";

import { useState, useEffect, useCallback } from "react";

interface User { id: string; username: string; role: "admin" | "operator" | "viewer"; createdAt: string; }

export default function SecurityPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newUser, setNewUser] = useState("");
    const [newPass, setNewPass] = useState("");
    const [newRole, setNewRole] = useState<User["role"]>("viewer");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const msg = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

    const poll = useCallback(async () => {
        try { setUsers((await (await fetch("/api/auth/users")).json()).users || []); } catch { /* */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { poll(); }, [poll]);

    const add = async () => {
        if (!newUser.trim() || !newPass.trim()) { msg("Fill all fields"); return; }
        setSaving(true);
        try { const r = await fetch("/api/auth/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: newUser, password: newPass, role: newRole }) }); const d = await r.json(); msg(d.message); if (d.success) { setShowModal(false); setNewUser(""); setNewPass(""); setNewRole("viewer"); poll(); } }
        catch { msg("Failed"); } finally { setSaving(false); }
    };

    const del = async (u: User) => {
        if (!confirm(`Delete user ${u.username}?`)) return;
        try { const r = await fetch("/api/auth/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id }) }); msg((await r.json()).message); poll(); } catch { msg("Failed"); }
    };

    const changeRole = async (u: User, role: User["role"]) => {
        try { await fetch("/api/auth/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, role }) }); poll(); } catch { /* */ }
    };

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner spinner-lg" /></div>;

    return (
        <div className="p-6">
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><h2 className="page-title">Security</h2><p className="page-subtitle">User management & access control</p></div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add User</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><span className="card-title">Role Permissions</span></div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="role-tag admin">Admin</span> Full access</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="role-tag operator">Operator</span> Server control</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="role-tag viewer">Viewer</span> Read-only</div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {users.length === 0 ? (
                    <div className="empty"><div className="empty-icon">◈</div><h3>No Users</h3><p>Add users to control access.</p></div>
                ) : users.map(u => (
                    <div key={u.id} className="user-row">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className="user-avatar-circle">{u.username[0].toUpperCase()}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-bright)" }}>{u.username}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div className="btn-row">
                            <select className="input" style={{ width: 120, padding: "5px 10px", fontSize: 12 }} value={u.role} onChange={e => changeRole(u, e.target.value as User["role"])}>
                                <option value="admin">Admin</option>
                                <option value="operator">Operator</option>
                                <option value="viewer">Viewer</option>
                            </select>
                            <button className="btn btn-outline btn-sm" style={{ color: "var(--coral)" }} onClick={() => del(u)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal">
                        <h3>Add User</h3>
                        <div className="field"><label className="field-label">Username</label><input className="input" value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="Username" autoFocus /></div>
                        <div className="field"><label className="field-label">Password</label><input className="input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Password" /></div>
                        <div className="field"><label className="field-label">Role</label><select className="input" value={newRole} onChange={e => setNewRole(e.target.value as User["role"])}><option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select></div>
                        <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
                            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={add} disabled={saving}>{saving ? <span className="spinner" /> : "Create"}</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
