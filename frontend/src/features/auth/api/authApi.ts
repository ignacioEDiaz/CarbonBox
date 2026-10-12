import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import { saveToken } from "@/shared/lib/session";

type Credentials = { email: string; password: string };

export function useRegister() {
  return useMutation({
    mutationFn: async (credentials: Credentials) => (await apiClient.post("/auth/register", credentials)).data,
  });
}

// Guarda el token que devuelve la API: desde ahí, cada pedido lo manda (interceptor de api-client)
export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: Credentials) =>
      (await apiClient.post<{ token: string }>("/auth/login", credentials)).data,
    onSuccess: ({ token }) => saveToken(token),
  });
}
