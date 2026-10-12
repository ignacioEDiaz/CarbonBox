"use client";

import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useState } from "react";
import { errorMessage } from "@/shared/lib/api-client";
import { clearToken } from "@/shared/lib/session";
import { useCreateUpload } from "../api/uploadsApi";
import { UploadCsv } from "./UploadCsv";

// La lógica de la subida: elegir o soltar el archivo, validar que sea .csv, subirlo con su avance
// y llevar al detalle. El diseño lo pone UploadCsv.
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

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }

  // El botón queda deshabilitado mientras sube: evita el doble clic
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file === null) return;
    upload.mutate(file, { onSuccess: (receipt) => router.push(`/uploads/${receipt.id}`) });
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <UploadCsv
      fileName={file?.name}
      fileSize={file?.size}
      isDragging={dragging}
      isUploading={upload.isPending}
      progress={upload.progress}
      error={validation ?? (upload.isError ? errorMessage(upload.error) : undefined)}
      onFileChange={(event) => choose(event.target.files?.[0])}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      onSubmit={submit}
      onLogout={logout}
    />
  );
}
