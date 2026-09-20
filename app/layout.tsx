import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { AppHeader } from "./components/app-header";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-[#3B3540]">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
