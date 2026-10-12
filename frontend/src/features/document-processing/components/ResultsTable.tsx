"use client";

import { useState } from "react";
import { ActivityRow, RowError } from "../types/upload.types";
import s from "./UploadDetail.module.css";

const ROWS_PER_PAGE = 10;

// La API devuelve todas las filas del upload (formato de la consigna, sin paginar): se paginan acá
export function ResultsTable({ rows }: { rows: ActivityRow[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const visible = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <section className={`${s.panel} ${s.panelLight}`}>
      <h2 className={s.panelTitle}>Datos procesados</h2>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr><th>Categoría</th><th>Cantidad</th><th>Unidad</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={(page - 1) * ROWS_PER_PAGE + index}>
                <td className={s.strong}>{row.category}</td>
                <td>{row.amount}</td>
                <td>{row.unit}</td>
                <td>{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={s.pager}>
          <button type="button" className={s.pageBtn} onClick={() => setPage(page - 1)} disabled={page <= 1}>
            Anterior
          </button>
          <span>Página {page} de {totalPages} ({rows.length} filas)</span>
          <button type="button" className={s.pageBtn} onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}

// Los errores por fila: la línea del archivo y qué corregir
export function RowErrorsTable({ errors }: { errors: RowError[] }) {
  return (
    <section className={`${s.panel} ${s.panelLight}`}>
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
