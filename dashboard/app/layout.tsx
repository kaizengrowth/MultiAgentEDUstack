import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Ticker } from "@/components/Ticker";
import { ThemeToggle } from "@/components/ThemeToggle";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MultiAgentEDUstack -- Wire Desk",
  description:
    "Dispatches, bulletins, and curriculum from the MultiAgentEDUstack pipeline.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${plexMono.variable} ${plexSans.variable} font-sans`}>
        <div className="flex min-h-screen flex-col">
          <header className="masthead-texture border-b border-hairline bg-surface">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-bold tracking-tight text-ink">
                  MULTIAGENT<span className="text-accent">EDU</span>STACK
                </span>
                <span className="hidden font-mono text-[11px] uppercase tracking-widest text-ink-muted sm:inline">
                  Wire Desk
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-secondary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-good" />
                  </span>
                  live
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <Ticker />

          <div className="flex flex-1">
            <aside className="w-56 shrink-0 border-r border-hairline bg-surface">
              <Sidebar />
            </aside>
            <main className="flex-1 px-6 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
