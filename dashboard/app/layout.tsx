import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Ticker } from "@/components/Ticker";
import { ThemeToggle } from "@/components/ThemeToggle";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MultiAgent EDU Stack -- Learning Desk",
  description:
    "Source, curate, and scaffold AI curriculum for education teams and nonprofits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${display.variable} ${body.variable} font-sans antialiased`}>
        <div className="flex min-h-screen flex-col">
          <header className="masthead border-b border-hairline">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="brand-mark font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  MultiAgent <span className="edu">EDU</span> Stack
                </span>
                <span className="text-sm text-ink-secondary">
                  Learning desk for curriculum teams
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden items-center gap-1.5 text-sm text-ink-secondary sm:flex">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
                  </span>
                  Sources updating
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <Ticker />

          <div className="mx-auto flex w-full max-w-7xl flex-1">
            <aside className="shell-aside w-52 shrink-0 border-r border-hairline sm:w-56">
              <Sidebar />
            </aside>
            <main className="page-enter flex-1 px-5 py-7 sm:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
