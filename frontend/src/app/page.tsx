"use client";

import { useUploadsSummary } from "@/features/document-processing/api/uploadsApi";
import { Dashboard } from "@/features/document-processing/components/Dashboard";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { errorMessage } from "@/shared/lib/api-client";

// Dashboard: pide el resumen y se lo pasa al diseño
export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardWithData />
    </RequireAuth>
  );
}

function DashboardWithData() {
  const { data, isPending, error } = useUploadsSummary();
  if (isPending || error) {
    const placeholder = isPending ? "…" : "—";
    return (
      <Dashboard
        total={placeholder}
        completed={placeholder}
        processing={placeholder}
        failed={placeholder}
        error={error ? errorMessage(error) : undefined}
      />
    );
  }
  // "En proceso" suma los que esperan en la cola (PENDING) y los que se están procesando
  return (
    <Dashboard
      total={data.total}
      completed={data.completed}
      processing={data.pending + data.processing}
      failed={data.failed}
    />
  );
}
