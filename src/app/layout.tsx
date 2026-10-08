import type { Metadata } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Tudelivery | Operación de delivery",
  description: "Plataforma para delivery, mandados y gestión de flota.",
  applicationName: "Tudelivery",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Tudelivery", statusBarStyle: "default" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body><PwaRegistration />{children}</body>
    </html>
  );
}
