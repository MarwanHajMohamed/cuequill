import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import "./globals.css";
import "react-calendar/dist/Calendar.css";
import "@/app/calendar/custom-calendar.css";
import Providers from "./providers";
import NavbarWrapper from "./navbar/NavbarWrapper";
import { ToastProvider } from "@/hooks/useToast";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mind Over Market",
  icons: {
    icon: "/favicon.ico",
  },
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
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
