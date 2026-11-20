import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScholarPanel AI | Multi-Agent Scholarship Evaluator",
  description: "Enterprise grant and scholarship evaluator powered by Azure AI Foundry and Microsoft multi-agent architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
