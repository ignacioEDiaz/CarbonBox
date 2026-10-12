import type { Metadata } from "next";
import { ReactNode } from "react";
import "../styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "CarbonBox", description: "Procesamiento de archivos CSV" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
