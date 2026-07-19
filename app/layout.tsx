import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mizan — AI Bookkeeping",
  description:
    "Upload bank statements; AI extracts and categorizes transactions, organized under Books and Bank Accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
