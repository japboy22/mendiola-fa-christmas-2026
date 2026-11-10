"use client";

import * as React from "react";
import Image from "next/image";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const timer = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem("mfc_xmas_pwa_dismissed") === "1") {
          return;
        }
      } catch {
        // Ignore storage errors
      }

      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true;

      if (isStandalone) return;

      const ua = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(ua);
      const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
      if (isIos && isSafari) {
        setShowIosHint(true);
      }
    }, 600);

    const handler = (e: Event) => {
      e.preventDefault();
      try {
        if (sessionStorage.getItem("mfc_xmas_pwa_dismissed") === "1") return;
      } catch {
        // Ignore
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("mfc_xmas_pwa_dismissed", "1");
    } catch {
      // Ignore
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (dismissed || (!deferredPrompt && !showIosHint)) {
    return null;
  }

  return (
    <div className="fixed bottom-22 left-3 right-3 z-30 mx-auto max-w-md rounded-2xl border border-red-200 bg-white/95 p-3 text-zinc-900 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Image
          src="/mendiola-logo.png"
          alt="Mendiola Football Academy - Bulacan Crest"
          width={36}
          height={38}
          style={{ width: "auto" }}
          className="h-9 shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-tight text-zinc-950 sm:text-sm">
            Install Mendiola Christmas App
          </p>
          {deferredPrompt ? (
            <p className="mt-0.5 text-[11px] text-zinc-600">
              Add to your home screen for quick event pass access.
            </p>
          ) : (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-600">
              Tap <Share className="inline h-3 w-3 text-primary" /> then{" "}
              <span className="font-semibold text-zinc-900">
                Add to Home Screen
              </span>
            </p>
          )}
        </div>
        {deferredPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-xs font-semibold text-white transition active:scale-[0.98] hover:bg-red-700 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
