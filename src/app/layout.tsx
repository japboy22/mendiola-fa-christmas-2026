import type { Metadata, Viewport } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "Mendiola Football Academy - Bulacan | Christmas Party 2026 RSVP",
  description:
    "Official Christmas Party 2026 confirmation of attendance for Mendiola Football Academy - Bulacan (U5, U7, U9, U13, U15 & Coaches). December 15, 2026, 3:00 PM at Valle Maria Mar, Sta. Cruz, Sta. Maria, Bulacan.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mendiola Xmas 2026",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#D91B23",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary selection:text-white"
      >
        {children}
        <PwaInstallBanner />
      </body>
    </html>
  );
}
