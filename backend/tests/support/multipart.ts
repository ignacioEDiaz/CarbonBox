export type FilePart = { fileName: string; content: string };

// Arma un cuerpo multipart/form-data con las APIs de Node, sin librerías: Response calcula el
// cuerpo y el content-type con su boundary. Sirve para server.inject().
export async function multipartBody(...files: FilePart[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("file", new Blob([file.content]), file.fileName);
  }
  const response = new Response(form);
  return {
    payload: Buffer.from(await response.arrayBuffer()),
    headers: { "content-type": response.headers.get("content-type") ?? "" },
  };
}
