import type { Metadata, Viewport } from "next";
import { DM_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import "react-calendar/dist/Calendar.css";
import "@/app/calendar/custom-calendar.css";
import Providers from "./providers";
import NavbarWrapper from "./navbar/NavbarWrapper";
import { ToastProvider } from "@/hooks/useToast";
import PWARegister from "./PWARegister";
import NativeBridge from "./NativeBridge";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

// Editorial display serif - variable font with opsz axis. Applied
// globally to h1/h2/h3 via globals.css so every page in the app
// (marketing + signed-in) shares the same heading typography. Body
// stays on DM Mono.
const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Cuequill",
  description:
    "Discretionary US-options trading journal - strategies, calendar, and stats.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so there's no flash of
            the wrong palette. Defaults to dark (the original UI). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('cuequill:theme');var m=t==='light'?'light':'dark';var e=document.documentElement;e.classList.add(m);e.style.colorScheme=m;}catch(e){document.documentElement.classList.add('dark');}})();",
          }}
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css"
        />
      </head>
      <body className={`${dmMono.className} ${newsreader.variable}`}>
        <Providers>
          <ToastProvider>
            <NavbarWrapper />
            {children}
            <PWARegister />
            <NativeBridge />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
