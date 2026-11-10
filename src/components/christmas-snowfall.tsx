"use client";

import * as React from "react";

interface SnowParticle {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  opacity: number;
  drift: string;
  tint: "red" | "white" | "gold";
}

const SNOW_PARTICLES: SnowParticle[] = [
  { id: 1, left: "5%", size: 6, duration: "18s", delay: "0s", opacity: 0.35, drift: "18px", tint: "red" },
  { id: 2, left: "11%", size: 5, duration: "14s", delay: "-3s", opacity: 0.4, drift: "-14px", tint: "white" },
  { id: 3, left: "18%", size: 7, duration: "20s", delay: "-7s", opacity: 0.28, drift: "22px", tint: "gold" },
  { id: 4, left: "25%", size: 5, duration: "22s", delay: "-2s", opacity: 0.32, drift: "-18px", tint: "red" },
  { id: 5, left: "32%", size: 4, duration: "15s", delay: "-9s", opacity: 0.38, drift: "12px", tint: "white" },
  { id: 6, left: "39%", size: 6, duration: "17s", delay: "-4s", opacity: 0.3, drift: "-16px", tint: "red" },
  { id: 7, left: "46%", size: 5, duration: "24s", delay: "-11s", opacity: 0.26, drift: "20px", tint: "gold" },
  { id: 8, left: "53%", size: 6, duration: "16s", delay: "-6s", opacity: 0.34, drift: "-12px", tint: "white" },
  { id: 9, left: "60%", size: 5, duration: "19s", delay: "-1s", opacity: 0.3, drift: "15px", tint: "red" },
  { id: 10, left: "67%", size: 7, duration: "23s", delay: "-8s", opacity: 0.25, drift: "-20px", tint: "white" },
  { id: 11, left: "74%", size: 4, duration: "13s", delay: "-5s", opacity: 0.36, drift: "14px", tint: "red" },
  { id: 12, left: "81%", size: 6, duration: "18s", delay: "-12s", opacity: 0.3, drift: "-15px", tint: "gold" },
  { id: 13, left: "88%", size: 5, duration: "21s", delay: "-3.5s", opacity: 0.28, drift: "18px", tint: "white" },
  { id: 14, left: "94%", size: 6, duration: "15s", delay: "-10s", opacity: 0.34, drift: "-12px", tint: "red" },
];

export function ChristmasSnowfall() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none"
    >
      {/* Soft ambient holiday glow */}
      <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-red-200/20 blur-3xl" />
      <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-amber-100/25 blur-3xl" />
      <div className="absolute bottom-16 -left-20 h-72 w-72 rounded-full bg-red-100/20 blur-3xl" />

      {SNOW_PARTICLES.map((flake) => (
        <div
          key={flake.id}
          style={
            {
              left: flake.left,
              animationDuration: flake.duration,
              animationDelay: flake.delay,
              "--snow-drift": flake.drift,
              opacity: flake.opacity,
            } as React.CSSProperties
          }
          className="mfc-snowflake absolute -top-6"
        >
          <span
            style={{ width: flake.size, height: flake.size }}
            className={
              flake.tint === "gold"
                ? "block rounded-full bg-amber-300/75 shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                : flake.tint === "white"
                  ? "block rounded-full bg-white shadow-[0_0_6px_rgba(217,27,35,0.25)] ring-1 ring-red-200/50"
                  : "block rounded-full bg-red-300/60"
            }
          />
        </div>
      ))}
    </div>
  );
}
