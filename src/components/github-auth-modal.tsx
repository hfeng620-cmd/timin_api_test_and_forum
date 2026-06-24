"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useGithubAuth } from "@/lib/github-auth";

type GithubAuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function GithubAuthModal({ open, onClose }: GithubAuthModalProps) {
  const { isConnected, username, avatar, connect, disconnect } =
    useGithubAuth();

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Escape key handler
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

  async function handleConnect() {
    const trimmed = token.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    const ok = await connect(trimmed);
    setLoading(false);

    if (!ok) {
      setError("Token 无效，请检查是否授权本仓库 Issues 读写权限。");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
        {isConnected ? (
          /* ---- Connected state ---- */
          <div className="flex flex-col items-center gap-4">
            {avatar ? (
              <Image
                alt={username ?? "avatar"}
                className="rounded-full"
                height={40}
                src={avatar}
                unoptimized
                width={40}
              />
            ) : null}

            <div className="text-center">
              <p className="text-lg font-bold text-[var(--color-ink)]">
                {username}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-500">
                已连接
              </p>
            </div>

            <div className="mt-2 flex w-full flex-col gap-3">
              <button
                className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                onClick={() => {
                  disconnect();
                }}
                type="button"
              >
                断开连接
              </button>
              <button
                className="w-full rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                onClick={onClose}
                type="button"
              >
                关闭
              </button>
            </div>
          </div>
        ) : (
          /* ---- Not connected state ---- */
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink)]">
                连接 GitHub
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                填入 GitHub fine-grained Token 以发帖和回复。只给本仓库授权 Issues 读写权限，Token 仅保存在本次浏览器会话。
              </p>
              <a
                className="mt-2 inline-block text-sm font-semibold text-[var(--color-brand-deep)] transition hover:underline"
                href="https://github.com/settings/tokens?type=beta"
                rel="noreferrer"
                target="_blank"
              >
                创建 Token →
              </a>
            </div>

            <textarea
              className="min-h-20 w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
              onChange={(event) => {
                setToken(event.target.value);
                setError("");
              }}
              placeholder="github_pat_..."
              value={token}
            />

            {error ? (
              <p className="text-sm font-semibold text-red-500">{error}</p>
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
                disabled={loading || !token.trim()}
                onClick={handleConnect}
                type="button"
              >
                {loading ? "验证中..." : "验证并连接"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
