"use client";

import { useRouter } from "next/navigation";
import { DragEvent, useState } from "react";
import { errorMessage } from "@/shared/lib/api-client";
import { useCreateUpload } from "../api/uploadsApi";

// Selector o arrastrar y soltar. Solo .csv; al terminar la subida lleva al detalle.
export function UploadForm() {
  const router = useRouter();
  const upload = useCreateUpload();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function choose(candidate: File | undefined) {
    if (candidate === undefined) return;
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setValidation("Solo se aceptan archivos .csv");
      return;
    }
    setValidation(null);
    setFile(candidate);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }

  function send() {
    if (file === null) return;
    upload.mutate(file, { onSuccess: (receipt) => router.push(`/uploads/${receipt.id}`) });
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`flex cursor-pointer flex-col items-center rounded border-2 border-dashed p-10 text-center ${
          dragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <span className="text-gray-700">{file ? file.name : "Arrastrá un CSV acá o hacé clic para elegirlo"}</span>
        <input type="file" accept=".csv" className="hidden" onChange={(event) => choose(event.target.files?.[0])} />
      </label>
      {validation && <p className="text-sm text-red-600">{validation}</p>}
      {upload.isError && <p className="text-sm text-red-600">{errorMessage(upload.error)}</p>}
      {upload.isPending && (
        <div className="h-2 w-full rounded bg-gray-200">
          <div className="h-2 rounded bg-gray-900" style={{ width: `${upload.progress}%` }} />
        </div>
      )}
      {/* Deshabilitado mientras sube: evita el doble clic (el backend además respeta Idempotency-Key) */}
      <button
        onClick={send}
        disabled={file === null || upload.isPending}
        className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {upload.isPending ? `Subiendo... ${upload.progress}%` : "Subir"}
      </button>
    </div>
  );
}
