import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AnnouncementModal } from "@/components/announcement-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { FloatingQuickPanel } from "@/components/floating-quick-panel";
import { GlobalRelayCanvas } from "@/components/global-relay-canvas";
import { RegisterCounter } from "@/components/register-counter";
import { MobileDock } from "@/components/mobile-dock";
import { MouseGlowLayer } from "@/components/mouse-glow-layer";
import { PageLoadingBar } from "@/components/page-loading-bar";
import { PageTransitionShell } from "@/components/page-transition-shell";
import { ScrollRevealOrchestrator } from "@/components/scroll-reveal-orchestrator";
import { SelectionCommentLayer } from "@/components/selection-comment-layer";
import { SiteFooter } from "@/components/site-footer";
import { ToastContainer } from "@/components/toast-container";
import { ForumAuthProvider } from "@/lib/forum-auth";
import { ToastProvider } from "@/lib/toast-context";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteOrigin = "https://www.1bex.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Timix观察站 — AI 中转站榜单与社区",
  description: "社区共建的 AI 中转站观察站，持续整理价格、倍率、稳定性、模型覆盖和真实使用反馈。",
  keywords: ["AI中转站", "API中转", "GPT", "Claude", "倍率对比", "模型价格"],
  openGraph: {
    title: "Timix观察站 — AI 中转站榜单与社区",
    description: "社区共建的 AI 中转站观察站，持续整理价格、倍率、稳定性、模型覆盖和真实使用反馈。",
    type: "website",
    locale: "zh_CN",
    siteName: "Timix观察站",
  },
  twitter: {
    card: "summary_large_image",
    title: "Timix观察站 — AI 中转站榜单与社区",
    description: "社区共建的 AI 中转站观察站，持续整理价格、倍率、稳定性、模型覆盖和真实使用反馈。",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      data-theme="blue"
      data-theme-mode="signal"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://api.github.com" />
      </head>
      <body className="min-h-full">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--color-brand)] focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-[var(--color-on-brand)]"
          href="#main-content"
        >
          跳到主内容
        </a>
        <PageLoadingBar />
        <ForumAuthProvider>
          <ToastProvider>
            <MouseGlowLayer />
            <GlobalRelayCanvas />
            <MobileDock />
            <main id="main-content" className="relative z-10 flex min-h-full flex-col">
              <ScrollRevealOrchestrator />
              <PageTransitionShell>
                <ErrorBoundary>{children}</ErrorBoundary>
              </PageTransitionShell>
              <SiteFooter />
              <SelectionCommentLayer />
            </main>
            <ToastContainer />
          </ToastProvider>
        </ForumAuthProvider>
        <FloatingQuickPanel />
        <RegisterCounter />
        <AnnouncementModal />
      </body>
    </html>
  );
}
