import { createContext, useContext, useEffect, useState } from "react";
import { userLogout, userSession } from "../api/auth";
import { User } from "../types";

type UserSession = {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const UserSessionContext = createContext<UserSession | undefined>(undefined);

export const UserSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await userSession();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await userLogout();
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <UserSessionContext.Provider value={{ loading, authenticated: !!user, user, refresh, logout }}>
      {children}
    </UserSessionContext.Provider>
  );
};

export const useUserSession = () => {
  const ctx = useContext(UserSessionContext);
  if (!ctx) throw new Error("useUserSession must be used within UserSessionProvider");
  return ctx;
};
