"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { ForumAuthModal } from "@/components/forum-auth-modal";
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
  displayName: string | null;
  isConnected: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  needsPassword: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  adminUserIds: Set<string>;
  authModalOpen: boolean;
  showAuthModal: () => void;
  hideAuthModal: () => void;
  sendEmailCode: (email: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  setPassword: (password: string, displayName?: string) => Promise<AuthResult>;
  setDisplayName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultState: ForumAuthState = {
  session: null,
  user: null,
  email: null,
  token: null,
  displayName: null,
  isConnected: false,
  isConfigured: false,
  isLoading: true,
  needsPassword: false,
  isAdmin: false,
  isOwner: false,
  adminUserIds: new Set(),
  authModalOpen: false,
  showAuthModal: () => {},
  hideAuthModal: () => {},
  sendEmailCode: async () => ({ ok: false, error: "认证服务未配置。" }),
  signInWithPassword: async () => ({ ok: false, error: "认证服务未配置。" }),
  setPassword: async () => ({ ok: false, error: "认证服务未配置。" }),
  setDisplayName: async () => {},
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
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const adminLoadedRef = useRef(false);
  const ownerLoadedRef = useRef(false);

  const showAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const hideAuthModal = useCallback(() => setAuthModalOpen(false), []);

  async function loadDisplayName(userId: string) {
    try {
      const { data } = await getSupabaseClient()
        .from("forum_profiles")
        .select("display_name")
        .eq("id", userId)
        .single();
      if (data?.display_name) {
        setDisplayNameState(data.display_name);
      }
    } catch {
      // profile may not exist yet
    }
  }

  async function loadAdminInfo(userId: string) {
    if (adminLoadedRef.current) return;
    adminLoadedRef.current = true;

    try {
      // Check if current user is admin via security-definer RPC
      const { data: isAdminResult } = await getSupabaseClient()
        .rpc("is_forum_admin", { check_user_id: userId });
      const admin = Boolean(isAdminResult);
      setIsAdmin(admin);

      // Load all admin user IDs (only succeeds for admins due to RLS)
      if (admin) {
        try {
          const { data: rows } = await getSupabaseClient()
            .from("forum_admins")
            .select("user_id");
          if (rows) {
            setAdminUserIds(new Set((rows as { user_id: string }[]).map((r) => r.user_id)));
          }
        } catch {
          // Non-admin users hit RLS and get an error here — expected
        }
      }
    } catch {
      // is_forum_admin RPC failed — user is not an admin
    }
  }

  async function loadOwnerInfo(userId: string) {
    if (ownerLoadedRef.current) return;
    ownerLoadedRef.current = true;

    try {
      const { data } = await getSupabaseClient()
        .rpc("is_site_owner", { check_user_id: userId });
      const owner = Boolean(data);
      setIsOwner(owner);

      // Site owner is always auto-admin
      if (owner) {
        setIsAdmin(true);
        // Reload admin list so owner gets the full admin-user-id set
        try {
          const { data: rows } = await getSupabaseClient()
            .from("forum_admins")
            .select("user_id");
          if (rows) {
            setAdminUserIds(new Set((rows as { user_id: string }[]).map((r) => r.user_id)));
          }
        } catch {
          // RLS may still block if admin list policy isn't ready
        }
      }
    } catch {
      // is_site_owner RPC failed — user is not a site owner
    }
  }

  useEffect(() => {
    if (!configured) return;

    const supabase = getSupabaseClient();
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user?.id) {
          loadDisplayName(data.session.user.id);
          loadAdminInfo(data.session.user.id);
          loadOwnerInfo(data.session.user.id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession?.user?.id) {
          loadDisplayName(nextSession.user.id);
          loadAdminInfo(nextSession.user.id);
          loadOwnerInfo(nextSession.user.id);
        } else {
          setDisplayNameState(null);
          setIsAdmin(false);
          setIsOwner(false);
          setAdminUserIds(new Set());
          adminLoadedRef.current = false;
          ownerLoadedRef.current = false;
        }
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
    async (password: string, displayName?: string): Promise<AuthResult> => {
      if (!configured) return { ok: false, error: "认证服务未配置。" };
      if (password.length < 8) {
        return { ok: false, error: "密码至少需要 8 位。" };
      }
      if (!/[A-Z]/.test(password)) {
        return { ok: false, error: "密码需包含至少一个大写字母。" };
      }
      if (!/[0-9]/.test(password)) {
        return { ok: false, error: "密码需包含至少一个数字。" };
      }

      const name = (displayName ?? "").trim() || "群友补充";

      // Save display name FIRST (before auth update triggers state change)
      const { data: userData } = await getSupabaseClient().auth.getUser();
      if (userData.user) {
        await getSupabaseClient()
          .from("forum_profiles")
          .upsert({ id: userData.user.id, display_name: name }, { onConflict: "id" });
        setDisplayNameState(name);
      }

      // Now update password — onAuthStateChange will re-read and find the new name
      const { error } = await getSupabaseClient().auth.updateUser({
        password,
        data: { password_set: true, full_name: name },
      });

      if (error) {
        return { ok: false, error: getAuthErrorMessage(error.message) };
      }

      const { data: sessionData } = await getSupabaseClient().auth.getSession();
      setSession(sessionData.session);
      return { ok: true };
    },
    [configured],
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      if (!configured) return;
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 80) return;

      try {
        const supabase = getSupabaseClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Use update first (more reliable than upsert for existing profiles)
        const { error: updateError } = await supabase
          .from("forum_profiles")
          .update({ display_name: trimmed })
          .eq("id", userData.user.id);

        // If no rows updated (profile doesn't exist yet), insert
        if (updateError) {
          const { error: insertError } = await supabase
            .from("forum_profiles")
            .insert({ id: userData.user.id, display_name: trimmed });
          if (insertError) throw insertError;
        }

        // Verify it was saved
        const { data: verify } = await supabase
          .from("forum_profiles")
          .select("display_name")
          .eq("id", userData.user.id)
          .single();
        if (verify) setDisplayNameState(verify.display_name);
      } catch {
        // Still update local state so UI doesn't revert immediately
        setDisplayNameState(trimmed);
      }
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    await getSupabaseClient().auth.signOut();
    setSession(null);
    setDisplayNameState(null);
  }, [configured]);

  const value = useMemo<ForumAuthState>(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,
      email: user?.email ?? null,
      token: session?.access_token ?? null,
      displayName,
      isConnected: Boolean(session?.access_token),
      isConfigured: configured,
      isLoading,
      needsPassword: userNeedsPassword(user),
      isAdmin,
      isOwner,
      adminUserIds,
      authModalOpen,
      showAuthModal,
      hideAuthModal,
      sendEmailCode,
      signInWithPassword,
      setPassword,
      setDisplayName,
      signOut,
    };
  }, [configured, displayName, isLoading, isAdmin, isOwner, adminUserIds, sendEmailCode, session, setDisplayName, setPassword, signInWithPassword, signOut, authModalOpen, showAuthModal, hideAuthModal]);

  return (
    <ForumAuthContext.Provider value={value}>
      {children}
      <ForumAuthModal
        key={authModalOpen ? "open" : "closed"}
        open={authModalOpen}
        onClose={hideAuthModal}
      />
    </ForumAuthContext.Provider>
  );
}

export function useForumAuth(): ForumAuthState {
  return useContext(ForumAuthContext);
}


