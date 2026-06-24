"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "timin-github-token";

interface GithubAuthState {
  token: string | null;
  isConnected: boolean;
  username: string | null;
  avatar: string | null;
  connect: (newToken: string) => Promise<boolean>;
  disconnect: () => void;
}

const defaultState: GithubAuthState = {
  token: null,
  isConnected: false,
  username: null,
  avatar: null,
  connect: async () => false,
  disconnect: () => {},
};

const GithubAuthContext = createContext<GithubAuthState>(defaultState);

export function GithubAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(
    () => (typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null),
  );
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const isConnected = token !== null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && !cancelled) {
          setUsername(data.login);
          setAvatar(data.avatar_url);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [token]);

  const connect = useCallback(async (newToken: string): Promise<boolean> => {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${newToken}` },
      });

      if (!res.ok) return false;

      const data = await res.json();
      window.sessionStorage.setItem(STORAGE_KEY, newToken);
      setToken(newToken);
      setUsername(data.login);
      setAvatar(data.avatar_url);
      return true;
    } catch {
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUsername(null);
    setAvatar(null);
  }, []);

  return (
    <GithubAuthContext.Provider
      value={{ token, isConnected, username, avatar, connect, disconnect }}
    >
      {children}
    </GithubAuthContext.Provider>
  );
}

export function useGithubAuth(): GithubAuthState {
  return useContext(GithubAuthContext);
}
