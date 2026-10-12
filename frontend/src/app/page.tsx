"use client";

import { useActivityByMonth, useUploadsSummary } from "@/features/document-processing/api/uploadsApi";
import { toActivityChart } from "@/features/document-processing/components/activityChart";
import { Dashboard } from "@/features/document-processing/components/Dashboard";
import { Layout } from "@/shared/components/Layout";
import { errorMessage } from "@/shared/lib/api-client";

// Dashboard: pide el resumen y las filas por mes, y se los pasa al diseño
export default function DashboardPage() {
  return (
    <Layout active="dashboard">
      <DashboardWithData />
    </Layout>
  );
}

function DashboardWithData() {
  const { data, isPending, error } = useUploadsSummary();
  const activity = useActivityByMonth();
  const chart = toActivityChart(activity.data ?? []);
  if (isPending || error) {
    const placeholder = isPending ? "…" : "—";
    return (
      <Dashboard
        total={placeholder}
        completed={placeholder}
        processing={placeholder}
        failed={placeholder}
        chart={chart}
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
      chart={chart}
    />
  );
}
