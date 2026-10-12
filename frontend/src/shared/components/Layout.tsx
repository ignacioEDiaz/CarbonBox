"use client";

import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import s from "./Layout.module.css";
import { RequireAuth } from "./RequireAuth";

type Section = "dashboard" | "uploads" | "upload";

// El marco de las pantallas con sesión: exige estar logueado, pone el fondo y el encabezado.
// Cada pantalla solo dibuja su contenido.
export function Layout({ active, children }: { active: Section; children: ReactNode }) {
  return (
    <RequireAuth>
      <div className={s.page}>
        <AppHeader active={active} />
        {children}
      </div>
    </RequireAuth>
  );
}
