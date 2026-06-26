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

    const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
      (element, index, array) => array.indexOf(element) === index,
    );

    if (targets.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      targets.forEach((element) => {
        element.classList.remove("reveal-hidden");
        element.classList.add("reveal-visible");
      });
      return;
    }

    // Check if we're in fullscreen mode
    const isFullscreen = document.fullscreenElement !== null;

    targets.forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index, 10) * 60}ms`);
      element.classList.add("reveal-ready");

      const bounds = element.getBoundingClientRect();
      if (isFullscreen || (bounds.top < window.innerHeight * 0.84 && bounds.bottom > window.innerHeight * 0.08)) {
        element.classList.remove("reveal-hidden");
        element.classList.add("reveal-visible");
        return;
      }

      element.classList.remove("reveal-visible");
      element.classList.add("reveal-hidden");
    });

    // In fullscreen mode, skip IntersectionObserver to prevent flickering
    if (isFullscreen) {
      targets.forEach((element) => {
        element.classList.remove("reveal-hidden");
        element.classList.add("reveal-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            element.classList.remove("reveal-hidden");
            element.classList.add("reveal-visible");
            return;
          }

          element.classList.remove("reveal-visible");
          element.classList.add("reveal-hidden");
        });
      },
      {
        threshold: [0, 0.12, 0.28],
        rootMargin: "-8% 0px -14% 0px",
      },
    );

    targets.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
