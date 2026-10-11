import { ActivityData as ActivityDataRecord } from "../../../../generated/prisma/client";
import { ActivityData } from "../../../domain/entities/ActivityData";

// Las fechas se convierten siempre en UTC: "2024-01-15" <-> 2024-01-15T00:00:00Z.
// Con los métodos de hora local, en Argentina (UTC-3) el día se correría al 14.
export class PrismaActivityDataMapper {
  static toDomain(record: ActivityDataRecord): ActivityData {
    return ActivityData.restore({ ...record, date: record.date.toISOString().slice(0, 10) });
  }

  static toPersistence(activity: ActivityData): ActivityDataRecord {
    return {
      id: activity.id,
      uploadId: activity.uploadId,
      category: activity.category,
      amount: activity.amount,
      unit: activity.unit,
      date: new Date(activity.date), // "YYYY-MM-DD" se interpreta como medianoche UTC
      createdAt: activity.createdAt,
    };
  }
}
