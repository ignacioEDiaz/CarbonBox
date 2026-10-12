"use client";

import Link from "next/link";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { errorMessage } from "@/shared/lib/api-client";
import { useUpload, useUploadErrors, useUploadResults } from "../api/uploadsApi";
import { isFinalStatus } from "../types/upload.types";
import { ProcessingStatus } from "./ProcessingStatus";
import { ResultsTable, RowErrorsTable } from "./ResultsTable";

export function UploadDetail({ id }: { id: string }) {
  const { data: upload, isPending, error } = useUpload(id); // hace polling solo mientras no termine
  const finished = upload !== undefined && isFinalStatus(upload.status);
  const results = useUploadResults(id, finished);
  const rowErrors = useUploadErrors(id, finished);

  if (isPending) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{errorMessage(error)}</p>
        <BackLink />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{upload.fileName}</h1>
        <p className="text-sm text-gray-500">Subido el {new Date(upload.createdAt).toLocaleString()}</p>
      </div>
      <ProcessingStatus status={upload.status} />

      {upload.status === "FAILED" && (
        <p className="rounded bg-red-50 p-3 text-red-700">{upload.errorMessage}</p>
      )}
      {upload.status === "COMPLETED" && (
        <p className="text-sm text-gray-700">
          {upload.processedRows} de {upload.totalRows} filas procesadas, {upload.failedRows} con errores.
        </p>
      )}

      {upload.status === "COMPLETED" && (
        <section className="space-y-2">
          <h2 className="font-semibold">Datos procesados</h2>
          {results.data ? <ResultsTable rows={results.data} /> : <LoadingSpinner />}
        </section>
      )}
      {finished && rowErrors.data && rowErrors.data.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Filas con errores</h2>
          <RowErrorsTable errors={rowErrors.data} />
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return <Link href="/uploads" className="text-sm underline">← Volver a la lista</Link>;
}
