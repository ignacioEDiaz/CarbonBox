import { ActivityRow, RowError } from "../types/upload.types";
import s from "./UploadDetail.module.css";

export function ResultsTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <section className={s.panel}>
      <h2 className={s.panelTitle}>Datos procesados</h2>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr><th>Categoría</th><th>Cantidad</th><th>Unidad</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className={s.strong}>{row.category}</td>
                <td>{row.amount}</td>
                <td>{row.unit}</td>
                <td>{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Los errores por fila: la línea del archivo y qué corregir
export function RowErrorsTable({ errors }: { errors: RowError[] }) {
  return (
    <section className={`${s.panel} ${s.panelError}`}>
      <h2 className={s.panelTitle}>Filas con errores <span className={s.count}>{errors.length}</span></h2>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr><th className={s.lineCol}>Línea</th><th>Motivo</th></tr>
          </thead>
          <tbody>
            {errors.map((error) => (
              <tr key={error.line}>
                <td><span className={s.line}>{error.line}</span></td>
                <td>{error.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
