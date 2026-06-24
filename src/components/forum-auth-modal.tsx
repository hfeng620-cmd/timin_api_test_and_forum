"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { uploadAvatar, updateProfileAvatar } from "@/lib/discussion-storage";
import { getSupabaseClient } from "@/lib/supabase";
import { useForumAuth } from "@/lib/forum-auth";

type ForumAuthModalProps = {
  open: boolean;
  onClose: () => void;
};

type AuthMode = "code" | "password";

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
  } = useForumAuth();

  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState(displayName ?? "");
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);


  // Pre-fill display name when setting password for the first time.
  // Priority: name from registration tab (sessionStorage) > email username fallback.
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
        // Auto-save the display name so it persists even if they skip password setup
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

  async function handleSendCode() {
    setLoading(true);
    setError("");
    setNotice("");

    // Persist display name across the email verification round-trip
    if (displayNameInput.trim()) {
      try {
        sessionStorage.setItem("forum-reg-display-name", displayNameInput.trim());
      } catch {
        /* sessionStorage may be unavailable */
      }
    }

    const result = await sendEmailCode(normalizedEmail);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "发送失败，请稍后重试。");
      return;
    }

    setNotice(
      "验证邮件已发送！请查收邮箱（别忘了检查垃圾邮件箱），点击邮件中的链接即可完成注册。注册成功后回到本页面设置密码。",
    );
  }

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
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  已登录：{signedInEmail ?? "当前邮箱"}
                </p>
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
                      <svg
                        className="h-5 w-5 animate-spin text-[var(--color-muted)]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : avatarUrl ? (
                      <img
                        alt="头像"
                        className="h-full w-full object-cover"
                        src={avatarUrl}
                      />
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5 text-[var(--color-muted)]"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-5.333 0-8 2.667-8 4v2h16v-2c0-1.333-2.667-4-8-4z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
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
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink)]">
                论坛登录
              </h2>
              {mode === "password" ? (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  已设置密码？直接登录
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  首次使用？输入邮箱获取验证链接
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 rounded-full bg-[var(--color-soft)] p-1">
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === "password"
                    ? "bg-[var(--color-panel)] text-[var(--color-ink)] shadow-sm"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
                onClick={() => {
                  setMode("password");
                  setError("");
                  setNotice("");
                }}
                type="button"
              >
                密码登录
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  mode === "code"
                    ? "bg-[var(--color-panel)] text-[var(--color-ink)] shadow-sm"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
                onClick={() => {
                  setMode("code");
                  setError("");
                  setNotice("");
                }}
                type="button"
              >
                邮箱验证
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                type="email"
                value={email}
              />

              {mode === "password" ? (
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
                    首次使用？当前需要先走{" "}
                    <button
                      className="text-[var(--color-brand)] underline"
                      onClick={() => {
                        setMode("code");
                        setError("");
                        setNotice("");
                      }}
                      type="button"
                    >
                      邮箱验证注册
                    </button>{" "}
                    ，完成邮箱验证后再回来设置密码
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--color-muted)]">
                  已注册过？点击{" "}
                  <button
                    className="text-[var(--color-brand)] underline"
                    onClick={() => {
                      setMode("password");
                      setError("");
                      setNotice("");
                    }}
                    type="button"
                  >
                    密码登录
                  </button>{" "}
                  直接登录
                </p>
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
                disabled={loading || !normalizedEmail || (mode === "password" && !password)}
                onClick={mode === "password" ? handlePasswordLogin : handleSendCode}
                type="button"
              >
                {loading ? "处理中..." : mode === "password" ? "登录" : "发送验证邮件"}
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