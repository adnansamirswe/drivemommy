"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

export type SessionUser = { id: string; name: string; email: string };

const ACCESS_COOKIE = "dm_access";
const REFRESH_COOKIE = "dm_refresh";

function setCookie(name: string, value: string, days: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${days * 86400}; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookies() {
  document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${REFRESH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  return typeof document === "undefined" ? null : getCookie(ACCESS_COOKIE);
}

async function apiCall<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  return body as T;
}

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  tokenReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  authedFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function saveSession(accessToken: string, refreshToken: string, user: SessionUser) {
  setCookie(ACCESS_COOKIE, accessToken, 1);
  setCookie(REFRESH_COOKIE, refreshToken, 30);
  return user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenReady, setTokenReady] = useState(false);
  const tokenReadyRef = useRef(false);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const refreshToken = getCookie(REFRESH_COOKIE);
    if (!refreshToken) return null;
    try {
      const data = await apiCall<{ accessToken: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      setCookie(ACCESS_COOKIE, data.accessToken, 1);
      return data.accessToken;
    } catch {
      return null;
    }
  }, []);

  const authedFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      let token = getAccessToken();
      let res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
      });
      if (res.status === 401) {
        token = await refreshSession();
        if (!token) {
          clearCookies();
          setUser(null);
          throw new Error("Session expired. Please sign in again.");
        }
        res = await fetch(`${API_URL}${path}`, {
          ...init,
          headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
        });
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
      return body as T;
    },
    [refreshSession]
  );

  useEffect(() => {
    (async () => {
      // Phase 1: Mark token as ready immediately if it exists in the cookie
      const token = getAccessToken();
      if (token) {
        setTokenReady(true);
        tokenReadyRef.current = true;
      }

      // Phase 2: Verify the session with /auth/me
      let accessToken = token;
      if (accessToken) {
        try {
          const data = await apiCall<{ user: SessionUser }>("/auth/me", {}, accessToken);
          setUser(data.user);
          setLoading(false);
          return;
        } catch {
          accessToken = await refreshSession();
        }
      } else {
        accessToken = await refreshSession();
      }
      if (accessToken) {
        try {
          const data = await apiCall<{ user: SessionUser }>("/auth/me", {}, accessToken);
          setUser(data.user);
          // If token wasn't in cookie initially but refresh worked, mark ready now
          if (!tokenReadyRef.current) {
            setTokenReady(true);
            tokenReadyRef.current = true;
          }
        } catch {
          clearCookies();
        }
      }
      setLoading(false);
    })();
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiCall<{ accessToken: string; refreshToken: string; user: SessionUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(saveSession(data.accessToken, data.refreshToken, data.user));
    setTokenReady(true);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiCall<{ accessToken: string; refreshToken: string; user: SessionUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(saveSession(data.accessToken, data.refreshToken, data.user));
    setTokenReady(true);
  }, []);

  const logout = useCallback(async () => {
    const token = getAccessToken();
    if (token) await apiCall("/auth/logout", { method: "POST" }, token).catch(() => undefined);
    clearCookies();
    setUser(null);
    setTokenReady(false);
  }, []);

  const googleSignIn = useCallback(async () => {
    const data = await apiCall<{ url: string }>("/auth/google/url");
    window.location.href = data.url;
  }, []);

  const value = useMemo(
    () => ({ user, loading, tokenReady, login, register, logout, googleSignIn, authedFetch }),
    [user, loading, tokenReady, login, register, logout, googleSignIn, authedFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export async function exchangeGoogleToken(token: string): Promise<SessionUser> {
  const data = await apiCall<{ accessToken: string; refreshToken: string; user: SessionUser }>("/auth/google/exchange", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return saveSession(data.accessToken, data.refreshToken, data.user);
}
