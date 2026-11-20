import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScholarPanel AI — Institutional Grant & Scholarship Adjudication",
  description:
    "Rubric-grounded multi-agent committee evaluation with deterministic scoring and auditable citations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} scroll-smooth`}>
      <body className="min-h-screen bg-white text-slate-900 font-sans antialiased flex flex-col">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                ScholarPanel AI
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                Enterprise
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
              <a href="/#how-it-works" className="hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="/#rubric" className="hover:text-slate-900 transition-colors">
                Rubric &amp; Formula
              </a>
              <a href="/#cases" className="hover:text-slate-900 transition-colors">
                Case Results
              </a>
            </nav>

            <Link
              href="/evaluate"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 hover:bg-indigo-700 text-white text-xs font-semibold tracking-wide transition-colors"
            >
              <span>Evaluate Applicant</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-slate-50/70 py-10 text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-slate-800">ScholarPanel AI</span>
              <span className="mx-2 text-slate-300">/</span>
              <span>Deterministic Grant &amp; Scholarship Review</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              Weighted Score = (Merit × 0.55) + (Need × 0.45)
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}