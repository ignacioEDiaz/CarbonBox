"use client";

import Link from "next/link";
import { useUploadsSummary } from "@/features/document-processing/api/uploadsApi";
import { Layout } from "@/shared/components/Layout";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { errorMessage } from "@/shared/lib/api-client";

// Dashboard: el resumen de los uploads del usuario
export default function DashboardPage() {
  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <Summary />
      <Link href="/uploads/new" className="mt-6 inline-block rounded bg-gray-900 px-4 py-2 text-white">
        Subir un CSV
      </Link>
    </Layout>
  );
}

function Summary() {
  const { data, isPending, error } = useUploadsSummary();
  if (isPending) return <LoadingSpinner />;
  if (error) return <p className="text-red-600">{errorMessage(error)}</p>;

  const cards = [
    { label: "Total de uploads", value: data.total },
    { label: "Completados", value: data.completed },
    { label: "En proceso", value: data.pending + data.processing },
    { label: "Fallidos", value: data.failed },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded border bg-white p-4">
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className="text-3xl font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
