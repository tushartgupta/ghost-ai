import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerk-appearance";
import { EDITOR_PATH, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth-paths";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Collaborative system design workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-base font-sans text-copy-primary">
        <ClerkProvider
          appearance={clerkAppearance}
          afterMultiSessionSingleSignOutUrl={SIGN_IN_URL}
          afterSignOutUrl={SIGN_IN_URL}
          dynamic
          proxyUrl="/__clerk"
          signInFallbackRedirectUrl={EDITOR_PATH}
          signInUrl={SIGN_IN_URL}
          signUpFallbackRedirectUrl={EDITOR_PATH}
          signUpUrl={SIGN_UP_URL}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
