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
  warning?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_CODE_MIN_LENGTH = 6;
const OTP_CODE_MAX_LENGTH = 8;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
const PASSWORD_NUMBER_PATTERN = /\d/;

function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}

function getDisplayNameValidationError(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "请输入昵称。";
  if (trimmed.length > 80) return "昵称不能超过 80 个字符。";
  return null;
}

function getPasswordValidationError(password: string) {
  if (password.length < 1) {
    return "请输入密码。";
  }
  return null;
}

function normalizeOtpCode(token: string) {
  return token.replace(/\s+/g, "");
}

function getFallbackDisplayName(user: User, requestedName?: string) {
  const requested = (requestedName ?? "").trim();
  if (requested) return requested;

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  if (metadataName) return metadataName;

  const profileName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  if (profileName) return profileName;

  const emailPrefix = user.email?.split("@")[0]?.trim();
  if (emailPrefix) return emailPrefix;

  return "Timix 用户";
}

interface ForumAuthState {
  session: Session | null;
  user: User | null;
  email: string | null;
  token: string | null;
  displayName: string | null;
  bio: string;
  tags: string[];
  isConnected: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  needsPassword: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  adminUserIds: Set<string>;
  ownerUserIds: Set<string>;
  authModalOpen: boolean;
  showAuthModal: () => void;
  hideAuthModal: () => void;
  sendEmailCode: (email: string) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  setPassword: (password: string, displayName?: string) => Promise<AuthResult>;
  setDisplayName: (name: string) => Promise<void>;
  updateProfile: (data: { bio?: string; tags?: string[] }) => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultState: ForumAuthState = {
  session: null,
  user: null,
  email: null,
  token: null,
  displayName: null,
  bio: "",
  tags: [],
  isConnected: false,
  isConfigured: false,
  isLoading: true,
  needsPassword: false,
  isAdmin: false,
  isOwner: false,
  adminUserIds: new Set(),
  ownerUserIds: new Set(),
  authModalOpen: false,
  showAuthModal: () => {},
  hideAuthModal: () => {},
  sendEmailCode: async () => ({ ok: false, error: "认证服务未配置。" }),
  verifyOtp: async () => ({ ok: false, error: "认证服务未配置。" }),
  signInWithPassword: async () => ({ ok: false, error: "认证服务未配置。" }),
  setPassword: async () => ({ ok: false, error: "认证服务未配置。" }),
  setDisplayName: async () => {},
  updateProfile: async () => {},
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
  if (lower.includes("token has expired") || lower.includes("otp expired")) {
    return "验证码已过期，请重新发送。";
  }
  if (lower.includes("invalid token") || lower.includes("token is invalid") || lower.includes("otp")) {
    return "验证码无效，请确认输入正确或重新发送。";
  }
  if (lower.includes("password should be at least")) {
    return `密码至少需要 ${PASSWORD_MIN_LENGTH} 位。`;
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
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const adminLoadedRef = useRef(false);
  const ownerLoadedRef = useRef(false);

  const showAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const hideAuthModal = useCallback(() => setAuthModalOpen(false), []);

  async function loadDisplayName(userId: string) {
    try {
      const { data } = await getSupabaseClient()
        .from("forum_profiles")
        .select("display_name, bio, tags")
        .eq("id", userId)
        .single();
      if (data?.display_name) {
        setDisplayNameState(data.display_name);
      }
      setBio((data as Record<string, unknown>)?.bio as string ?? "");
      setTags(
        Array.isArray((data as Record<string, unknown>)?.tags)
          ? ((data as Record<string, unknown>).tags as string[])
          : [],
      );
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

      // Load all site owner user IDs
      try {
        const { data: ownerRows } = await getSupabaseClient()
          .from("site_owners")
          .select("user_id");
        if (ownerRows) {
          setOwnerUserIds(new Set((ownerRows as { user_id: string }[]).map((r) => r.user_id)));
        }
      } catch {
        // RLS may block non-owner queries
      }

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

  // Load owner user IDs for everyone (not just logged-in users) so badges display for all visitors
  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseClient();
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.from("site_owners").select("user_id");
        if (!mounted || !data) return;
        setOwnerUserIds(new Set((data as { user_id: string }[]).map((r) => r.user_id)));
      } catch {
        /* RLS may block */
      }
    })();
    return () => { mounted = false; };
  }, [configured]);

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
          setBio("");
          setTags([]);
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
      if (!isValidEmail(normalizedEmail)) {
        return { ok: false, error: "请输入有效的邮箱地址。" };
      }

      const { error } = await getSupabaseClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      return error
        ? { ok: false, error: getAuthErrorMessage(error.message) }
        : { ok: true };
    },
    [configured],
  );

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<AuthResult> => {
      if (!configured) return { ok: false, error: "认证服务未配置。" };

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedToken = normalizeOtpCode(token);
      if (!normalizedEmail || !normalizedToken) {
        return { ok: false, error: "请输入验证码。" };
      }
      if (!isValidEmail(normalizedEmail)) {
        return { ok: false, error: "请输入有效的邮箱地址。" };
      }
      if (!/^\d+$/.test(normalizedToken) || normalizedToken.length < OTP_CODE_MIN_LENGTH || normalizedToken.length > OTP_CODE_MAX_LENGTH) {
        return { ok: false, error: `请输入 ${OTP_CODE_MIN_LENGTH}-${OTP_CODE_MAX_LENGTH} 位数字验证码。` };
      }

      // 先尝试 signup 类型，失败则尝试 email 类型
      let result = await getSupabaseClient().auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedToken,
        type: "signup",
      });

      if (result.error) {
        result = await getSupabaseClient().auth.verifyOtp({
          email: normalizedEmail,
          token: normalizedToken,
          type: "email",
        });
      }

      return result.error
        ? { ok: false, error: getAuthErrorMessage(result.error.message) }
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
      if (!isValidEmail(normalizedEmail)) {
        return { ok: false, error: "请输入有效的邮箱地址。" };
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
      const passwordError = getPasswordValidationError(password);
      if (passwordError) {
        return { ok: false, error: passwordError };
      }
      const displayNameError =
        typeof displayName === "string" ? getDisplayNameValidationError(displayName) : null;
      if (displayNameError) return { ok: false, error: displayNameError };

      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;
      if (userError || !user) {
        return { ok: false, error: "登录状态已失效，请重新验证邮箱后再设置密码。" };
      }

      const name = getFallbackDisplayName(user, displayName);
      let profileWarning: string | null = null;

      const { error: profileError } = await supabase
        .from("forum_profiles")
        .upsert({ id: user.id, display_name: name }, { onConflict: "id" });
      if (profileError) {
        profileWarning = "密码已设置，但昵称保存失败了，请稍后在个人资料里再试一次。";
      } else {
        setDisplayNameState(name);
      }

      // Now update password — onAuthStateChange will re-read and find the new name
      const { error } = await supabase.auth.updateUser({
        password,
        data: { password_set: true, full_name: name },
      });

      if (error) {
        return { ok: false, error: getAuthErrorMessage(error.message) };
      }

      if (profileWarning) {
        const retryResult = await supabase
          .from("forum_profiles")
          .upsert({ id: user.id, display_name: name }, { onConflict: "id" });
        if (!retryResult.error) {
          setDisplayNameState(name);
          profileWarning = null;
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      return profileWarning ? { ok: true, warning: profileWarning } : { ok: true };
    },
    [configured],
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      if (!configured) return;
      const trimmed = name.trim();
      if (getDisplayNameValidationError(trimmed)) return;

      try {
        const supabase = getSupabaseClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { error } = await supabase
          .from("forum_profiles")
          .upsert({ id: userData.user.id, display_name: trimmed }, { onConflict: "id" });

        if (error) throw error;
        setDisplayNameState(trimmed);
      } catch {
        // Still update local state so UI doesn't revert immediately
        setDisplayNameState(trimmed);
      }
    },
    [configured],
  );

  const updateProfile = useCallback(
    async (data: { bio?: string; tags?: string[] }) => {
      if (!configured) return;
      try {
        const supabase = getSupabaseClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const updates: Record<string, unknown> = {};

        if (data.bio !== undefined) {
          const trimmed = data.bio.trim();
          if (trimmed.length > 500) return;
          updates.bio = trimmed;
          setBio(trimmed);
        }

        if (data.tags !== undefined) {
          const uniqueTags: string[] = [];
          const seen = new Set<string>();
          for (const tag of data.tags) {
            const t = tag.trim();
            if (t && !seen.has(t)) {
              seen.add(t);
              uniqueTags.push(t.slice(0, 20));
            }
            if (uniqueTags.length >= 5) break;
          }
          updates.tags = uniqueTags;
          setTags(uniqueTags);
        }

        if (Object.keys(updates).length === 0) return;

        const { error } = await supabase
          .from("forum_profiles")
          .update(updates)
          .eq("id", userData.user.id);

        if (error) throw error;
      } catch {
        // State already updated optimistically above
      }
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    await getSupabaseClient().auth.signOut();
    setSession(null);
    setDisplayNameState(null);
    setBio("");
    setTags([]);
  }, [configured]);

  const value = useMemo<ForumAuthState>(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,
      email: user?.email ?? null,
      token: session?.access_token ?? null,
      displayName,
      bio,
      tags,
      isConnected: Boolean(session?.access_token),
      isConfigured: configured,
      isLoading,
      needsPassword: userNeedsPassword(user),
      isAdmin,
      isOwner,
      adminUserIds,
      ownerUserIds,
      authModalOpen,
      showAuthModal,
      hideAuthModal,
      sendEmailCode,
      verifyOtp,
      signInWithPassword,
      setPassword,
      setDisplayName,
      updateProfile,
      signOut,
    };
  }, [configured, displayName, bio, tags, isLoading, isAdmin, isOwner, adminUserIds, ownerUserIds, sendEmailCode, verifyOtp, session, setDisplayName, setPassword, signInWithPassword, updateProfile, signOut, authModalOpen, showAuthModal, hideAuthModal]);

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
