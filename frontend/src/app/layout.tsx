import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ReactNode } from "react";
import "../styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "CarbonBox", description: "Procesamiento de archivos CSV" };

// La fuente del diseño. next/font la descarga al compilar y la sirve desde el propio frontend.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className={`${poppins.className} min-h-screen bg-gray-50 text-gray-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
