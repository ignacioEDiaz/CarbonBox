// Un problema de una fila del CSV: información para quien subió el archivo, no un error del
// sistema. Vive en el dominio porque lo usan el parser y el repositorio de errores.
export type RowError = {
  line: number; // línea del archivo donde empieza la fila (el encabezado es la 1)
  message: string;
};
