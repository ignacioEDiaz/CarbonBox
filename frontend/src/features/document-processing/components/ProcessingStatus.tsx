import { UploadStatus } from "../types/upload.types";

// Los colores que pide la consigna
const BADGE: Record<UploadStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: UploadStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[status]}`}>{status}</span>;
}

// El badge y, mientras procesa, una barra animada: la API no informa el porcentaje del procesamiento
export function ProcessingStatus({ status }: { status: UploadStatus }) {
  return (
    <div className="space-y-2">
      <StatusBadge status={status} />
      {status === "PROCESSING" && (
        <div className="h-2 w-full overflow-hidden rounded bg-blue-100">
          <div className="h-2 w-1/3 animate-pulse rounded bg-blue-500" />
        </div>
      )}
      {status === "PENDING" && <p className="text-sm text-gray-500">En la cola, esperando al worker...</p>}
    </div>
  );
}
