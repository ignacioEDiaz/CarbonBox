"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { errorMessage } from "@/shared/lib/api-client";
import { useLogin, useRegister } from "../api/authApi";
import { AuthFormView, AuthMode } from "./AuthFormView";

// La lógica de las dos pantallas; el diseño vive en AuthFormView
export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const login = useLogin();
  const register = useRegister();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <AuthFormView
      mode={mode}
      email={email}
      password={password}
      onEmailChange={(event) => setEmail(event.target.value)}
      onPasswordChange={(event) => setPassword(event.target.value)}
      onSubmit={(event) => void submit(event).catch(() => undefined)}
      loading={login.isPending || register.isPending}
      error={error ? errorMessage(error) : undefined}
    />
  );
}
