"use client";

import React, { useEffect, useRef } from "react";

type ParticleFieldProps = {
  /** Positioning on the wrapper (default: fills its positioned parent). */
  className?: string;
  /** px² per particle — smaller = denser (default 14000). */
  density?: number;
  /** Hard cap on particle count (default 55). */
  maxParticles?: number;
  /** Max distance (px) for particle-to-particle connection lines. */
  linkDistance?: number;
  /** Cursor influence radius (px) — particles repel + link to the mouse. */
  mouseRadius?: number;
  /** Base fill colour of red-family particles. */
  colorA?: string;
  /** Base fill colour of blue-family particles. */
  colorB?: string;
  /** Global alpha for dots and lines. */
  opacity?: number;
  /** Disable cursor interaction entirely. */
  interactive?: boolean;
};

/**
 * Canvas particle field with mouse interaction: particles drift slowly,
 * connect with faint lines when near each other, are gently pushed away by
 * the cursor and draw a live trail link to it while it is over the area.
 *
 * Stack notes:
 *  - The wrapper is `pointer-events-none`; the cursor is tracked on `window`
 *    and mapped into canvas coordinates, so the layer never intercepts
 *    clicks, text selection or hover on the content underneath.
 *  - DPR-aware canvas, ResizeObserver-driven sizing, particle cap, and
 *    `prefers-reduced-motion` (a single static frame is drawn instead of
 *    running the animation loop).
 */
export default function ParticleField({
  className = "",
  density = 14000,
  maxParticles = 55,
  linkDistance = 130,
  mouseRadius = 160,
  colorA = "#FF1744",
  colorB = "#00B4FF",
  opacity = 0.5,
  interactive = true,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      c: number;
    };

    const spawn = () => {
      const count = Math.min(
        maxParticles,
        Math.max(8, Math.round((w * h) / density))
      );
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.7,
        c: Math.random() < 0.55 ? 0 : 1,
      }));
    };

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) mouse.active = false;
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = opacity;
      for (const p of particles) {
        ctx.fillStyle = p.c === 0 ? colorA : colorB;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = () => {
      ctx.clearRect(0, 0, w, h);

      // Cursor links first (behind the dots)
      if (interactive && mouse.active) {
        for (const p of particles) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mouseRadius * mouseRadius && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const a = (1 - d / mouseRadius) * 0.35 * opacity;
            ctx.strokeStyle = `rgba(0, 180, 255, ${a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      // Inter-particle links
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDistance * linkDistance) {
            const aAlpha = (1 - Math.sqrt(d2) / linkDistance) * 0.22 * opacity;
            ctx.strokeStyle = `rgba(120, 140, 190, ${aAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Dots + drift + cursor repulsion
      ctx.globalAlpha = opacity;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        if (interactive && mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mouseRadius * mouseRadius && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = ((mouseRadius - d) / mouseRadius) * 0.6;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }

        ctx.fillStyle = p.c === 0 ? colorA : colorB;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(step);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseout", onMouseLeave);

    if (reducedMotion) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseLeave);
    };
  }, [
    density,
    maxParticles,
    linkDistance,
    mouseRadius,
    colorA,
    colorB,
    opacity,
    interactive,
  ]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
