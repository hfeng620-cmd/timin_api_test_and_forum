"use client";

import { useState } from "react";

import { normalizeOptionalHttpUrl } from "@/lib/discussion-storage";
import { createSubmission } from "@/lib/submission-storage";

const submissionKinds = ["新站点", "纠错", "补充备注"] as const;

export function SubmissionPanel() {
  const [kind, setKind] = useState<(typeof submissionKinds)[number]>("新站点");
  const [stationName, setStationName] = useState("");
  const [url, setUrl] = useState("");
  const [priceOrRate, setPriceOrRate] = useState("");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState("提交后进入审核区。");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const NOTE_MIN = 10;
  const NOTE_MAX = 2000;
  const STATION_NAME_MAX = 120;
  const CONTACT_MAX = 200;
  const PRICE_OR_RATE_MAX = 120;
  const STATUS_ERROR_CLASS = "text-[var(--color-brand-strong)]";
  const STATUS_NEUTRAL_CLASS = "text-[var(--color-muted)]";
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    const trimmedStationName = stationName.replace(/\s+/g, " ").trim();
    if (!trimmedStationName) {
      setStatusTone("error");
      setStatus("请填写站点名。");
      return;
    }
    if (trimmedStationName.length > STATION_NAME_MAX) {
      setStatusTone("error");
      setStatus(`站点名不能超过 ${STATION_NAME_MAX} 个字符。`);
      return;
    }

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setStatusTone("error");
      setStatus("请填写备注说明。");
      return;
    }

    if (trimmedNote.length < NOTE_MIN) {
      setStatusTone("error");
      setStatus(`备注说明至少需要 ${NOTE_MIN} 个字符（当前 ${trimmedNote.length} 个）。`);
      return;
    }

    if (trimmedNote.length > NOTE_MAX) {
      setStatusTone("error");
      setStatus(`备注说明不能超过 ${NOTE_MAX} 个字符（当前 ${trimmedNote.length} 个）。`);
      return;
    }

    const trimmedPriceOrRate = priceOrRate.replace(/\s+/g, " ").trim();
    if (trimmedPriceOrRate.length > PRICE_OR_RATE_MAX) {
      setStatusTone("error");
      setStatus(`倍率或价格不能超过 ${PRICE_OR_RATE_MAX} 个字符。`);
      return;
    }

    const trimmedContact = contact.replace(/\s+/g, " ").trim();
    if (trimmedContact.length > CONTACT_MAX) {
      setStatusTone("error");
      setStatus(`联系方式或备注来源不能超过 ${CONTACT_MAX} 个字符。`);
      return;
    }

    let normalizedUrl = "";
    try {
      normalizedUrl = normalizeOptionalHttpUrl(url, "地址或入口");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "地址或入口格式不正确。");
      return;
    }

    setIsSubmitting(true);
    setStatusTone("neutral");

    try {
      await createSubmission({
        kind,
        stationName: trimmedStationName,
        url: normalizedUrl,
        priceOrRate: trimmedPriceOrRate,
        note: trimmedNote,
        contact: trimmedContact,
      });

      setStationName("");
      setUrl("");
      setPriceOrRate("");
      setNote("");
      setContact("");
      setStatusTone("neutral");
      setStatus("已提交到待审核区。");
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "提交失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            提交补充
          </p>
          <h2 className="mt-2 text-2xl font-black">提交补充，管理员审核。</h2>
        </div>
        <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
          提交后待审核
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--color-muted)]">提交类型</span>
          <select
            className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setKind(event.target.value as (typeof submissionKinds)[number])}
            value={kind}
          >
            {submissionKinds.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--color-muted)]">站点名</span>
          <input
            className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setStationName(event.target.value)}
            maxLength={STATION_NAME_MAX}
            value={stationName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--color-muted)]">地址或入口</span>
          <input
            className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            type="url"
            value={url}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--color-muted)]">倍率或价格</span>
          <input
            className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setPriceOrRate(event.target.value)}
            maxLength={PRICE_OR_RATE_MAX}
            placeholder="例如：0.12x / GPT 0.2 / 免费"
            value={priceOrRate}
          />
        </label>
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-semibold text-[var(--color-muted)]">备注说明</span>
        <textarea
          className="min-h-28 w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
          maxLength={NOTE_MAX}
          onChange={(event) => setNote(event.target.value)}
          placeholder="写清楚你补充的是什么、看到的价格页面、模型分组、试用信息或需要纠正的内容。"
          value={note}
        />
        <p className={`mt-1 text-xs ${note.trim().length > NOTE_MAX ? "text-[#be123c]" : note.trim().length > 0 && note.trim().length < NOTE_MIN ? "text-[var(--color-muted)]" : "text-[var(--color-muted)]"}`}>
          {note.trim().length === 0
            ? `至少 ${NOTE_MIN} 字符，最多 ${NOTE_MAX} 字符`
            : note.trim().length < NOTE_MIN
              ? `还差 ${NOTE_MIN - note.trim().length} 个字符（至少 ${NOTE_MIN} 个）`
              : `剩余 ${NOTE_MAX - note.trim().length} 个字符`}
        </p>
      </label>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-semibold text-[var(--color-muted)]">联系方式或备注来源</span>
        <input
          className="w-full rounded-[12px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
          onChange={(event) => setContact(event.target.value)}
          maxLength={CONTACT_MAX}
          placeholder="例如：QQ群昵称 / 金山文档来源 / 自己实测"
          value={contact}
        />
      </label>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className={`text-sm leading-6 ${statusTone === "error" ? STATUS_ERROR_CLASS : STATUS_NEUTRAL_CLASS}`}>{status}</p>
        <button
          className="rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={handleSubmit}
          type="button"
        >
          {isSubmitting ? "提交中..." : "提交给管理员审核"}
        </button>
      </div>
    </div>
  );
}
