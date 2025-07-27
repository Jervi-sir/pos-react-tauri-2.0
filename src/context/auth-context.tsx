import React, { createContext, useContext, useState, useEffect } from "react";
import { runSql } from "@/runSql";

type User = { id: number; name: string; email: string; role: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, restore user from localStorage
    const stored = localStorage.getItem("POSUser");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res: any = await runSql(
      `SELECT id, name, email, role FROM users WHERE email = '${email.replace(/'/g, "''")}' AND password = '${password.replace(/'/g, "''")}' LIMIT 1`
    );
    const u = res[0];
    if (u) {
      setUser(u);
      localStorage.setItem("POSUser", JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("POSUser");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
