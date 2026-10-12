"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getToken } from "../lib/session";
import { LoadingSpinner } from "./LoadingSpinner";

// Envuelve las pantallas que necesitan sesión: sin token, lleva al login.
// Si el token venció, lo detecta el interceptor de la API con el primer 401.
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (getToken() === null) {
      router.replace("/login");
    } else {
      setHasSession(true);
    }
  }, [router]);

  return hasSession ? children : <LoadingSpinner />;
}
