import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Onboardly — Automated client onboarding for agencies & freelancers",
  description:
    "Your client fills one form — no account, no login, just a magic link. Onboardly handles the rest: welcome emails, Drive folders, CRM records, and tasks. All on autopilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-white text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
