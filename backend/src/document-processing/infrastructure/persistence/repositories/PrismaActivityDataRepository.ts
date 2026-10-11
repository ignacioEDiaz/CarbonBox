import { PrismaClient } from "../../../../generated/prisma/client";
import { ActivityData } from "../../../domain/entities/ActivityData";
import { IActivityDataRepository } from "../../../domain/repositories/IActivityDataRepository";
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
    const records = await this.prismaClient.activityData.findMany({ where: { uploadId } });
    return records.map(PrismaActivityDataMapper.toDomain);
  }
}
