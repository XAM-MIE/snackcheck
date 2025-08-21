import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MobileOptimizationProvider } from "../components/MobileOptimizationProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnackCheck - Food Label Scanner",
  description: "Scan food labels and get instant health scores with AI-powered ingredient analysis",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SnackCheck",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SnackCheck" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://world.openfoodfacts.org" />
        <link rel="dns-prefetch" href="https://world.openfoodfacts.org" />
        
        {/* Critical CSS for mobile performance */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .touch-optimized {
              touch-action: manipulation;
              -webkit-tap-highlight-color: transparent;
            }
            .scroll-optimized {
              -webkit-overflow-scrolling: touch;
              overflow-scrolling: touch;
            }
            .low-performance * {
              transition: none !important;
              animation: none !important;
            }
            @media (max-width: 768px) {
              body {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
              }
            }
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MobileOptimizationProvider>
          {children}
        </MobileOptimizationProvider>
      </body>
    </html>
  );
}
