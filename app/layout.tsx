import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import PwaRegister from "@/src/components/PwaRegister";
import ContenidoApp from "./ContenidoApp";
import { LOGO_COMPLETO_SRC, LOGO_APLICACION_SRC, PWA_THEME_COLOR } from "@/src/constants/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Caleb - Conquistadores",
  description: "Centro de comando del Club de Conquistadores Caleb",
  applicationName: "Club Caleb",
  appleWebApp: {
    capable: true,
    title: "Club Caleb",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: LOGO_COMPLETO_SRC, sizes: "512x512", type: "image/png" },
      { url: LOGO_APLICACION_SRC, sizes: "any" },
    ],
    apple: [{ url: LOGO_COMPLETO_SRC, sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PWA_THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F8FAFC] min-h-screen flex flex-col`}
      >
        <ContenidoApp>{children}</ContenidoApp>
        <PwaRegister />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
