"use client";

import { useEffect, useState } from "react";

export type VerseLine = {
  line: string;
  source: string;
  note?: string;
};

type VerseRotatorProps = {
  verses: VerseLine[];
};

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function VerseRotator({ verses }: VerseRotatorProps) {
  const [main, setMain] = useState<VerseLine | null>(null);
  const [secondary, setSecondary] = useState<VerseLine | null>(null);

  useEffect(() => {
    // Shuffle and pick two verses on mount
    const shuffled = shuffleArray(verses);
    setMain(shuffled[0]);
    setSecondary(shuffled[1]);
  }, [verses]);

  if (!main) return null;

  return (
    <div className="my-7 max-w-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        文脉题记 / {main.source}
      </p>
      <p className="home-quote-line mt-3 text-2xl font-black leading-snug text-[var(--color-ink)] sm:text-3xl">
        {main.line}
      </p>
      {main.note ? (
        <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--color-muted)]">
          {main.note}
        </p>
      ) : null}
      {secondary ? (
        <div className="mt-4 border-l border-[rgba(var(--theme-glow-rgb),0.28)] pl-3">
          <p className="text-sm font-semibold leading-7 text-[var(--color-ink)]">
            {secondary.line}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {secondary.source}
          </p>
        </div>
      ) : null}
    </div>
  );
}
