"use client";

import { useEffect, useMemo, useState } from "react";

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
    sendEmailCode,
    signInWithPassword,
    setPassword,
    signOut,
  } = useForumAuth();

  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);


  if (!open) return null;

  async function handleSendCode() {
    setLoading(true);
    setError("");
    setNotice("");

    const result = await sendEmailCode(normalizedEmail);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "发送失败，请稍后重试。");
      return;
    }

    setNotice("验证码邮件已发送，请在邮箱中打开验证链接。验证后回到这里设置密码。");
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

    const result = await setPassword(password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "设置失败，请稍后重试。");
      return;
    }

    setPasswordValue("");
    setConfirmPassword("");
    setNotice("密码已设置，下次可以直接用邮箱和密码登录。");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
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
              className="w-full rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
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
                  请设置密码以便下次直接登录。
                </p>
                <input
                  className="w-full rounded-[8px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(event) => {
                    setPasswordValue(event.target.value);
                    setError("");
                  }}
                  placeholder="设置密码，至少 8 位"
                  type="password"
                  value={password}
                />
                <input
                  className="w-full rounded-[8px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="再次输入密码"
                  type="password"
                  value={confirmPassword}
                />
                <button
                  className="w-full rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-60"
                  disabled={loading || password.length < 8 || !confirmPassword}
                  onClick={handleSetPassword}
                  type="button"
                >
                  {loading ? "设置中..." : "保存密码"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-muted)]">
                  已登录为 <span className="font-semibold text-[var(--color-ink)]">{signedInEmail}</span>
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    className="w-full rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                    onClick={onClose}
                    type="button"
                  >
                    继续浏览
                  </button>
                  <button
                    className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
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
                  输入邮箱和密码登录
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  ① 输入邮箱 → ② 验证邮箱 → ③ 设密码
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
                className="w-full rounded-[8px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
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
                    className="w-full rounded-[8px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                    onChange={(event) => {
                      setPasswordValue(event.target.value);
                      setError("");
                    }}
                    placeholder="密码"
                    type="password"
                    value={password}
                  />
                  <p className="text-xs text-[var(--color-muted)]">
                    首次使用？点击{" "}
                    <button
                      className="text-[var(--color-brand)] underline"
                      onClick={() => {
                        setMode("code");
                        setError("");
                        setNotice("");
                      }}
                      type="button"
                    >
                      邮箱验证码注册
                    </button>{" "}
                    先注册账号
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
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                onClick={onClose}
                type="button"
              >
                取消
              </button>
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-60"
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

