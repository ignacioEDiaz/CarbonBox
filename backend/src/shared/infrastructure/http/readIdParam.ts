// params llega como unknown. Si no trae un id de texto, devuelve "" y el handler responde
// "no encontrado", igual que con cualquier id inexistente.
export function readIdParam(params: unknown): string {
  if (typeof params === "object" && params !== null && "id" in params && typeof params.id === "string") {
    return params.id;
  }
  return "";
}
