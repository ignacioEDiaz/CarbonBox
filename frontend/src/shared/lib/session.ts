// El token de sesión vive en localStorage. Para una prueba alcanza; en producción convendría una
// cookie httpOnly, que el JavaScript de la página no puede leer.
const TOKEN_KEY = "carbonbox.token";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
