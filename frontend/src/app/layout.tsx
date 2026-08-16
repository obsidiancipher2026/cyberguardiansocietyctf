import type { Metadata } from "next";
import "./globals.css";
import { MotionConfig } from "framer-motion";
import CGSBackground from "@/components/ui/CGSBackground";
import ToastProvider from "@/components/ToastProvider";
import CaretFX from "@/components/ui/CaretFX";
import ScrollProgress from "@/components/ui/ScrollProgress";
import PageTransition from "@/components/ui/PageTransition";
import MaintenanceGate from "@/components/MaintenanceGate";

export const metadata: Metadata = {
  title: "CGS CTF — Capture The Flag Platform",
  description: "Cinematic, high-security Capture The Flag competition platform by Cyber Guardian Society.",
  icons: { icon: "/cgs-logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-void text-ink antialiased min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-white">
        <ToastProvider />
        <CaretFX />
        <ScrollProgress />
        <CGSBackground />
        <MotionConfig reducedMotion="user">
          <MaintenanceGate>
            <PageTransition>{children}</PageTransition>
          </MaintenanceGate>
        </MotionConfig>
      </body>
    </html>
  );
}
