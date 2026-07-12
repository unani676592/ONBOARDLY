"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MAX_TILT = 6; // degrees per axis
const BASE_ROTATE = 1.4; // preserve the mockup's original slight rotation (deg)

/**
 * Wraps content in a subtle cursor-following 3D tilt (desktop/hover only).
 * - prefers-reduced-motion: no motion at all (static base rotation kept).
 * - Touch devices (no hover): one-time fade+slide-up entrance instead.
 */
export default function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion: bail out entirely, keep the static base rotation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rest = `perspective(1000px) rotateX(0deg) rotateY(0deg) rotateZ(${BASE_ROTATE}deg) scale(1)`;
    el.style.transform = rest;

    // No true hover (touch): play a one-time entrance animation, no tilt.
    if (!window.matchMedia("(hover: hover)").matches) {
      el.animate(
        [
          {
            opacity: 0,
            transform: `perspective(1000px) translateY(16px) rotateZ(${BASE_ROTATE}deg)`,
          },
          {
            opacity: 1,
            transform: `perspective(1000px) translateY(0px) rotateZ(${BASE_ROTATE}deg)`,
          },
        ],
        { duration: 500, easing: "ease-out", fill: "none" }
      );
      return;
    }

    // Desktop hover tilt.
    const clearWillChange = () => {
      el.style.willChange = "auto";
      el.removeEventListener("transitionend", clearWillChange);
    };

    const onEnter = () => {
      el.style.willChange = "transform";
    };

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      const rotateY = (px - 0.5) * 2 * MAX_TILT;
      const rotateX = (0.5 - py) * 2 * MAX_TILT;
      el.style.transition = "transform 150ms ease-out";
      el.style.willChange = "transform";
      el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(
        2
      )}deg) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${BASE_ROTATE}deg) scale(1.02)`;
    };

    const onLeave = () => {
      el.style.transition = "transform 400ms ease-out";
      el.style.transform = rest;
      el.addEventListener("transitionend", clearWillChange);
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("transitionend", clearWillChange);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
