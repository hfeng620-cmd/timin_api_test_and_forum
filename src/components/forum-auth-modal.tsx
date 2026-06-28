"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { uploadAvatar, updateProfileAvatar } from "@/lib/discussion-storage";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { FORUM_IMAGE_ACCEPT, getForumImageUploadError } from "@/lib/forum-image-safety";
import { getSupabaseClient } from "@/lib/supabase";
import { useForumAuth } from "@/lib/forum-auth";

type ForumAuthModalProps = {
  open: boolean;
  onClose: () => void;
};

type AuthMode = "login" | "register";

type PendingRegistrationState = {
  email: string;
  displayName: string;
  otpSent: boolean;
  updatedAt: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_CODE_MIN_LENGTH = 6;
const OTP_CODE_MAX_LENGTH = 8;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
const PASSWORD_NUMBER_PATTERN = /\d/;
const PENDING_REGISTRATION_KEY = "forum-pending-registration";
const PENDING_REGISTRATION_MAX_AGE_MS = 30 * 60 * 1000;

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

function readPendingRegistration(): PendingRegistrationState | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingRegistrationState>;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.otpSent !== "boolean" ||
      typeof parsed.updatedAt !== "number"
    ) {
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      return null;
    }
    if (Date.now() - parsed.updatedAt > PENDING_REGISTRATION_MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      return null;
    }
    return {
      email: parsed.email,
      displayName: parsed.displayName,
      otpSent: parsed.otpSent,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function writePendingRegistration(state: Omit<PendingRegistrationState, "updatedAt">) {
  try {
    sessionStorage.setItem(
      PENDING_REGISTRATION_KEY,
      JSON.stringify({
        ...state,
        updatedAt: Date.now(),
      } satisfies PendingRegistrationState),
    );
  } catch {
    /* sessionStorage may be unavailable */
  }
}

function clearPendingRegistration() {
  try {
    sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    sessionStorage.removeItem("forum-reg-display-name");
  } catch {
    /* sessionStorage may be unavailable */
  }
}

export function ForumAuthModal({ open, onClose }: ForumAuthModalProps) {
  const {
    email: signedInEmail,
    isConnected,
    isConfigured,
    isLoading,
    needsPassword,
    isAdmin,
    displayName,
    sendEmailCode,
    signInWithPassword,
    setPassword,
    setDisplayName,
    signOut,
    verifyOtp,
  } = useForumAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState(displayName ?? "");
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const registrationPasswordError = useMemo(() => getPasswordValidationError(password), [password]);

  // Load avatar URL when modal opens and user is connected
  useEffect(() => {
    if (!open || !isConnected || !isConfigured) return;
    const supabase = getSupabaseClient();
    supabase.auth.getUser()
      .then(({ data }) => {
        if (!data.user) return;
        return supabase.from("forum_profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .single();
      })
      .then((res) => {
        if (res?.data?.avatar_url) setAvatarUrl(res.data.avatar_url);
      })
      .catch(() => {});
  }, [open, isConnected, isConfigured]);

  useEffect(() => {
    if (!open) return;

    const FOCUSABLE =
      `button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])`;

    function getFocusable(): HTMLElement[] {
      const el = panelRef.current;
      if (!el) return [];
      return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = getFocusable();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    }

    const timer = setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 0);

    document.addEventListener("keydown", handleKeyDown);
    const unlockBodyScroll = lockBodyScroll();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || isConnected) return;

    const pending = readPendingRegistration();
    if (pending && mode !== "register") {
      setMode("register");
      return;
    }
    if (mode !== "register") return;

    if (!pending) return;

    setEmail((current) => current || pending.email);
    setDisplayNameInput((current) => current || pending.displayName);
    setOtpSent(pending.otpSent);
  }, [open, isConnected, mode]);

  // Pre-fill display name when setting password for the first time.
  useEffect(() => {
    if (isConnected && needsPassword && !displayName) {
      const pending = readPendingRegistration();
      const restored = pending?.displayName ?? "";

      if (restored) {
        setDisplayNameInput(restored);
        setDisplayName(restored).catch(() => {});
      } else if (signedInEmail) {
        const at = signedInEmail.indexOf("@");
        if (at > 0) {
          setDisplayNameInput(signedInEmail.slice(0, at));
        }
      }
    }
  }, [isConnected, needsPassword, displayName, signedInEmail, setDisplayName]);

  useEffect(() => {
    if (!open || isConnected || mode !== "register") return;

    const trimmedName = displayNameInput.trim();
    const trimmedEmail = normalizedEmail;
    if (!trimmedEmail && !trimmedName && !otpSent) {
      clearPendingRegistration();
      return;
    }

    writePendingRegistration({
      email: trimmedEmail,
      displayName: trimmedName,
      otpSent,
    });
  }, [open, isConnected, mode, normalizedEmail, displayNameInput, otpSent]);

  useEffect(() => {
    if (!needsPassword) {
      clearPendingRegistration();
    }
  }, [needsPassword]);

  if (!open) return null;

  // ---- 注册流程：发送验证码 ----
  async function handleSendCode() {
    const displayNameError = getDisplayNameValidationError(displayNameInput);
    if (displayNameError) {
      setError(displayNameError);
      return;
    }
    if (!normalizedEmail) {
      setError("请输入邮箱。");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("请输入有效的邮箱地址。");
      return;
    }
    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const result = await sendEmailCode(normalizedEmail);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "发送失败，请稍后重试。");
      return;
    }

    setOtpSent(true);
    writePendingRegistration({
      email: normalizedEmail,
      displayName: displayNameInput.trim(),
      otpSent: true,
    });
    setNotice("验证码已发送！请查收邮箱（别忘了检查垃圾邮件箱）。");
  }

  // ---- 注册流程：验证验证码 + 设置密码 ----
  async function handleVerifyAndRegister() {
    const displayNameError = getDisplayNameValidationError(displayNameInput);
    if (displayNameError) {
      setError(displayNameError);
      return;
    }
    if (!normalizedEmail) {
      setError("请输入邮箱。");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("请输入有效的邮箱地址。");
      return;
    }
    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    if (otpCode.trim().length < OTP_CODE_MIN_LENGTH || otpCode.trim().length > OTP_CODE_MAX_LENGTH) {
      setError(`请输入 ${OTP_CODE_MIN_LENGTH}-${OTP_CODE_MAX_LENGTH} 位数字验证码。`);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    // Step 1: Verify OTP
    const result = await verifyOtp(normalizedEmail, otpCode.trim());
    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? "验证失败，请检查验证码是否正确。");
      return;
    }

    const pending = readPendingRegistration();
    const finalDisplayName = pending?.displayName?.trim() || displayNameInput.trim();

    // Step 3: Set password and display name
    const setResult = await setPassword(password, finalDisplayName || undefined);
    if (!setResult.ok) {
      setLoading(false);
      writePendingRegistration({
        email: normalizedEmail,
        displayName: finalDisplayName,
        otpSent: true,
      });
      setError(setResult.error ?? "邮箱验证已完成，但设置密码失败，请重新设置密码。");
      return;
    }
    if (finalDisplayName) {
      await setDisplayName(finalDisplayName).catch(() => {});
    }

    setLoading(false);
    setOtpSent(false);
    setOtpCode("");
    setPasswordValue("");
    setConfirmPassword("");
    setDisplayNameInput("");
    clearPendingRegistration();
    setNotice(
      setResult.warning
        ? `✓ 注册成功，密码已设置。${setResult.warning}`
        : "✓ 注册成功！欢迎来到 Timix观察站。",
    );
  }

  // ---- 登录流程 ----
  async function handlePasswordLogin() {
    setLoading(true);
    setError("");
    setNotice("");

    const result = await signInWithPassword(normalizedEmail, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "登录失败，请稍后重试。");
      return;
    }

    setPasswordValue("");
  }

  async function handleSetPassword() {
    const displayNameError = getDisplayNameValidationError(displayNameInput);
    if (displayNameError) {
      setError(displayNameError);
      return;
    }
    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const result = await setPassword(password, displayNameInput.trim() || undefined);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "设置失败，请稍后重试。");
      return;
    }

    setPasswordValue("");
    setConfirmPassword("");
    setDisplayNameInput("");
    clearPendingRegistration();
    setNotice(
      result.warning
        ? `✓ 密码已设置完成。${result.warning}`
        : "✓ 密码已设置完成！下次可以直接用邮箱和密码登录。",
    );
  }

  async function handleAvatarChange(file: File) {
    const uploadError = getForumImageUploadError(file);
    if (uploadError) {
      setError(uploadError);
      return;
    }

    setAvatarUploading(true);
    setError("");
    try {
      const url = await uploadAvatar(file);
      await updateProfileAvatar(url);
      setAvatarUrl(url);
      setNotice("头像已更新。");
    } catch {
      setError("头像上传失败，请稍后重试。");
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  }

  // ---- 切换模式时重置状态 ----
  function switchToLogin() {
    setMode("login");
    setError("");
    setNotice("");
    setOtpSent(false);
    setOtpCode("");
    setDisplayNameInput("");
    setPasswordValue("");
    setConfirmPassword("");
    clearPendingRegistration();
  }

  function switchToRegister() {
    setMode("register");
    setError("");
    setNotice("");
    setOtpSent(false);
    setOtpCode("");
    setPasswordValue("");
    setConfirmPassword("");
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div ref={panelRef} aria-labelledby="auth-modal-title" className="w-full max-w-md rounded-[12px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
        {!isConfigured ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink)]" id="auth-modal-title">
                论坛登录未配置
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                请先配置 Supabase URL 和匿名密钥。
              </p>
            </div>
            <button
              className="w-full rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
              onClick={onClose}
              type="button"
            >
              关闭
            </button>
          </div>
        ) : isLoading ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">
            正在读取登录状态...
          </p>
        ) : isConnected ? (
          /* ============================================
             已登录状态：个人资料 + 修改昵称 + 头像
             ============================================ */
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink)]" id="auth-modal-title">
                {needsPassword ? "设置登录密码" : "已登录"}
              </h2>
              {needsPassword ? (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  设置密码完成注册
                </p>
              ) : (
                <div className="mt-1.5 space-y-1">
                  <p className="text-xs text-[var(--color-muted)]">
                    已登录：{signedInEmail ?? "当前邮箱"}
                  </p>
                  <p className="text-xs font-semibold">
                    {isAdmin ? (
                      <span className="text-[#b45309]">管理员账号</span>
                    ) : (
                      <span className="text-[var(--color-muted)]">普通用户</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {needsPassword ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-muted)]">
                  请设置密码和昵称。
                </p>
                <label className="sr-only" htmlFor="auth-setup-name">昵称</label>
                <input
                  aria-describedby={error ? "auth-error" : undefined}
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  id="auth-setup-name"
                  onChange={(event) => {
                    setDisplayNameInput(event.target.value);
                    setError("");
                  }}
                  placeholder="你的昵称（会显示在帖子旁边）"
                  type="text"
                  value={displayNameInput}
                  maxLength={80}
                />
                <label className="sr-only" htmlFor="auth-setup-password">设置密码</label>
                <input
                  aria-describedby={error ? "auth-error" : undefined}
                  aria-invalid={error && registrationPasswordError ? true : undefined}
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  id="auth-setup-password"
                  onChange={(event) => {
                    setPasswordValue(event.target.value);
                    setError("");
                  }}
                  placeholder="设置密码"
                  type="password"
                  value={password}
                />
                <label className="sr-only" htmlFor="auth-setup-confirm">确认密码</label>
                <input
                  aria-describedby={error ? "auth-error" : undefined}
                  aria-invalid={error && password !== confirmPassword ? true : undefined}
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  id="auth-setup-confirm"
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="再次输入密码"
                  type="password"
                  value={confirmPassword}
                />
                <button
                  className="w-full rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-60"
                  disabled={loading || Boolean(registrationPasswordError) || !confirmPassword}
                  onClick={handleSetPassword}
                  type="button"
                >
                  {loading ? "设置中..." : "保存密码"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Avatar upload */}
                <div className="flex items-center gap-4">
                  <input
                    accept={FORUM_IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleAvatarChange(file);
                    }}
                    ref={avatarFileRef}
                    type="file"
                  />
                  <button
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--color-line)] bg-[var(--color-soft)] transition hover:border-[var(--color-brand)] disabled:opacity-60"
                    disabled={avatarUploading}
                    onClick={() => avatarFileRef.current?.click()}
                    title="点击上传头像"
                    type="button"
                  >
                    {avatarUploading ? (
                      <svg className="h-5 w-5 animate-spin text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : avatarUrl ? (
                      <img alt="头像" className="h-full w-full object-cover" referrerPolicy="no-referrer" src={avatarUrl} />
                    ) : (
                      <svg aria-hidden="true" className="h-5 w-5 text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-5.333 0-8 2.667-8 4v2h16v-2c0-1.333-2.667-4-8-4z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)] truncate">
                      {displayName || signedInEmail}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {avatarUploading ? "上传中..." : avatarUrl ? "点击更换头像" : "点击上传头像"}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[var(--color-muted)]">
                  已登录为 <span className="font-semibold text-[var(--color-ink)]">{signedInEmail}</span>
                </p>
                <label className="sr-only" htmlFor="auth-edit-name">修改昵称</label>
                <input
                  aria-describedby={error ? "auth-error" : undefined}
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  id="auth-edit-name"
                  onChange={(event) => {
                    setDisplayNameInput(event.target.value);
                    setError("");
                  }}
                  placeholder="修改昵称"
                  type="text"
                  value={displayNameInput}
                  maxLength={80}
                />
                <div className="flex flex-col gap-3">
                  <button
                    className="w-full rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-60"
                    disabled={loading || !displayNameInput.trim()}
                    onClick={async () => {
                      if (!displayNameInput.trim()) return;
                      setLoading(true);
                      try {
                        await setDisplayName(displayNameInput.trim());
                        setNotice("昵称已更新。");
                      } catch {
                        setError("更新失败，请稍后重试。");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    type="button"
                  >
                    保存昵称
                  </button>
                  <button
                    className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                    onClick={onClose}
                    type="button"
                  >
                    关闭
                  </button>
                  <button
                    className="w-full rounded-full border border-red-200 bg-[#fff1f2] px-5 py-3 text-sm font-bold text-[#be123c] transition hover:bg-[#ffe4e6]"
                    onClick={() => void signOut()}
                    type="button"
                  >
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================
             未登录状态：登录 / 注册
             ============================================ */
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink)]" id="auth-modal-title">
                {mode === "login" ? "登录" : "注册"}
              </h2>
              <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                {mode === "login"
                  ? "已设置密码？直接登录"
                  : otpSent
                    ? "验证码已发送，请查收邮箱"
                    : "首次使用？填写信息注册账号"
                }
              </p>
            </div>

            {/* 登录 / 注册 标签切换 */}
            <div className="grid grid-cols-2 rounded-full bg-[var(--color-soft)] p-1">
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === "login"
                    ? "bg-[var(--color-panel)] text-[var(--color-ink)] shadow-sm"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
                onClick={switchToLogin}
                type="button"
              >
                登录
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === "register"
                    ? "bg-[var(--color-panel)] text-[var(--color-ink)] shadow-sm"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
                onClick={switchToRegister}
                type="button"
              >
                注册
              </button>
            </div>

            <div className="space-y-3">
              {/* 邮箱 */}
              <label className="sr-only" htmlFor="auth-email">邮箱地址</label>
              <input
                aria-describedby={error ? "auth-error" : undefined}
                aria-invalid={error && !normalizedEmail ? true : undefined}
                className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                id="auth-email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="邮箱地址"
                type="email"
                value={email}
              />

              {mode === "login" ? (
                /* ---- 登录模式 ---- */
                <>
                  <label className="sr-only" htmlFor="auth-password">密码</label>
                  <input
                    aria-describedby={error ? "auth-error" : undefined}
                    aria-invalid={error && !password ? true : undefined}
                    className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                    id="auth-password"
                    onChange={(event) => {
                      setPasswordValue(event.target.value);
                      setError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !loading && normalizedEmail && password) {
                        event.preventDefault();
                        handlePasswordLogin();
                      }
                    }}
                    placeholder="输入密码"
                    type="password"
                    value={password}
                  />
                  <p className="text-xs text-[var(--color-muted)]">
                    首次使用？{" "}
                    <button
                      className="text-[var(--color-brand)] underline"
                      onClick={switchToRegister}
                      type="button"
                    >
                      点击注册
                    </button>
                  </p>
                </>
              ) : (
                /* ---- 注册模式 ---- */
                <>
                  {!otpSent ? (
                    /* 第一步：填写注册信息 */
                    <>
                      <label className="sr-only" htmlFor="auth-display-name">昵称</label>
                      <input
                        aria-describedby={error ? "auth-error" : undefined}
                        aria-invalid={error && !displayNameInput.trim() ? true : undefined}
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                        id="auth-display-name"
                        onChange={(event) => {
                          setDisplayNameInput(event.target.value);
                          setError("");
                        }}
                        placeholder="你的昵称（会显示在帖子旁边）"
                        type="text"
                        value={displayNameInput}
                        maxLength={80}
                      />
                      <label className="sr-only" htmlFor="auth-reg-password">密码</label>
                      <input
                        aria-describedby={error ? "auth-error" : undefined}
                        aria-invalid={error && registrationPasswordError ? true : undefined}
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                        id="auth-reg-password"
                        onChange={(event) => {
                          setPasswordValue(event.target.value);
                          setError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !loading && normalizedEmail && displayNameInput.trim() && password && confirmPassword && !registrationPasswordError) {
                            event.preventDefault();
                            handleSendCode();
                          }
                        }}
                        placeholder="设置密码"
                        type="password"
                        value={password}
                      />
                      <label className="sr-only" htmlFor="auth-confirm-password">确认密码</label>
                      <input
                        aria-describedby={error ? "auth-error" : undefined}
                        aria-invalid={error && password !== confirmPassword ? true : undefined}
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                        id="auth-confirm-password"
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !loading && normalizedEmail && displayNameInput.trim() && password && confirmPassword && !registrationPasswordError) {
                            event.preventDefault();
                            handleSendCode();
                          }
                        }}
                        placeholder="再次输入密码"
                        type="password"
                        value={confirmPassword}
                      />
                      <p className="text-xs text-[var(--color-muted)]">
                        已有账号？{" "}
                        <button
                          className="text-[var(--color-brand)] underline"
                          onClick={switchToLogin}
                          type="button"
                        >
                          直接登录
                        </button>
                      </p>
                    </>
                  ) : (
                    /* 第二步：输入验证码 */
                    <>
                      <div className="rounded-[12px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3">
                        <p className="text-xs text-[var(--color-muted)]">注册信息</p>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{normalizedEmail}</p>
                        <p className="text-xs text-[var(--color-muted)]">昵称：{displayNameInput || "未填写"}</p>
                      </div>
                      <label className="sr-only" htmlFor="auth-otp-code">验证码</label>
                      <input
                        aria-describedby={error ? "auth-error" : undefined}
                        aria-invalid={error && otpCode.length < OTP_CODE_MIN_LENGTH ? true : undefined}
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-center text-lg tracking-[0.5em] outline-none transition focus:border-[var(--color-brand)]"
                        id="auth-otp-code"
                        onChange={(event) => {
                          setOtpCode(event.target.value.replace(/\D/g, ""));
                          setError("");
                        }}
                        placeholder={`输入 ${OTP_CODE_MIN_LENGTH}-${OTP_CODE_MAX_LENGTH} 位验证码`}
                        type="text"
                        inputMode="numeric"
                        maxLength={OTP_CODE_MAX_LENGTH}
                        value={otpCode}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <button
                          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)]"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpCode("");
                            setError("");
                            setNotice("");
                          }}
                          type="button"
                        >
                          ← 返回修改信息
                        </button>
                        <button
                          className="text-xs text-[var(--color-brand)] hover:underline"
                          onClick={handleSendCode}
                          disabled={loading}
                          type="button"
                        >
                          重新发送验证码
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {error ? <p className="text-sm font-semibold text-red-500" id="auth-error" role="alert">{error}</p> : null}
            {notice ? (
              <p className="text-sm font-semibold text-emerald-600" id="auth-notice" role="status">{notice}</p>
            ) : null}

            {/* 缺项提示 */}
            {mode === "register" && !otpSent && !error ? (
              <div className="flex flex-wrap gap-1.5 text-xs text-[var(--color-muted)]">
                {!normalizedEmail ? <span>◌ 请输入邮箱</span> : null}
                {!displayNameInput.trim() ? <span>◌ 请输入昵称</span> : null}
                {!password ? <span>◌ 请设置密码</span> : null}
                {password && !confirmPassword ? <span>◌ 请确认密码</span> : null}
                {password && confirmPassword && password !== confirmPassword ? <span>◌ 两次密码不一致</span> : null}
                {normalizedEmail && displayNameInput.trim() && password && confirmPassword && password === confirmPassword ? (
                  <span className="text-emerald-600">✓ 信息已齐全，点击发送验证码</span>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                onClick={onClose}
                type="button"
              >
                取消
              </button>
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-60"
                disabled={
                  loading ||
                  !normalizedEmail ||
                  (mode === "login" && !password) ||
                  (mode === "register" &&
                    !otpSent &&
                    (!displayNameInput.trim() || !password || !confirmPassword || Boolean(registrationPasswordError))) ||
                  (mode === "register" && otpSent && (otpCode.length < OTP_CODE_MIN_LENGTH || otpCode.length > OTP_CODE_MAX_LENGTH))
                }
                onClick={mode === "login" ? handlePasswordLogin : otpSent ? handleVerifyAndRegister : handleSendCode}
                type="button"
              >
                {loading ? "处理中..." : mode === "login" ? "登录" : otpSent ? "验证并注册" : "发送验证码"}
              </button>
            </div>
          </div>
        )}

        {isConnected && (error || notice) ? (
          <div className="mt-4">
            {error ? <p className="text-sm font-semibold text-red-500" id="auth-error" role="alert">{error}</p> : null}
            {notice ? (
              <p className="text-sm font-semibold text-emerald-600" id="auth-notice" role="status">{notice}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
