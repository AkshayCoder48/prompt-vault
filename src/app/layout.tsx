import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptVault — Discover AI prompts that actually work",
  description:
    "Browse, copy, and share premium AI prompts for art, writing, coding, marketing, photography and more.",
  keywords: ["AI prompts", "prompt library", "ChatGPT prompts", "Midjourney prompts", "prompt engineering"],
  authors: [{ name: "PromptVault" }],
  openGraph: {
    title: "PromptVault — Discover AI prompts that actually work",
    description: "Browse, copy, and share premium AI prompts.",
    siteName: "PromptVault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptVault",
    description: "Discover AI prompts that actually work.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
