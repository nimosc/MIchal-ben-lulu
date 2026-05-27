import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import { StoreProvider } from "@/components/StoreProvider";
import { Heebo } from "next/font/google";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "מפרטי תאורה",
  description: "מערכת ניהול מפרטי גופי תאורה לפרויקטי עיצוב פנים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const buildSha = (process.env.NEXT_PUBLIC_BUILD_SHA || "").slice(0, 7);
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || "";

  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className={`${heebo.className} antialiased bg-background min-h-screen`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              </div>
              <span className="font-bold text-base text-foreground tracking-tight">מפרטי תאורה</span>
            </div>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground hidden sm:block">מערכת ניהול מפרטי גופי תאורה</span>
            <Link
              href="/settings"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="הגדרות"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </Link>
          </div>
        </header>

        <StoreProvider>
          <main>{children}</main>
          <Toaster position="bottom-right" />
        </StoreProvider>

        {(buildSha || buildTime) && (
          <div className="fixed bottom-2 left-2 z-50 text-[10px] leading-tight text-muted-foreground/80 bg-background/70 border border-border/60 rounded-md px-2 py-1 backdrop-blur">
            <div>build: {buildSha || "local"}</div>
            {buildTime && <div className="opacity-80">{buildTime}</div>}
          </div>
        )}
      </body>
    </html>
  );
}
