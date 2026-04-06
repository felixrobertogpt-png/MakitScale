"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";

interface User {
  id?: number;
  username: string;
  nombre?: string;
  empresaId: number;
  rol?: string;
  exp?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get("makitscale_token");
    if (token) {
      try {
        const decoded = jwtDecode<User>(token);
        // Verificar si expiró
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setUser(decoded);
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: any) => {
    Cookies.set("makitscale_token", token, {
      expires: 1,
      path: "/",
      sameSite: "Lax",
      secure: window.location.protocol === "https:",
    });
    const decoded = jwtDecode<User>(token);
    setUser({ ...decoded, ...userData });
    router.push("/");
  };

  const logout = () => {
    Cookies.remove("makitscale_token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
