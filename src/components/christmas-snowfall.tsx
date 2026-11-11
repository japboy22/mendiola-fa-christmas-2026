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
      {/* Study 3: Soft Holiday Bokeh Lights */}
      <div className="absolute -top-16 left-[12%] h-64 w-64 rounded-full bg-red-200/20 blur-3xl" />
      <div className="absolute top-24 right-[10%] h-56 w-56 rounded-full bg-amber-200/20 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-red-100/15 blur-3xl" />
      <div className="absolute top-28 left-[18%] h-16 w-16 rounded-full bg-amber-200/20 blur-xl" />
      <div className="absolute top-36 right-[22%] h-20 w-20 rounded-full bg-red-200/15 blur-xl" />
      <div className="absolute bottom-36 left-[28%] h-24 w-24 rounded-full bg-amber-100/25 blur-2xl" />

      {/* Study 3: Top-Left Hanging Minimalist Line-Art Ornaments */}
      <svg
        className="absolute top-16 left-2 sm:left-8 h-28 w-40 text-zinc-400/35"
        viewBox="0 0 160 110"
        fill="none"
      >
        {/* Bauble 1 */}
        <line x1="28" y1="0" x2="28" y2="42" stroke="currentColor" strokeWidth="1.2" />
        <rect x="24" y="42" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="28" cy="58" r="12" stroke="currentColor" strokeWidth="1.4" />
        <path d="M18 55 Q28 62 38 55" stroke="currentColor" strokeWidth="1" />
        {/* Hanging Star */}
        <line x1="74" y1="0" x2="74" y2="24" stroke="currentColor" strokeWidth="1.2" />
        <polygon
          points="74,26 77.5,33 85,34 79.5,39.5 81,47 74,43 67,47 68.5,39.5 63,34 70.5,33"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        {/* Small Bauble 2 */}
        <line x1="118" y1="0" x2="118" y2="54" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2 2" />
        <circle cx="118" cy="63" r="8" stroke="currentColor" strokeWidth="1.3" />
      </svg>

      {/* Study 3: Top-Right Hanging Minimalist Line-Art Ornaments */}
      <svg
        className="absolute top-16 right-2 sm:right-8 h-28 w-40 text-zinc-400/35"
        viewBox="0 0 160 110"
        fill="none"
      >
        {/* Diamond Ornament */}
        <line x1="42" y1="0" x2="42" y2="30" stroke="currentColor" strokeWidth="1.2" />
        <polygon points="42,30 51,44 42,58 33,44" stroke="currentColor" strokeWidth="1.3" />
        {/* Hanging Star */}
        <line x1="88" y1="0" x2="88" y2="20" stroke="currentColor" strokeWidth="1.2" />
        <polygon
          points="88,22 91,28 98,29 93,34 94,41 88,37.5 82,41 83,34 78,29 85,28"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        {/* Bauble */}
        <line x1="130" y1="0" x2="130" y2="46" stroke="currentColor" strokeWidth="1.2" />
        <rect x="126" y="46" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="130" cy="61" r="11" stroke="currentColor" strokeWidth="1.4" />
        <path d="M120 61 H140" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* Study 3: Bottom Layered Snowy Pine Horizon */}
      <svg
        className="absolute bottom-16 inset-x-0 h-20 w-full text-zinc-300/35"
        viewBox="0 0 1200 90"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        {/* Distant snow hills */}
        <path
          d="M0 90 L0 68 Q180 48 360 66 T760 62 T1200 66 L1200 90 Z"
          className="text-zinc-200/45"
          fill="currentColor"
        />
        {/* Left pine cluster */}
        <polygon points="28,90 52,32 76,90" />
        <polygon points="34,58 52,20 70,58" />
        <polygon points="68,90 88,44 108,90" />
        <polygon points="102,90 118,54 134,90" />
        <polygon points="175,90 196,38 217,90" />
        {/* Right pine cluster */}
        <polygon points="985,90 1006,42 1027,90" />
        <polygon points="1055,90 1074,50 1093,90" />
        <polygon points="1088,90 1112,30 1136,90" />
        <polygon points="1094,56 1112,18 1130,56" />
        <polygon points="1132,90 1152,46 1172,90" />
      </svg>

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
