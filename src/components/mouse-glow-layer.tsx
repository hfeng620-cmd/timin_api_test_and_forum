"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const ENABLED_PATHS = new Set(["/", "/stations", "/community", "/guides", "/models"]);

interface Particle {
  x: number;
  y: number;
  ox: number; // random offset X for organic feel
  oy: number; // random offset Y for organic feel
  createdAt: number;
}

const MAX_PARTICLES = 16;
const PARTICLE_LIFETIME_MS = 800;
const PARTICLE_RADIUS = 3.5;
const PARTICLE_MAX_OPACITY = 0.5;

/**
 * Reads a CSS custom property from the document root and extracts
 * R, G, B channel values as numbers 0-255.
 */
function getBrandRgb(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim();
  // Handles "r g b", "r,g,b", "rgb(r,g,b)", "#rrggbb", etc.
  const match = raw.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (match) {
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  // Default: a neutral indigo-ish fallback so the trail is never invisible
  return [99, 102, 241];
}

export function MouseGlowLayer() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const enabled = ENABLED_PATHS.has(pathname);

    if (!enabled) {
      root.dataset.mouseGlow = "off";
      root.style.setProperty("--mouse-glow-opacity", "0");
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const isActive = !reducedMotion.matches && finePointer.matches;

    // ── CSS radial-glow (existing behaviour, fully preserved) ──────────
    let glowRafId = 0;
    let currentX = window.innerWidth * 0.62;
    let currentY = 220;
    let targetX = currentX;
    let targetY = currentY;

    function renderGlow() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      root.style.setProperty("--mouse-x", `${currentX}px`);
      root.style.setProperty("--mouse-y", `${currentY}px`);

      if (Math.abs(targetX - currentX) > 0.4 || Math.abs(targetY - currentY) > 0.4) {
        glowRafId = window.requestAnimationFrame(renderGlow);
      } else {
        glowRafId = 0;
      }
    }

    function queueGlowRender() {
      if (glowRafId === 0) {
        glowRafId = window.requestAnimationFrame(renderGlow);
      }
    }

    root.dataset.mouseGlow = isActive ? "on" : "off";
    root.style.setProperty("--mouse-glow-opacity", isActive ? "0.58" : "0");
    root.style.setProperty("--mouse-x", `${currentX}px`);
    root.style.setProperty("--mouse-y", `${currentY}px`);

    // ── Canvas particle trail ───────────────────────────────────────────
    const canvas = canvasRef.current;
    if (!canvas) return;

    let particles: Particle[] = [];
    let canvasRafId = 0;
    let ctx: CanvasRenderingContext2D | null = null;
    let brandR = 99;
    let brandG = 102;
    let brandB = 241;

    function initCanvas() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      // Resolve --color-brand once; re-read on resize in case theme changes
      [brandR, brandG, brandB] = getBrandRgb();
    }

    function drawParticles(now: number) {
      const c = canvas;
      if (!ctx || !c) return;
      ctx.clearRect(0, 0, c.width, c.height);

      // Cull expired particles
      particles = particles.filter((p) => now - p.createdAt < PARTICLE_LIFETIME_MS);

      for (const p of particles) {
        const age = now - p.createdAt;
        const progress = age / PARTICLE_LIFETIME_MS; // 0 → 1
        const alpha = PARTICLE_MAX_OPACITY * (1 - progress);
        const radius = PARTICLE_RADIUS * (1 - progress * 0.5);

        ctx.beginPath();
        ctx.arc(p.x + p.ox, p.y + p.oy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandR},${brandG},${brandB},${alpha})`;
        ctx.fill();
      }
    }

    function shouldAnimate() {
      return particles.length > 0;
    }

    function runCanvasLoop(now: number) {
      drawParticles(now);
      if (shouldAnimate()) {
        canvasRafId = requestAnimationFrame(runCanvasLoop);
      } else {
        canvasRafId = 0;
      }
    }

    // Throttle particle spawn to ~30 Hz so the trail is sparse and subtle
    let spawnThrottle: ReturnType<typeof setTimeout> | null = null;

    function spawnParticle(clientX: number, clientY: number) {
      const ox = (Math.random() - 0.5) * 6; // ±3 px jitter
      const oy = (Math.random() - 0.5) * 6;
      particles.push({ x: clientX, y: clientY, ox, oy, createdAt: performance.now() });

      // Cap total count
      if (particles.length > MAX_PARTICLES) {
        particles = particles.slice(particles.length - MAX_PARTICLES);
      }
    }

    function startCanvasLoopIfNeeded() {
      if (canvasRafId === 0 && particles.length > 0) {
        canvasRafId = requestAnimationFrame(runCanvasLoop);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (reducedMotion.matches || !finePointer.matches) return;

      // ── CSS glow ──
      root.dataset.mouseGlow = "on";
      root.style.setProperty("--mouse-glow-opacity", "1");
      targetX = event.clientX;
      targetY = event.clientY;
      queueGlowRender();

      // ── Particle trail ──
      if (!spawnThrottle) {
        spawnParticle(event.clientX, event.clientY);
        startCanvasLoopIfNeeded();
        spawnThrottle = setTimeout(() => {
          spawnThrottle = null;
        }, 32);
      }
    }

    function handlePointerLeave() {
      // CSS glow — drift back to hero position
      root.style.setProperty("--mouse-glow-opacity", "0.3");
      targetX = window.innerWidth * 0.62;
      targetY = 220;
      queueGlowRender();

      // Canvas: let trailing particles fade out gracefully; no new spawns
    }

    function handleResize() {
      initCanvas();
    }

    if (isActive) {
      initCanvas();
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerleave", handlePointerLeave);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      root.dataset.mouseGlow = "off";
      root.style.setProperty("--mouse-glow-opacity", "0");

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);

      if (glowRafId !== 0) {
        window.cancelAnimationFrame(glowRafId);
      }
      if (canvasRafId !== 0) {
        window.cancelAnimationFrame(canvasRafId);
      }
      if (spawnThrottle) {
        clearTimeout(spawnThrottle);
      }
    };
  }, [pathname]);

  return (
    <>
      {/* CSS radial-glow layer (existing) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        data-selection-comments="off"
      />
      {/* Canvas particle-trail layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 1 }}
      />
    </>
  );
}
