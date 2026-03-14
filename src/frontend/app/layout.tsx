import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Layout/Navbar";
import { Providers } from "@/app/Providers"; // Import the Providers component you created
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
  title: "DigiChecker",
  description: "Submission checker dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required here to prevent mismatch errors on initial load
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {/* Added transition-colors to ensure the background fades smoothly */}
          <div className="flex flex-col min-h-screen w-full bg-zinc-50 font-sans dark:bg-black transition-colors duration-300">
            <Navbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}