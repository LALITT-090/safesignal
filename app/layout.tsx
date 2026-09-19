import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://safesignal.example"),
  title: {
    default: "SafeSignal | Anonymous Safety Reporting",
    template: "%s | SafeSignal",
  },
  description:
    "SafeSignal helps communities report safety concerns anonymously and surfaces connected patterns for human review.",
  applicationName: "SafeSignal",
  keywords: [
    "safety reporting",
    "anonymous reporting",
    "community safety",
    "authority dashboard",
    "incident tracking",
  ],
  openGraph: {
    title: "SafeSignal",
    description:
      "Anonymous reporting with connected human-review signals for emerging safety patterns.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeSignal",
    description:
      "Community safety reporting that highlights emerging patterns for review.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-white">{children}</body>
    </html>
  );
}
