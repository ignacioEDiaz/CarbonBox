"use client";

// Solo diseño: AuthForm le pasa los valores, los handlers, la carga y el error por props
import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent } from "react";
import s from "./AuthFormView.module.css";

export type AuthMode = "login" | "register";

const COPY: Record<AuthMode, { title: string; cta: string; question: string; link: string; href: string }> = {
  login: { title: "Iniciar sesión", cta: "Entrar", question: "¿No tenés cuenta?", link: "Creala acá", href: "/register" },
  register: { title: "Crear cuenta", cta: "Crear cuenta", question: "¿Ya tenés cuenta?", link: "Iniciá sesión", href: "/login" },
};

type AuthFormViewProps = {
  mode: AuthMode;
  email: string;
  password: string;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error?: string;
};

export function AuthFormView({ mode, email, password, onEmailChange, onPasswordChange, onSubmit, loading, error }: AuthFormViewProps) {
  const copy = COPY[mode];
  return (
    <div className={s.page}>
      <Image src="/logo-carbonbox-blanco.png" alt="CarbonBox" width={180} height={36} priority className={s.logo} />
      <div className={s.wrap}>
        {/* El logo grande y difuso detrás de la tarjeta: es decorativo, por eso alt vacío */}
        <Image src="/logo-carbonbox-blanco.png" alt="" aria-hidden width={600} height={120} className={s.logoBg} />
        <form className={s.card} onSubmit={onSubmit}>
          <h1 className={s.title}>{copy.title}</h1>
          <input
            className={s.input}
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={onEmailChange}
          />
          <input
            className={s.input}
            type="password"
            name="password"
            placeholder="Contraseña (mínimo 8 caracteres)"
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={onPasswordChange}
          />
          {error && <p className={s.error}>{error}</p>}
          <button type="submit" className={s.btn} disabled={loading}>{loading ? "Cargando…" : copy.cta}</button>
          <p className={s.alt}>{copy.question} <Link href={copy.href}>{copy.link}</Link></p>
        </form>
      </div>
    </div>
  );
}
