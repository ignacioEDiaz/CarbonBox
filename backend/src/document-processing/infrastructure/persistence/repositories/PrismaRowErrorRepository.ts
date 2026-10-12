import { PrismaClient } from "../../../../generated/prisma/client";
import { IRowErrorRepository } from "../../../domain/repositories/IRowErrorRepository";
import { RowError } from "../../../domain/value-objects/RowError";

export class PrismaRowErrorRepository implements IRowErrorRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  // Igual que ActivityData: borrar e insertar en una transacción, así un reintento reemplaza
  // los errores del intento anterior en lugar de duplicarlos
  async saveForUpload(uploadId: string, errors: RowError[]): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.rowError.deleteMany({ where: { uploadId } }),
      this.prismaClient.rowError.createMany({
        data: errors.map((error) => ({ uploadId, line: error.line, message: error.message })),
      }),
    ]);
  }

  async findByUploadId(uploadId: string): Promise<RowError[]> {
    const records = await this.prismaClient.rowError.findMany({ where: { uploadId }, orderBy: { line: "asc" } });
    return records.map((record) => ({ line: record.line, message: record.message }));
  }
}
