"use client";

import Link from "next/link";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { errorMessage } from "@/shared/lib/api-client";
import { useUpload, useUploadErrors, useUploadResults } from "../api/uploadsApi";
import { isFinalStatus, Upload } from "../types/upload.types";
import { ProcessingStatus, StatusBadge } from "./ProcessingStatus";
import { ResultsTable, RowErrorsTable } from "./ResultsTable";
import s from "./UploadDetail.module.css";

export function UploadDetail({ id }: { id: string }) {
  const { data: upload, isPending, error } = useUpload(id); // hace polling solo mientras no termine
  const finished = upload !== undefined && isFinalStatus(upload.status);
  const results = useUploadResults(id, finished);
  const rowErrors = useUploadErrors(id, finished);

  return (
    <main className={s.main}>
      <Link href="/uploads" className={s.back}>← Volver a la lista</Link>
      {isPending && <LoadingSpinner />}
      {error && <p className={s.message}>{errorMessage(error)}</p>}
      {upload && (
        <>
          <Summary upload={upload} />
          <ProcessingStatus status={upload.status} />
          {upload.status === "FAILED" && (
            <section className={`${s.panel} ${s.panelError}`}>
              <h2 className={s.panelTitle}>No se pudo procesar</h2>
              <p className={s.failure}>{upload.errorMessage}</p>
            </section>
          )}
          {results.data && results.data.length > 0 && <ResultsTable rows={results.data} />}
          {rowErrors.data && rowErrors.data.length > 0 && <RowErrorsTable errors={rowErrors.data} />}
        </>
      )}
    </main>
  );
}

// Nombre, fecha, estado y los tres conteos (en "—" hasta que el worker termina)
function Summary({ upload }: { upload: Upload }) {
  const stats = [
    { label: "Filas totales", value: upload.totalRows },
    { label: "Procesadas", value: upload.processedRows, dot: "#9bd9b8", color: "#9bd9b8" },
    { label: "Con errores", value: upload.failedRows, dot: "#ff8a8a", color: "#ffb0b0" },
  ];
  return (
    <>
      <div className={s.top}>
        <div>
          <h1 className={s.title}>{upload.fileName}</h1>
          <p className={s.meta}>Subido el {new Date(upload.createdAt).toLocaleString("es-AR")}</p>
        </div>
        <StatusBadge status={upload.status} />
      </div>
      <div className={s.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.stat}>
            <div className={s.statLabel}>
              {stat.dot && <span className={s.statDot} style={{ background: stat.dot }} />}
              {stat.label}
            </div>
            <div className={s.statValue} style={stat.color ? { color: stat.color } : undefined}>
              {stat.value ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
