import type { Metadata } from "next";
import { Figtree, Young_Serif } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Ticker } from "@/components/Ticker";
import { ThemeToggle } from "@/components/ThemeToggle";

const display = Young_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

const body = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MultiAgent EDU Stack -- Learning Desk",
  description:
    "A friendly desk for education teams to gather sources and shape curriculum.",
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
          <header className="masthead">
            <div className="masthead-inner flex items-center justify-between gap-4 px-5 py-5">
              <div className="min-w-0">
                <p className="chip mb-2 w-fit">Learning desk</p>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="brand-mark font-display text-2xl text-ink sm:text-3xl">
                    MultiAgent <span className="edu">EDU</span> Stack
                  </span>
                  <span className="text-sm text-ink-secondary sm:text-base">
                    Gather good sources. Teach what matters.
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="chip hidden sm:inline-flex">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  Updating
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <Ticker />

          <div className="mx-auto flex w-full max-w-6xl flex-1">
            <aside className="shell-aside w-52 shrink-0 border-r border-hairline sm:w-56">
              <Sidebar />
            </aside>
            <main className="page-enter flex-1 px-5 py-8 sm:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
