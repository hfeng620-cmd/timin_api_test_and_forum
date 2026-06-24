"use client";

import { useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";

type StationRowLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

const DRAG_THRESHOLD = 10;

export function StationRowLink({ href, className, children }: StationRowLinkProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    startRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLAnchorElement>) {
    if (!startRef.current) return;

    const deltaX = Math.abs(event.clientX - startRef.current.x);
    const deltaY = Math.abs(event.clientY - startRef.current.y);
    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
      draggingRef.current = true;
    }
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!draggingRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    draggingRef.current = false;
  }

  return (
    <a
      className={className}
      href={href}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
