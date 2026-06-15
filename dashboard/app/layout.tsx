import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowgentic HIRE",
  description: "AI-powered outbound screening dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {/* Authenticated: show header + constrained main */}
          <Show when="signed-in">
            <header className="bg-slate-900 border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                    />
                  </svg>
                </div>
                <span className="text-white font-semibold text-base tracking-tight">
                  Flowgentic <span className="text-indigo-400">HIRE</span>
                </span>
                <span className="ml-1 text-slate-400 text-sm font-normal">
                  Screening Dashboard
                </span>
                <nav className="ml-auto flex items-center gap-3">
                  <Link
                    href="/"
                    className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <UserButton />
                </nav>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
          </Show>

          {/* Unauthenticated: render page full-screen (sign-in page) */}
          <Show when="signed-out">{children}</Show>
        </body>
      </html>
    </ClerkProvider>
  );
}
