import { createContext, useContext, useEffect, useState } from "react";
import { adminSession } from "../api/admin";

type AdminSession = {
  loading: boolean;
  authenticated: boolean;
  csrf: string;
  featuredLimit: number;
  username: string;
  role: string;
  refresh: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSession | undefined>(undefined);

export const AdminSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [csrf, setCsrf] = useState("");
  const [featuredLimit, setFeaturedLimit] = useState(8);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await adminSession();
      setAuthenticated(true);
      setCsrf(data.csrf_token);
      setFeaturedLimit(data.featured_limit || 8);
      setUsername(data.user || "");
      setRole(data.role || "");
    } catch {
      setAuthenticated(false);
      setCsrf("");
      setUsername("");
      setRole("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminSessionContext.Provider value={{ loading, authenticated, csrf, featuredLimit, username, role, refresh }}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error("useAdminSession must be used within AdminSessionProvider");
  return ctx;
};
