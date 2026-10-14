import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bootScript } from "@/prefs/boot-script";
import { PrefsProvider } from "@/prefs/provider";
import { DEFAULT_ACCENT } from "@/theme/palettes";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Weekflow: Plan smarter. Work better.", template: "%s · Weekflow" },
  description:
    "A flexible weekly planner that rearranges tasks from your deadlines, priorities and available time. Free forever.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable}`}
      data-accent={DEFAULT_ACCENT}
      data-bg="default"
      data-density="comfortable"
      data-motion="system"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript() }} />
      </head>
      <body className="min-h-dvh">
        <PrefsProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </PrefsProvider>
      </body>
    </html>
  );
}
