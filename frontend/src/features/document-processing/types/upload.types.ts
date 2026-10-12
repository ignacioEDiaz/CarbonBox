// Las formas que devuelve la API (ver README del backend)

export type UploadStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type Upload = {
  id: string;
  status: UploadStatus;
  fileName: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadReceipt = Pick<Upload, "id" | "status" | "fileName" | "createdAt">;

export type UploadPage = { data: Upload[]; total: number; page: number; limit: number };

export type UploadsSummary = { total: number; pending: number; processing: number; completed: number; failed: number };

export type ActivityRow = { category: string; amount: number; unit: string; date: string };

export type RowError = { line: number; message: string };

export type MonthlyRows = { year: number; month: number; rows: number }; // month: 1 a 12

// COMPLETED y FAILED no cambian más: ahí se corta el polling
export function isFinalStatus(status: UploadStatus): boolean {
  return status === "COMPLETED" || status === "FAILED";
}
