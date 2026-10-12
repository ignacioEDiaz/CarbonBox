import { ActivityRow, RowError } from "../types/upload.types";

export function ResultsTable({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">No hay filas válidas.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b text-gray-500">
        <tr>
          <th className="py-2">Categoría</th>
          <th>Cantidad</th>
          <th>Unidad</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b">
            <td className="py-2">{row.category}</td>
            <td>{row.amount}</td>
            <td>{row.unit}</td>
            <td>{row.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Los errores por fila: la línea del archivo y qué corregir
export function RowErrorsTable({ errors }: { errors: RowError[] }) {
  if (errors.length === 0) return null;
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b text-gray-500">
        <tr>
          <th className="py-2">Línea</th>
          <th>Motivo</th>
        </tr>
      </thead>
      <tbody>
        {errors.map((error) => (
          <tr key={error.line} className="border-b">
            <td className="py-2">{error.line}</td>
            <td>{error.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
