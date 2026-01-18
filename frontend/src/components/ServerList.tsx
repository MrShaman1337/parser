import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";

interface Server {
  id: string;
  name: string;
  description: string;
  ip: string;
  current_players: number;
  max_players: number;
  fill_percent: number;
  map: string;
  region: string;
  is_online: boolean;
}

const ServerList = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const { lang } = useI18n();

  useEffect(() => {
    const loadServers = async () => {
      try {
        // Load servers from both regions
        const [euRes, ruRes] = await Promise.all([
          fetch("/api/servers.php?region=eu"),
          fetch("/api/servers.php?region=ru")
        ]);
        const [euData, ruData] = await Promise.all([
          euRes.json(),
          ruRes.json()
        ]);
        
        const allServers: Server[] = [];
        if (euData.ok) allServers.push(...(euData.servers || []));
        if (ruData.ok) allServers.push(...(ruData.servers || []));
        
        setServers(allServers);
      } catch (e) {
        console.error("Failed to load servers", e);
      }
      setLoading(false);
    };
    loadServers();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadServers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="server-list">
        <div className="skeleton" style={{ height: 80 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    );
  }

  if (servers.length === 0) {
    return null;
  }

  return (
    <div className="server-list">
      <h3 style={{ marginBottom: "1rem" }}>
        {lang === "ru" ? "Наши серверы" : "Our Servers"}
      </h3>
      <div className="server-grid">
        {servers.map(server => {
          const fillColor = server.fill_percent > 80 
            ? "#ef4444" 
            : server.fill_percent > 50 
              ? "#f59e0b" 
              : "#4ade80";
          
          return (
            <div key={server.id} className="server-card">
              <div className="server-header">
                <span 
                  className="server-status" 
                  style={{ 
                    background: server.is_online ? "#4ade80" : "#ef4444",
                    boxShadow: server.is_online ? "0 0 8px #4ade80" : "none"
                  }} 
                />
                <span className="server-name">{server.name}</span>
                <span 
                  className="server-region-badge"
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "4px",
                    background: server.region === "eu" ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)",
                    color: server.region === "eu" ? "#3b82f6" : "#ef4444",
                    fontWeight: 600,
                    textTransform: "uppercase"
                  }}
                >
                  {server.region}
                </span>
              </div>
              
              <div className="server-players">
                <span className="server-count">
                  {server.current_players}
                  <span className="server-max">/{server.max_players}</span>
                </span>
                <span className="server-label">
                  {lang === "ru" ? "игроков" : "players"}
                </span>
              </div>
              
              <div className="server-bar-container">
                <div 
                  className="server-bar-fill" 
                  style={{ 
                    width: `${server.fill_percent}%`,
                    background: `linear-gradient(90deg, ${fillColor}88, ${fillColor})`
                  }} 
                />
              </div>
              
              <div className="server-ip muted">
                {server.ip}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServerList;
