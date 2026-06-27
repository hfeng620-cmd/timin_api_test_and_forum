"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR = [
  "#main-content > main.theme-stage > section",
  "#main-content .route-stage > main.theme-stage > section",
  "#main-content > section[data-reveal]",
  "#main-content > main.theme-stage [data-reveal]",
  "#main-content .route-stage > main.theme-stage [data-reveal]",
].join(", ");

export function ScrollRevealOrchestrator() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.getElementById("main-content");
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observedTargets = new Set<HTMLElement>();
    const visibleTargets = new WeakSet<HTMLElement>();
    let currentTargets: HTMLElement[] = [];
    let scanFrame = 0;
    let hydrationPasses = 2;

    const revealImmediately = (element: HTMLElement) => {
      element.classList.remove("reveal-hidden");
      element.classList.add("reveal-ready", "reveal-visible");
      element.style.removeProperty("--reveal-delay");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            element.classList.remove("reveal-hidden");
            element.classList.add("reveal-visible");
            visibleTargets.add(element);
            return;
          }

          if (visibleTargets.has(element)) return;
          element.classList.remove("reveal-visible");
          element.classList.add("reveal-hidden");
        });
      },
      {
        threshold: [0, 0.12, 0.28],
        rootMargin: "0px 0px -10% 0px",
      },
    );

    const disconnectTargets = () => {
      observedTargets.forEach((target) => observer.unobserve(target));
      observedTargets.clear();
    };

    const collectTargets = () =>
      Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
        (element, index, array) => array.indexOf(element) === index,
      );

    const isInInitialViewport = (element: HTMLElement) => {
      const bounds = element.getBoundingClientRect();
      return bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0;
    };

    const prepareTargets = () => {
      currentTargets = collectTargets();
      disconnectTargets();

      if (currentTargets.length === 0) return;

      const reduceMotion = motionQuery.matches;
      const isFullscreen = document.fullscreenElement !== null;
      const isHydratingRoute = document.documentElement.dataset.routeHydrating === "true";

      currentTargets.forEach((element, index) => {
        if (reduceMotion || isFullscreen) {
          revealImmediately(element);
          visibleTargets.add(element);
          return;
        }

        element.style.setProperty("--reveal-delay", `${Math.min(index, 10) * 60}ms`);
        element.classList.add("reveal-ready");

        const shouldKeepRouteEntranceVisible =
          (isHydratingRoute || hydrationPasses > 0) &&
          (index < 3 || isInInitialViewport(element));

        if (shouldKeepRouteEntranceVisible || isInInitialViewport(element)) {
          element.classList.remove("reveal-hidden");
          element.classList.add("reveal-visible");
          visibleTargets.add(element);
        } else if (!visibleTargets.has(element)) {
          element.classList.remove("reveal-visible");
          element.classList.add("reveal-hidden");
        }

        observer.observe(element);
        observedTargets.add(element);
      });

      if (hydrationPasses > 0) {
        hydrationPasses -= 1;
      }
    };

    const schedulePrepare = () => {
      if (scanFrame) return;
      scanFrame = window.requestAnimationFrame(() => {
        scanFrame = 0;
        prepareTargets();
      });
    };

    const mutationObserver = new MutationObserver(schedulePrepare);

    prepareTargets();
    const settleTimer = window.setTimeout(prepareTargets, 120);
    mutationObserver.observe(root, { childList: true, subtree: true });
    motionQuery.addEventListener("change", schedulePrepare);
    document.addEventListener("fullscreenchange", schedulePrepare);

    return () => {
      if (scanFrame) {
        window.cancelAnimationFrame(scanFrame);
      }
      window.clearTimeout(settleTimer);
      mutationObserver.disconnect();
      motionQuery.removeEventListener("change", schedulePrepare);
      document.removeEventListener("fullscreenchange", schedulePrepare);
      observer.disconnect();
      currentTargets.forEach((element) => {
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, [pathname]);

  return null;
}
