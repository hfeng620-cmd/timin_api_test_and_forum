"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type AuthResult = {
  ok: boolean;
  error?: string;
};

interface ForumAuthState {
  session: Session | null;
  user: User | null;
  email: string | null;
  token: string | null;
  isConnected: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  needsPassword: boolean;
  sendEmailCode: (email: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  setPassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const defaultState: ForumAuthState = {
  session: null,
  user: null,
  email: null,
  token: null,
  isConnected: false,
  isConfigured: false,
  isLoading: true,
  needsPassword: false,
  sendEmailCode: async () => ({ ok: false, error: "认证服务未配置。" }),
  signInWithPassword: async () => ({ ok: false, error: "认证服务未配置。" }),
  setPassword: async () => ({ ok: false, error: "认证服务未配置。" }),
  signOut: async () => {},
};

const ForumAuthContext = createContext<ForumAuthState>(defaultState);

function getAuthErrorMessage(message?: string) {
  if (!message) return "操作失败，请稍后重试。";

  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "邮箱或密码不正确。";
  }
  if (lower.includes("email not confirmed")) {
    return "请先完成邮箱验证。";
  }
  if (lower.includes("signup disabled")) {
    return "当前 Supabase 项目未开启邮箱注册。";
  }
  if (lower.includes("rate limit")) {
    return "请求太频繁，请稍后再试。";
  }

  return message;
}

function userNeedsPassword(user: User | null) {
  if (!user) return false;

  return user.user_metadata?.password_set !== true;
}

export function ForumAuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;

    const supabase = getSupabaseClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setIsLoading(false);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [configured]);

  const sendEmailCode = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!configured) return { ok: false, error: "认证服务未配置。" };

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return { ok: false, error: "请输入邮箱。" };

      const { error } = await getSupabaseClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo:
            typeof window === "undefined" ? undefined : window.location.href,
          shouldCreateUser: true,
        },
      });

      return error
        ? { ok: false, error: getAuthErrorMessage(error.message) }
        : { ok: true };
    },
    [configured],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!configured) return { ok: false, error: "认证服务未配置。" };

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return { ok: false, error: "请输入邮箱和密码。" };
      }

      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      return error
        ? { ok: false, error: getAuthErrorMessage(error.message) }
        : { ok: true };
    },
    [configured],
  );

  const setPassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      if (!configured) return { ok: false, error: "认证服务未配置。" };
      if (password.length < 8) {
        return { ok: false, error: "密码至少需要 8 位。" };
      }

      const { error } = await getSupabaseClient().auth.updateUser({
        password,
        data: { password_set: true },
      });

      if (error) {
        return { ok: false, error: getAuthErrorMessage(error.message) };
      }

      const { data } = await getSupabaseClient().auth.getSession();
      setSession(data.session);
      return { ok: true };
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    await getSupabaseClient().auth.signOut();
    setSession(null);
  }, [configured]);

  const value = useMemo<ForumAuthState>(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,
      email: user?.email ?? null,
      token: session?.access_token ?? null,
      isConnected: Boolean(session?.access_token),
      isConfigured: configured,
      isLoading,
      needsPassword: userNeedsPassword(user),
      sendEmailCode,
      signInWithPassword,
      setPassword,
      signOut,
    };
  }, [configured, isLoading, sendEmailCode, session, setPassword, signInWithPassword, signOut]);

  return (
    <ForumAuthContext.Provider value={value}>
      {children}
    </ForumAuthContext.Provider>
  );
}

export function useForumAuth(): ForumAuthState {
  return useContext(ForumAuthContext);
}


