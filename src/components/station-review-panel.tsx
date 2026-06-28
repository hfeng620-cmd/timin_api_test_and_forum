"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";
import { isOfficialStationId } from "@/lib/station-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StationReview = {
  id: string;
  station_id: string;
  author_id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
};

type StationReviewPanelProps = {
  stationId: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// Inline SVG star (filled / outlined)
// ---------------------------------------------------------------------------

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "#f59e0b" : "none"}
      stroke={filled ? "#f59e0b" : "var(--color-muted)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StationReviewPanel({ stationId }: StationReviewPanelProps) {
  const { isConnected, showAuthModal } = useForumAuth();
  const canUseReviews = isOfficialStationId(stationId);

  // ---- data ---------------------------------------------------------------
  const [reviews, setReviews] = useState<StationReview[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- form state ---------------------------------------------------------
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const REVIEW_MIN = 10;
  const REVIEW_MAX = 2000;

  // =========================================================================
  // Load approved reviews
  // =========================================================================

  const loadReviews = useCallback(async () => {
    if (!canUseReviews || !isSupabaseConfigured()) {
      setReviews([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await getSupabaseClient()
        .from("station_reviews_public")
        .select("*")
        .eq("station_id", stationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews((data ?? []) as StationReview[]);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [canUseReviews, stationId]);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) {
      setLoading(true);
      loadReviews();
    }
    return () => { cancelled = true; };
  }, [loadReviews]);

  // =========================================================================
  // Submit handler
  // =========================================================================

  async function handleSubmit() {
    if (!isConnected) {
      showAuthModal();
      return;
    }

    if (!canUseReviews) {
      setStatus("这条站点还没有进入正式榜单，先保存为正式站点后再评价。");
      return;
    }

    if (rating === 0) {
      setStatus("请选择评分（1-5星）。");
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setStatus("请输入评价内容。");
      return;
    }

    if (trimmedBody.length < REVIEW_MIN) {
      setStatus(`评价内容至少需要 ${REVIEW_MIN} 个字符（当前 ${trimmedBody.length} 个）。`);
      return;
    }

    if (trimmedBody.length > REVIEW_MAX) {
      setStatus(`评价内容不能超过 ${REVIEW_MAX} 个字符（当前 ${trimmedBody.length} 个）。`);
      return;
    }

    setSubmitting(true);
    setStatus("");
    try {
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        showAuthModal();
        return;
      }

      await checkRateLimit(userData.user.id, "station_reviews");

      const { error } = await supabase
        .from("station_reviews")
        .insert({
          station_id: stationId,
          author_id: userData.user.id,
          rating,
          body: body.trim(),
          is_approved: false,
        });

      if (error) throw error;

      setBody("");
      setRating(0);
      setFormOpen(false);
      setStatus("评价已提交，等待审核");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  // =========================================================================
  // Render helpers
  // =========================================================================

  function renderStars(current: number, interactive: boolean) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = interactive
            ? star <= (hoverRating || rating)
            : star <= current;

          return interactive ? (
            <button
              key={star}
              type="button"
              className="transition hover:scale-110"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star} 星`}
            >
              <StarIcon filled={filled} />
            </button>
          ) : (
            <span key={star}>
              <StarIcon filled={filled} />
            </span>
          );
        })}
      </div>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          社区评价
        </p>
        {!formOpen && (
          <button
            type="button"
            className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
            disabled={!canUseReviews}
            onClick={() => {
              if (!canUseReviews) {
                setStatus("这条站点还没有进入正式榜单，先保存为正式站点后再评价。");
                return;
              }
              if (!isConnected) {
                showAuthModal();
                return;
              }
              setFormOpen(true);
              setStatus("");
            }}
          >
            {isConnected ? "写评价" : "登录后评价"}
          </button>
        )}
      </div>

      {/* ── Status message ── */}
      {status ? (
        <p className="mt-3 text-sm leading-6 text-[var(--color-brand-deep)]">{status}</p>
      ) : null}

      {/* ── Submit form ── */}
      {formOpen ? (
        <div className="mt-4 space-y-4">
          {/* Star selector */}
          <div>
            <p className="mb-2 text-xs font-bold text-[var(--color-muted)]">评分</p>
            {renderStars(0, true)}
            {rating > 0 ? (
              <span className="ml-2 inline-block text-sm font-bold text-[var(--color-ink)]">
                {rating} 星
              </span>
            ) : null}
          </div>

          {/* Body textarea */}
          <textarea
            className="w-full resize-none rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--color-brand)]"
            maxLength={REVIEW_MAX}
            rows={4}
            placeholder="写下你对这个中转站的体验、优缺点或避坑建议..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {body.trim().length === 0
              ? `至少 ${REVIEW_MIN} 字符，最多 ${REVIEW_MAX} 字符`
              : body.trim().length < REVIEW_MIN
                ? `还差 ${REVIEW_MIN - body.trim().length} 个字符（至少 ${REVIEW_MIN} 个）`
                : `剩余 ${REVIEW_MAX - body.trim().length} 个字符`}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "提交中..." : "提交评价"}
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              onClick={() => {
                setFormOpen(false);
                setRating(0);
                setBody("");
                setStatus("");
              }}
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Existing reviews ── */}
      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">加载中...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            暂无评价，成为第一个评价的人吧。
          </p>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel)] p-4"
            >
              {/* Author + rating + date */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold text-[var(--color-ink)]">
                  {review.author_name}
                </span>
                {renderStars(review.rating, false)}
                <span className="text-xs text-[var(--color-muted)]">
                  {formatDate(review.created_at)}
                </span>
              </div>

              {/* Body */}
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink)] whitespace-pre-wrap">
                {review.body}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
