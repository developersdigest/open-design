import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Design",
  description: "Turn any URL into a brand kit, design system, and marketing assets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
