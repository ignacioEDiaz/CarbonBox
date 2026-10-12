import axios, { isAxiosError } from "axios";
import { clearToken, getToken } from "./session";

// Mismo origen que el frontend: next.config.ts reenvía /api a la API
export const apiClient = axios.create({ baseURL: "/api/v1" });

// Cada pedido lleva el token de la sesión, si hay
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token !== null) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un 401 fuera del login significa que la sesión venció o no existe: se borra y se va al login
apiClient.interceptors.response.use(undefined, (error: unknown) => {
  const isAuthEndpoint = isAxiosError(error) && (error.config?.url ?? "").startsWith("/auth/");
  if (isAxiosError(error) && error.response?.status === 401 && !isAuthEndpoint) {
    clearToken();
    window.location.href = "/login";
  }
  return Promise.reject(error);
});

// El mensaje que manda la API ({ error: { message } }) o uno genérico
export function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (typeof data === "object" && data !== null && "error" in data) {
      const apiError: unknown = data.error;
      if (typeof apiError === "object" && apiError !== null && "message" in apiError && typeof apiError.message === "string") {
        return apiError.message;
      }
    }
  }
  return "Algo salió mal. Probá de nuevo.";
}
