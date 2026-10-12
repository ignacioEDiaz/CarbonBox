"use client";

import Link from "next/link";
import { useState } from "react";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { errorMessage } from "@/shared/lib/api-client";
import { useUploads } from "../api/uploadsApi";
import { StatusBadge } from "./ProcessingStatus";

export function UploadList() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useUploads(page);

  if (isPending) return <LoadingSpinner />;
  if (error) return <p className="text-red-600">{errorMessage(error)}</p>;
  if (data.total === 0) {
    return (
      <p className="text-gray-600">
        Todavía no subiste archivos. <Link href="/uploads/new" className="underline">Subí el primero</Link>.
      </p>
    );
  }

  const lastPage = Math.ceil(data.total / data.limit);
  return (
    <div className="space-y-4">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-gray-500">
          <tr>
            <th className="py-2">Archivo</th>
            <th>Estado</th>
            <th>Subido</th>
            <th>Filas procesadas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((upload) => (
            <tr key={upload.id} className="border-b">
              <td className="py-2">{upload.fileName}</td>
              <td><StatusBadge status={upload.status} /></td>
              <td>{new Date(upload.createdAt).toLocaleString()}</td>
              <td>{upload.processedRows === null ? "-" : `${upload.processedRows} de ${upload.totalRows}`}</td>
              <td><Link href={`/uploads/${upload.id}`} className="underline">Ver detalle</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 text-sm">
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="underline disabled:opacity-40">
          Anterior
        </button>
        <span>Página {page} de {lastPage} ({data.total} uploads)</span>
        <button disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="underline disabled:opacity-40">
          Siguiente
        </button>
      </div>
    </div>
  );
}
