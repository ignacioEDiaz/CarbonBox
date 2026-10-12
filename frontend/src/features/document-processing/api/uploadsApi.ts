import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "@/shared/lib/api-client";
import {
  ActivityRow,
  isFinalStatus,
  Upload,
  UploadPage,
  UploadReceipt,
  UploadsSummary,
  RowError,
} from "../types/upload.types";

const POLLING_MS = 3000; // la consigna pide cada 3 segundos

export function useUploadsSummary() {
  return useQuery({
    queryKey: ["uploads", "summary"],
    queryFn: async () => (await apiClient.get<UploadsSummary>("/uploads/summary")).data,
  });
}

export function useUploads(page: number) {
  return useQuery({
    queryKey: ["uploads", "list", page],
    queryFn: async () => (await apiClient.get<UploadPage>("/uploads", { params: { page, limit: 10 } })).data,
  });
}

// Polling: mientras el upload no termine, vuelve a preguntar cada 3 s; al terminar, para solo
export function useUpload(id: string) {
  return useQuery({
    queryKey: ["uploads", "detail", id],
    queryFn: async () => (await apiClient.get<Upload>(`/uploads/${id}`)).data,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status !== undefined && isFinalStatus(status) ? false : POLLING_MS;
    },
  });
}

// Solo se piden cuando el upload terminó (enabled): antes no hay nada que mostrar
export function useUploadResults(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["uploads", "results", id],
    queryFn: async () => (await apiClient.get<{ data: ActivityRow[] }>(`/uploads/${id}/results`)).data.data,
    enabled,
  });
}

export function useUploadErrors(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["uploads", "errors", id],
    queryFn: async () => (await apiClient.get<{ data: RowError[] }>(`/uploads/${id}/errors`)).data.data,
    enabled,
  });
}

// La subida con su porcentaje de avance (onUploadProgress de Axios)
export function useCreateUpload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const response = await apiClient.post<UploadReceipt>("/uploads", form, {
        onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
      });
      return response.data;
    },
    // La lista y el resumen cambiaron: que se vuelvan a pedir
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["uploads"] }),
  });
  return { ...mutation, progress };
}
