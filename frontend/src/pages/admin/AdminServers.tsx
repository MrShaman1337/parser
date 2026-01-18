import { useState, useEffect } from "react";
import { useAdminSession } from "../../context/AdminSessionContext";

interface Server {
  id: string;
  name: string;
  description: string;
  ip_address: string;
  port: number;
  rcon_port: number;
  rcon_password: string;
  query_port: number;
  max_players: number;
  current_players: number;
  map_name: string;
  is_active: number;
  display_order: number;
  region: string;
  api_key: string;
  last_query_at: string | null;
  created_at: string;
  updated_at: string;
}

const emptyServer: Partial<Server> = {
  name: "",
  description: "",
  ip_address: "",
  port: 28015,
  rcon_port: 28016,
  rcon_password: "",
  query_port: 28015,
  max_players: 100,
  current_players: 0,
  map_name: "Procedural Map",
  is_active: 1,
  display_order: 0,
  region: "eu"
};

const AdminServers = () => {
  const { csrf } = useAdminSession();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Server>>(emptyServer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/servers.php", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setServers(data.servers || []);
      }
    } catch (e) {
      console.error("Failed to load servers", e);
    }
    setLoading(false);
  };

  const openModal = (server?: Server) => {
    setForm(server ? { ...server } : { ...emptyServer });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/admin/api/server-save.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, csrf_token: csrf })
      });
      const data = await res.json();
      if (data.ok && data.server) {
        setServers(prev => {
          const idx = prev.findIndex(s => s.id === data.server.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = data.server;
            return copy;
          }
          return [...prev, data.server];
        });
        setModalOpen(false);
      } else {
        alert(data.error || "Failed to save server");
      }
    } catch (e) {
      console.error("Failed to save server", e);
      alert("Failed to save server");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this server?")) return;
    try {
      const res = await fetch("/admin/api/server-delete.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, csrf_token: csrf })
      });
      const data = await res.json();
      if (data.ok) {
        setServers(prev => prev.filter(s => s.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete server", e);
    }
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert("API Key copied to clipboard!");
  };

  const getOnlineStatus = (server: Server) => {
    if (!server.last_query_at) return false;
    const lastQuery = new Date(server.last_query_at).getTime();
    const now = Date.now();
    return (now - lastQuery) < 120000; // 2 minutes
  };

  return (
    <div className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>Servers</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Add Server
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : servers.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">No servers yet. Add your first server!</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: "1rem" }}>
          {servers.map(server => {
            const isOnline = getOnlineStatus(server);
            const fillPercent = server.max_players > 0 
              ? Math.round((server.current_players / server.max_players) * 100) 
              : 0;
            
            return (
              <div key={server.id} className="card" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span style={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: "50%", 
                        background: isOnline ? "#4ade80" : "#ef4444",
                        boxShadow: isOnline ? "0 0 8px #4ade80" : "none"
                      }} />
                      <strong style={{ fontSize: "1.1rem" }}>{server.name}</strong>
                      <span className="badge" style={{ fontSize: "0.7rem" }}>{server.region.toUpperCase()}</span>
                      {!server.is_active && <span className="badge" style={{ background: "#666" }}>Inactive</span>}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {server.ip_address}:{server.port}
                    </div>
                    {server.description && (
                      <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                        {server.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-ghost" onClick={() => openModal(server)}>Edit</button>
                    <button className="btn btn-ghost" style={{ color: "#ef4444" }} onClick={() => handleDelete(server.id)}>Delete</button>
                  </div>
                </div>
                
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>Players Online</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      {server.current_players} / {server.max_players}
                    </span>
                  </div>
                  <div style={{ 
                    height: 8, 
                    background: "rgba(255,255,255,0.1)", 
                    borderRadius: 4,
                    overflow: "hidden"
                  }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${fillPercent}%`,
                      background: fillPercent > 80 ? "#ef4444" : fillPercent > 50 ? "#f59e0b" : "#4ade80",
                      borderRadius: 4,
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>API Key (for plugin)</span>
                    <button 
                      className="btn btn-ghost" 
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      onClick={() => copyApiKey(server.api_key)}
                    >
                      Copy
                    </button>
                  </div>
                  <code style={{ fontSize: "0.7rem", wordBreak: "break-all", color: "#4cc2ff" }}>
                    {server.api_key}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <div className={`modal ${modalOpen ? "open" : ""}`} onClick={() => setModalOpen(false)}>
        <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
          <h2>{form.id ? "Edit Server" : "Add Server"}</h2>
          <form onSubmit={handleSave}>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>Server Name *</label>
                <input 
                  required
                  value={form.name || ""} 
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="GO RUST #1"
                />
              </div>
              <div>
                <label>Region</label>
                <select value={form.region || "eu"} onChange={e => setForm({ ...form, region: e.target.value })}>
                  <option value="eu">EU</option>
                  <option value="ru">RU</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Description</label>
                <input 
                  value={form.description || ""} 
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Main PVP server"
                />
              </div>
              <div>
                <label>IP Address *</label>
                <input 
                  required
                  value={form.ip_address || ""} 
                  onChange={e => setForm({ ...form, ip_address: e.target.value })}
                  placeholder="123.45.67.89"
                />
              </div>
              <div>
                <label>Game Port</label>
                <input 
                  type="number"
                  value={form.port || 28015} 
                  onChange={e => setForm({ ...form, port: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label>Max Players</label>
                <input 
                  type="number"
                  value={form.max_players || 100} 
                  onChange={e => setForm({ ...form, max_players: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label>Display Order</label>
                <input 
                  type="number"
                  value={form.display_order || 0} 
                  onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label>Map Name</label>
                <input 
                  value={form.map_name || ""} 
                  onChange={e => setForm({ ...form, map_name: e.target.value })}
                  placeholder="Procedural Map"
                />
              </div>
              <div>
                <label>Active</label>
                <select 
                  value={form.is_active ?? 1} 
                  onChange={e => setForm({ ...form, is_active: parseInt(e.target.value) })}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>
            
            {form.api_key && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                <label style={{ marginBottom: "0.25rem", display: "block" }}>API Key (for plugin config)</label>
                <code style={{ fontSize: "0.8rem", wordBreak: "break-all", color: "#4cc2ff" }}>
                  {form.api_key}
                </code>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Server"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminServers;
