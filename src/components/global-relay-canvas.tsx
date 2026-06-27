"use client";

import { usePathname } from "next/navigation";

import { RelayNetworkCanvas } from "@/components/relay-network-canvas";

const CANVAS_ROUTES = new Set(["/stations", "/community", "/models", "/guides", "/profile"]);

export function GlobalRelayCanvas() {
  const pathname = usePathname();
  const enabled = CANVAS_ROUTES.has(pathname);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      data-selection-comments="off"
    >
      <RelayNetworkCanvas className="opacity-45" />
    </div>
  );
}
