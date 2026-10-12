import { QueryClient } from "@tanstack/react-query";

// Una instancia por pestaña. retry: 1 para no insistir con errores que no se arreglan solos (404, 400).
export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
}
