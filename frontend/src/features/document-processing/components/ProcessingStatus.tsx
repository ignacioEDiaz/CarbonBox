import { UploadStatus } from "../types/upload.types";
import s from "./UploadDetail.module.css";

// Los colores que pide la consigna: amarillo, azul, verde y rojo
const BADGE: Record<UploadStatus, string> = {
  PENDING: s.statusPending,
  PROCESSING: s.statusProcessing,
  COMPLETED: s.statusCompleted,
  FAILED: s.statusFailed,
};

export function StatusBadge({ status }: { status: UploadStatus }) {
  return <span className={`${s.status} ${BADGE[status]}`}>{status}</span>;
}

// Mientras no terminó: una barra animada (la API no informa el porcentaje del procesamiento)
// o el aviso de que está en la cola
export function ProcessingStatus({ status }: { status: UploadStatus }) {
  if (status === "PROCESSING") {
    return (
      <div className={s.progress} role="progressbar" aria-label="Procesando el archivo">
        <div className={s.progressBar} />
      </div>
    );
  }
  if (status === "PENDING") {
    return <p className={s.hint}>En la cola, esperando al worker…</p>;
  }
  return null;
}
