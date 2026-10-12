"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { clearToken } from "../lib/session";
import { RequireAuth } from "./RequireAuth";

// El marco de las pantallas con sesión: navegación arriba y el contenido abajo
export function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <RequireAuth>
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="font-semibold">CarbonBox</Link>
          <Link href="/uploads" className="text-sm text-gray-700 hover:underline">Uploads</Link>
          <Link href="/uploads/new" className="text-sm text-gray-700 hover:underline">Subir CSV</Link>
          <button onClick={logout} className="ml-auto text-sm text-gray-700 hover:underline">Cerrar sesión</button>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </RequireAuth>
  );
}
