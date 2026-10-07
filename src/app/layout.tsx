import type { Metadata } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

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
    <html lang="es">
      <body><PwaRegistration />{children}</body>
    </html>
  );
}
