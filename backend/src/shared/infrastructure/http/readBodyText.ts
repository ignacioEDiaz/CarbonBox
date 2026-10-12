// body llega como unknown. Devuelve el campo si es texto, o "" para que el handler lo valide
export function readBodyText(body: unknown, field: string): string {
  if (typeof body === "object" && body !== null && field in body) {
    const value: unknown = Reflect.get(body, field);
    return typeof value === "string" ? value : "";
  }
  return "";
}
