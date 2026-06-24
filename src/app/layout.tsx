import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { FloatingQuickPanel } from "@/components/floating-quick-panel";
import { MobileDock } from "@/components/mobile-dock";
import { MouseGlowLayer } from "@/components/mouse-glow-layer";
import { SelectionCommentLayer } from "@/components/selection-comment-layer";
import { SiteFooter } from "@/components/site-footer";
import { ForumAuthProvider } from "@/lib/forum-auth";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Timin观察站",
  description: "社区共建的 AI 中转站观察站，持续整理价格、倍率、稳定性、模型覆盖和真实使用反馈。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      data-theme="midnight"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ForumAuthProvider>
          <MouseGlowLayer />
          <div className="relative z-10 flex min-h-full flex-col">
            {children}
            <SiteFooter />
            <FloatingQuickPanel />
            <MobileDock />
            <SelectionCommentLayer />
          </div>
        </ForumAuthProvider>
      </body>
    </html>
  );
}
