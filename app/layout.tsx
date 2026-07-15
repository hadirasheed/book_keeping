import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Settings } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Bookkeeping",
  description: "Upload bank statements, organized under Books and Bank Accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <BookOpen className="size-5" />
              <span>AI Bookkeeping</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/settings/models"
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings className="size-4" />
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
