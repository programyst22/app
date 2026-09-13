import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { api, loadToken, setToken, setUnauthorizedHandler } from "./api";
import { queryClient } from "./query-client";
import { registerForPush } from "./push";

WebBrowser.maybeCompleteAuthSession();

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "CLIENT" | "EMPLOYEE" | "PROJECT_MANAGER" | "MANAGER" | "ADMIN" | "SUPER_ADMIN";
  customer_id?: string | null;
  picture?: string | null;
};

type Ctx = {
  user: User | null | undefined; // undefined = loading
  login: (email: string, password: string) => Promise<void>;
  register: (b: { email: string; password: string; first_name: string; last_name: string; phone?: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);
export const isStaff = (u?: User | null) => !!u && u.role !== "CLIENT";
export const isManagement = (u?: User | null) => !!u && ["PROJECT_MANAGER", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(u.role);
export const isAdmin = (u?: User | null) => !!u && ["ADMIN", "SUPER_ADMIN"].includes(u.role);

const SESSION_RE = /[?#&]session_id=([^&#]+)/;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const usedSessionIds = useRef(new Set<string>());

  const afterLogin = useCallback((u: User) => {
    setUser(u);
    queryClient.clear();
    registerForPush(u.id).catch(() => {});
  }, []);

  const exchangeSession = useCallback(
    async (sessionId: string) => {
      if (usedSessionIds.current.has(sessionId)) return false;
      usedSessionIds.current.add(sessionId);
      try {
        const data = await api("/auth/session", { method: "POST", json: { session_id: sessionId } });
        setToken(data.session_token);
        afterLogin(data.user);
        return true;
      } catch (e) {
        console.warn("session exchange failed", e);
        return false;
      }
    },
    [afterLogin],
  );

  const refresh = useCallback(async () => {
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      // 1) session_id in URL (web) or initial deep link (native) — process FIRST
      let url: string | null = null;
      if (Platform.OS === "web" && typeof window !== "undefined") url = window.location.href;
      else url = await Linking.getInitialURL();
      const m = url?.match(SESSION_RE);
      if (m) {
        const ok = await exchangeSession(decodeURIComponent(m[1]));
        if (ok && Platform.OS === "web") {
          const u = new URL(window.location.href);
          u.searchParams.delete("session_id");
          u.hash = u.hash.replace(/([?#&])session_id=[^&#]+&?/, "$1").replace(/[?#&]$/, "");
          window.history.replaceState(window.history.state, "", u.toString());
        }
        if (ok) return;
      }
      // 2) existing token
      const t = await loadToken();
      if (!t) return setUser(null);
      await refresh();
    })();
    const sub = Linking.addEventListener("url", ({ url }) => {
      const mm = url.match(SESSION_RE);
      if (mm) exchangeSession(decodeURIComponent(mm[1]));
    });
    return () => sub.remove();
  }, [exchangeSession, refresh]);

  useEffect(() => {
    if (user) registerForPush(user.id).catch(() => {});
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    const data = await api("/auth/login", { method: "POST", json: { email, password } });
    setToken(data.access_token);
    afterLogin(data.user);
  };
  const register: Ctx["register"] = async (b) => {
    const data = await api("/auth/register", { method: "POST", json: b });
    setToken(data.access_token);
    afterLogin(data.user);
  };
  const loginWithGoogle = async () => {
    const redirectUrl = Platform.OS === "web" ? window.location.origin + "/mein-projekt" : Linking.createURL("mein-projekt");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    let captured: string | null = null;
    const sub = Linking.addEventListener("url", ({ url }) => (captured = url));
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    sub.remove();
    const url = (result as any).url || captured || (await Linking.getInitialURL());
    const m = url?.match(SESSION_RE);
    if (m) await exchangeSession(decodeURIComponent(m[1]));
  };
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    setToken(null);
    queryClient.clear();
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, register, loginWithGoogle, logout, refresh }}>{children}</AuthCtx.Provider>;
}
