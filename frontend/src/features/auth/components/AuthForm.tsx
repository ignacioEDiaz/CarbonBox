"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { errorMessage } from "@/shared/lib/api-client";
import { useLogin, useRegister } from "../api/authApi";

// Un solo formulario para las dos pantallas: cambian el título, el botón y qué pasa al enviar
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const login = useLogin();
  const register = useRegister();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isPending = login.isPending || register.isPending;
  const error = login.error ?? register.error;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "register") {
      await register.mutateAsync({ email, password });
    }
    // Después de registrarse se inicia sesión directo, sin volver a escribir los datos
    await login.mutateAsync({ email, password });
    router.replace("/");
  }

  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
      <form onSubmit={(event) => void submit(event).catch(() => undefined)} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{errorMessage(error)}</p>}
        <button disabled={isPending} className="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50">
          {isPending ? "Un momento..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {mode === "login" ? (
          <>¿No tenés cuenta? <Link href="/register" className="underline">Creala acá</Link></>
        ) : (
          <>¿Ya tenés cuenta? <Link href="/login" className="underline">Iniciá sesión</Link></>
        )}
      </p>
    </main>
  );
}
