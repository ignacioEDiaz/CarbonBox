import { ActivityData } from "../entities/ActivityData";

export type MonthlyRows = { year: number; month: number; rows: number }; // month: 1 a 12

export interface IActivityDataRepository {
  // Reemplaza todas las filas del upload (todo o nada): guardar dos veces no duplica
  saveForUpload(uploadId: string, rows: ActivityData[]): Promise<void>;
  findByUploadId(uploadId: string): Promise<ActivityData[]>;
  // Cuántas filas tiene el usuario en cada mes, según la fecha de la fila; ordenado por año y mes
  countByMonthForUser(userId: string): Promise<MonthlyRows[]>;
}
