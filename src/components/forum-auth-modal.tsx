"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { uploadAvatar, updateProfileAvatar } from "@/lib/discussion-storage";
import { getSupabaseClient } from "@/lib/supabase";
import { useForumAuth } from "@/lib/forum-auth";

type ForumAuthModalProps = {
  open: boolean;
  onClose: () => void;
};

type AuthMode = "login" | "register";

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
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Pre-fill display name when setting password for the first time.
  useEffect(() => {
    if (isConnected && needsPassword && !displayName) {
      let restored = "";
      try {
        restored = sessionStorage.getItem("forum-reg-display-name") ?? "";
      } catch {
        /* unavailable */
      }

      if (restored) {
        setDisplayNameInput(restored);
        setDisplayName(restored).catch(() => {});
        try {
          sessionStorage.removeItem("forum-reg-display-name");
        } catch {
          /* unavailable */
        }
      } else if (signedInEmail) {
        const at = signedInEmail.indexOf("@");
        if (at > 0) {
          setDisplayNameInput(signedInEmail.slice(0, at));
        }
      }
    }
  }, [isConnected, needsPassword, displayName, signedInEmail, setDisplayName]);

  if (!open) return null;

  // ---- 注册流程：发送验证码 ----
  async function handleSendCode() {
    if (!displayNameInput.trim()) {
      setError("请输入昵称。");
      return;
    }
    if (!password) {
      setError("请输入密码。");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    // Persist display name and password for after OTP verification
    try {
      sessionStorage.setItem("forum-reg-display-name", displayNameInput.trim());
      sessionStorage.setItem("forum-reg-password", password);
    } catch {
      /* sessionStorage may be unavailable */
    }

    const result = await sendEmailCode(normalizedEmail);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "发送失败，请稍后重试。");
      return;
    }

    setOtpSent(true);
    setNotice("验证码已发送！请查收邮箱（别忘了检查垃圾邮件箱）。");
  }

  // ---- 注册流程：验证验证码 + 设置密码 ----
  async function handleVerifyAndRegister() {
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

    // Step 2: Get stored password and display name
    let storedPassword = "";
    let storedName = "";
    try {
      storedPassword = sessionStorage.getItem("forum-reg-password") ?? "";
      storedName = sessionStorage.getItem("forum-reg-display-name") ?? "";
      sessionStorage.removeItem("forum-reg-password");
      sessionStorage.removeItem("forum-reg-display-name");
    } catch {
      /* unavailable */
    }

    // Step 3: Set password and display name
    if (storedPassword) {
      const setResult = await setPassword(storedPassword, storedName || undefined);
      if (!setResult.ok) {
        setLoading(false);
        setError(setResult.error ?? "注册成功但设置密码失败，请在个人设置中重新设置。");
        return;
      }
    }

    if (storedName) {
      await setDisplayName(storedName).catch(() => {});
    }

    setLoading(false);
    setOtpSent(false);
    setOtpCode("");
    setPasswordValue("");
    setConfirmPassword("");
    setDisplayNameInput("");
    setNotice("✓ 注册成功！欢迎来到 Timix观察站。");
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
    setNotice("✓ 密码已设置完成！下次可以直接用邮箱和密码登录。");
  }

  async function handleAvatarChange(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("头像图片不能超过 2MB。");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="w-full max-w-md rounded-[12px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
        {!isConfigured ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink)]">
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
              <h2 className="text-lg font-bold text-[var(--color-ink)]">
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
                <input
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(event) => {
                    setDisplayNameInput(event.target.value);
                    setError("");
                  }}
                  placeholder="你的昵称（会显示在帖子旁边）"
                  type="text"
                  value={displayNameInput}
                  maxLength={80}
                />
                <input
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(event) => {
                    setPasswordValue(event.target.value);
                    setError("");
                  }}
                  placeholder="设置密码，8位以上，含大写字母和数字"
                  type="password"
                  value={password}
                />
                <input
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
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
                  disabled={loading || password.length < 8 || !confirmPassword}
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
                    accept="image/*"
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
                      <img alt="头像" className="h-full w-full object-cover" src={avatarUrl} />
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
                <input
                  className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
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
              <h2 className="text-lg font-bold text-[var(--color-ink)]">
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
              <input
                className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
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
                  <input
                    className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                    onChange={(event) => {
                      setPasswordValue(event.target.value);
                      setError("");
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
                      <input
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(event) => {
                          setDisplayNameInput(event.target.value);
                          setError("");
                        }}
                        placeholder="你的昵称（会显示在帖子旁边）"
                        type="text"
                        value={displayNameInput}
                        maxLength={80}
                      />
                      <input
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(event) => {
                          setPasswordValue(event.target.value);
                          setError("");
                        }}
                        placeholder="设置密码"
                        type="password"
                        value={password}
                      />
                      <input
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setError("");
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
                      <input
                        className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-center text-lg tracking-[0.5em] outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(event) => {
                          setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8));
                          setError("");
                        }}
                        placeholder="输入 8 位验证码"
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
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

            {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
            {notice ? (
              <p className="text-sm font-semibold text-emerald-600">{notice}</p>
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
                  (mode === "register" && !otpSent && (!displayNameInput.trim() || !password || !confirmPassword)) ||
                  (mode === "register" && otpSent && otpCode.length < 1)
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
            {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
            {notice ? (
              <p className="text-sm font-semibold text-emerald-600">{notice}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
