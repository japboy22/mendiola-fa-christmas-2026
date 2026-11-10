"use client";

import * as React from "react";
import { Snowflake } from "lucide-react";

interface SnowParticle {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  opacity: number;
  drift: string;
  isCrystal?: boolean;
  tint: "red" | "white" | "gold";
}

const SNOW_PARTICLES: SnowParticle[] = [
  { id: 1, left: "4%", size: 12, duration: "18s", delay: "0s", opacity: 0.35, drift: "18px", isCrystal: true, tint: "red" },
  { id: 2, left: "9%", size: 6, duration: "14s", delay: "-3s", opacity: 0.45, drift: "-14px", tint: "red" },
  { id: 3, left: "15%", size: 8, duration: "20s", delay: "-7s", opacity: 0.3, drift: "22px", tint: "gold" },
  { id: 4, left: "21%", size: 14, duration: "22s", delay: "-2s", opacity: 0.28, drift: "-18px", isCrystal: true, tint: "red" },
  { id: 5, left: "27%", size: 5, duration: "15s", delay: "-9s", opacity: 0.4, drift: "12px", tint: "red" },
  { id: 6, left: "33%", size: 7, duration: "17s", delay: "-4s", opacity: 0.35, drift: "-16px", tint: "white" },
  { id: 7, left: "39%", size: 13, duration: "24s", delay: "-11s", opacity: 0.26, drift: "20px", isCrystal: true, tint: "red" },
  { id: 8, left: "45%", size: 6, duration: "16s", delay: "-6s", opacity: 0.38, drift: "-12px", tint: "gold" },
  { id: 9, left: "52%", size: 8, duration: "19s", delay: "-1s", opacity: 0.32, drift: "15px", tint: "red" },
  { id: 10, left: "58%", size: 15, duration: "23s", delay: "-8s", opacity: 0.25, drift: "-20px", isCrystal: true, tint: "red" },
  { id: 11, left: "64%", size: 5, duration: "13s", delay: "-5s", opacity: 0.42, drift: "14px", tint: "red" },
  { id: 12, left: "70%", size: 7, duration: "18s", delay: "-12s", opacity: 0.34, drift: "-15px", tint: "gold" },
  { id: 13, left: "76%", size: 12, duration: "21s", delay: "-3.5s", opacity: 0.28, drift: "18px", isCrystal: true, tint: "red" },
  { id: 14, left: "82%", size: 6, duration: "15s", delay: "-10s", opacity: 0.4, drift: "-12px", tint: "red" },
  { id: 15, left: "88%", size: 8, duration: "19s", delay: "-2.5s", opacity: 0.32, drift: "16px", tint: "white" },
  { id: 16, left: "94%", size: 13, duration: "22s", delay: "-6.5s", opacity: 0.27, drift: "-18px", isCrystal: true, tint: "red" },
  { id: 17, left: "12%", size: 5, duration: "16s", delay: "-13s", opacity: 0.35, drift: "10px", tint: "red" },
  { id: 18, left: "48%", size: 6, duration: "14s", delay: "-9.5s", opacity: 0.36, drift: "-14px", tint: "red" },
  { id: 19, left: "67%", size: 10, duration: "20s", delay: "-14s", opacity: 0.24, drift: "16px", isCrystal: true, tint: "gold" },
  { id: 20, left: "85%", size: 5, duration: "15s", delay: "-7.5s", opacity: 0.38, drift: "-10px", tint: "red" },
];

export function ChristmasSnowfall() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none"
    >
      {/* Soft ambient winter glow */}
      <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-red-200/25 blur-3xl" />
      <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-amber-100/30 blur-3xl" />
      <div className="absolute bottom-16 -left-20 h-72 w-72 rounded-full bg-red-100/25 blur-3xl" />

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
          className="mfc-snowflake absolute -top-8"
        >
          {flake.isCrystal ? (
            <Snowflake
              style={{ width: flake.size, height: flake.size }}
              className={
                flake.tint === "gold"
                  ? "text-amber-500/70 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
                  : "text-red-400/65 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
              }
            />
          ) : (
            <span
              style={{ width: flake.size, height: flake.size }}
              className={
                flake.tint === "gold"
                  ? "block rounded-full bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  : flake.tint === "white"
                    ? "block rounded-full bg-white shadow-[0_0_8px_rgba(217,27,35,0.35)] ring-1 ring-red-200/60"
                    : "block rounded-full bg-red-300/70 shadow-[0_0_6px_rgba(217,27,35,0.25)]"
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
