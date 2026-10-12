"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "../lib/session";
import s from "./AppHeader.module.css";

type Section = "dashboard" | "uploads" | "upload";

const LINKS: { section: Section; href: string; label: string }[] = [
  { section: "dashboard", href: "/", label: "Dashboard" },
  { section: "uploads", href: "/uploads", label: "Uploads" },
  { section: "upload", href: "/uploads/new", label: "Subir CSV" },
];

// El encabezado del diseño, igual en todas las pantallas: solo cambia qué link está activo
export function AppHeader({ active }: { active: Section }) {
  const router = useRouter();

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Image
          src="/logo-carbonbox-blanco.png"
          alt="CarbonBox"
          width={150}
          height={30}
          priority
          style={{ height: 30, width: "auto" }}
        />
        <nav className={s.nav}>
          {LINKS.map((link) => (
            <Link
              key={link.section}
              href={link.href}
              className={link.section === active ? `${s.navLink} ${s.navActive}` : s.navLink}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button type="button" className={s.logout} onClick={logout}>Cerrar sesión</button>
      </div>
    </header>
  );
}
