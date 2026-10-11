import { Prisma, PrismaClient } from "../../../../generated/prisma/client";
import { DuplicateIdempotencyKeyError } from "../../../../shared/domain/errors";
import { Upload } from "../../../domain/entities/Upload";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { PrismaUploadMapper } from "../mappers/PrismaUploadMapper";

export class PrismaUploadRepository implements IUploadRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async save(upload: Upload): Promise<void> {
    const data = PrismaUploadMapper.toPersistence(upload);
    try {
      // upsert: el mismo método sirve para el upload nuevo y para cada cambio de estado
      await this.prismaClient.upload.upsert({ where: { id: upload.id }, create: data, update: data });
    } catch (error) {
      // Traduce el error de Prisma a uno del dominio, para que el handler no dependa de Prisma
      if (isDuplicateIdempotencyKey(error)) {
        throw new DuplicateIdempotencyKeyError(`Ya existe un upload con la clave ${upload.idempotencyKey}`);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Upload | null> {
    const record = await this.prismaClient.upload.findUnique({ where: { id } });
    return record === null ? null : PrismaUploadMapper.toDomain(record);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Upload | null> {
    const record = await this.prismaClient.upload.findUnique({ where: { idempotencyKey } });
    return record === null ? null : PrismaUploadMapper.toDomain(record);
  }
}

// P2002 es "violación de índice único". Con el adaptador de Postgres, el nombre del índice
// ("Upload_idempotencyKey_key") viene dentro de meta.driverAdapterError, no en meta.target:
// buscar el nombre de la columna en meta cubre las dos formas.
function isDuplicateIdempotencyKey(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes("idempotencyKey")
  );
}
