import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { MobileTopNav } from "@/components/mobile-top-nav";
import { Sidebar } from "@/components/sidebar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NewsAgent",
  description: "Autonomous real-time intelligence & reporting platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen bg-[hsl(210,40%,98%)]">
          <div className="hidden lg:flex">
            <Sidebar />
          </div>
          <main className="flex-1 overflow-x-hidden">
            <MobileTopNav />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
