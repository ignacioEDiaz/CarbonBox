"use client";

// Solo diseño: la página le pasa la lista, la paginación y el estado de carga por props
import Link from "next/link";
import { Upload, UploadStatus } from "../types/upload.types";
import s from "./Uploads.module.css";

// Los colores que pide la consigna: amarillo, azul, verde y rojo
const STATUS: Record<UploadStatus, string> = {
  PENDING: s.statusPending,
  PROCESSING: s.statusProcessing,
  COMPLETED: s.statusCompleted,
  FAILED: s.statusFailed,
};

type UploadsProps = {
  uploads: Upload[];
  page: number;
  totalPages: number;
  totalCount: number;
  isLoading: boolean;
  error?: string;
  onPrev: () => void;
  onNext: () => void;
};

export function Uploads({ uploads, page, totalPages, totalCount, isLoading, error, onPrev, onNext }: UploadsProps) {
  return (
    <main className={s.main}>
      <h1 className={s.title}>Mis uploads</h1>

      <section className={s.panel}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Estado</th>
                <th>Subido</th>
                <th>Filas procesadas</th>
                <th className={s.right}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => (
                <tr key={upload.id}>
                  <td className={s.file}>{upload.fileName}</td>
                  <td><span className={`${s.status} ${STATUS[upload.status]}`}>{upload.status}</span></td>
                  <td>{new Date(upload.createdAt).toLocaleString("es-AR")}</td>
                  {/* Hasta que termina el procesamiento los conteos son null */}
                  <td>{upload.processedRows === null ? "—" : `${upload.processedRows} de ${upload.totalRows}`}</td>
                  <td className={s.right}><Link href={`/uploads/${upload.id}`} className={s.detail}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableMessage isLoading={isLoading} error={error} isEmpty={uploads.length === 0} />
          <div className={s.pager}>
            <button type="button" className={s.pageBtn} onClick={onPrev} disabled={page <= 1}>Anterior</button>
            <span>Página {page} de {totalPages} ({totalCount} uploads)</span>
            <button type="button" className={s.pageBtn} onClick={onNext} disabled={page >= totalPages}>Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function TableMessage({ isLoading, error, isEmpty }: { isLoading: boolean; error?: string; isEmpty: boolean }) {
  if (isLoading) return <p className={s.message}>Cargando…</p>;
  if (error) return <p className={`${s.message} ${s.error}`}>{error}</p>;
  if (isEmpty) {
    return (
      <p className={s.message}>
        Todavía no subiste archivos. <Link href="/uploads/new">Subí el primero</Link>.
      </p>
    );
  }
  return null;
}
