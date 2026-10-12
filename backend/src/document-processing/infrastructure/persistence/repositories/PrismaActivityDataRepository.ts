import { PrismaClient } from "../../../../generated/prisma/client";
import { ActivityData } from "../../../domain/entities/ActivityData";
import { IActivityDataRepository, MonthlyRows } from "../../../domain/repositories/IActivityDataRepository";
import { PrismaActivityDataMapper } from "../mappers/PrismaActivityDataMapper";

export class PrismaActivityDataRepository implements IActivityDataRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  // Borrar e insertar en una sola transacción: o quedan todas las filas nuevas o ninguna.
  // Si el worker reintenta un upload, las filas del intento anterior se reemplazan, no se duplican.
  async saveForUpload(uploadId: string, rows: ActivityData[]): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.activityData.deleteMany({ where: { uploadId } }),
      this.prismaClient.activityData.createMany({ data: rows.map(PrismaActivityDataMapper.toPersistence) }),
    ]);
  }

  async findByUploadId(uploadId: string): Promise<ActivityData[]> {
    const records = await this.prismaClient.activityData.findMany({
      where: { uploadId },
      orderBy: [{ date: "asc" }, { category: "asc" }, { id: "asc" }],
    });
    return records.map(PrismaActivityDataMapper.toDomain);
  }

  // Prisma no agrupa por partes de una fecha, así que va SQL. $queryRaw con template string pasa
  // userId como parámetro (no lo concatena): no hay inyección de SQL.
  async countByMonthForUser(userId: string): Promise<MonthlyRows[]> {
    return this.prismaClient.$queryRaw<MonthlyRows[]>`
      SELECT EXTRACT(YEAR FROM a."date")::int AS "year",
             EXTRACT(MONTH FROM a."date")::int AS "month",
             COUNT(*)::int AS "rows"
      FROM "ActivityData" a
      JOIN "Upload" u ON u."id" = a."uploadId"
      WHERE u."userId" = ${userId}
      GROUP BY 1, 2
      ORDER BY 1, 2`;
  }
}
