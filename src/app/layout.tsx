import type { Metadata, Viewport } from "next";
import { DM_Mono } from "next/font/google";
import "./globals.css";
import "react-calendar/dist/Calendar.css";
import "@/app/calendar/custom-calendar.css";
import Providers from "./providers";
import NavbarWrapper from "./navbar/NavbarWrapper";
import { ToastProvider } from "@/hooks/useToast";
import PWARegister from "./PWARegister";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cuequill",
  description:
    "Discretionary US-options trading journal — strategies, calendar, and stats.",
  applicationName: "Cuequill",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cuequill",
    // "black-translucent" lets the app draw beneath the status bar so
    // the navbar + safe-area padding handle the inset cleanly.
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

// `viewport-fit=cover` is required for iOS to expose the safe-area
// insets to CSS (`env(safe-area-inset-top)` etc.). themeColor here
// drives the Android system bar tint when launched as a PWA.
export const viewport: Viewport = {
  themeColor: "#0E0E10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css"
        />
      </head>
      <body className={dmMono.className}>
        <Providers>
          <ToastProvider>
            <NavbarWrapper />
            {children}
            <PWARegister />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
