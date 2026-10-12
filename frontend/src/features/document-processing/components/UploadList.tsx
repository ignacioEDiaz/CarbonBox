"use client";

import { useState } from "react";
import { errorMessage } from "@/shared/lib/api-client";
import { useUploads } from "../api/uploadsApi";
import { Uploads } from "./Uploads";

// La lógica de la lista: qué página se ve y pedirla a la API. El diseño lo pone Uploads.
export function UploadList() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useUploads(page);
  // Con 0 uploads igual se muestra "Página 1 de 1"
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <Uploads
      uploads={data?.data ?? []}
      page={page}
      totalPages={totalPages}
      totalCount={data?.total ?? 0}
      isLoading={isPending}
      error={error ? errorMessage(error) : undefined}
      onPrev={() => setPage(page - 1)}
      onNext={() => setPage(page + 1)}
    />
  );
}
