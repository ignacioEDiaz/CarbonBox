import { Prisma, PrismaClient } from "../../../../generated/prisma/client";
import { DuplicateIdempotencyKeyError } from "../../../../shared/domain/errors";
import { Upload } from "../../../domain/entities/Upload";
import {
  IUploadRepository,
  PageRequest,
  StatusCounts,
  UploadPage,
} from "../../../domain/repositories/IUploadRepository";
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

  // findMany y count en la misma transacción: data y total salen de la misma lectura.
  // El id desempata dos uploads del mismo milisegundo, así ninguno se repite entre páginas.
  async findPageByUserId(userId: string, { skip, take }: PageRequest): Promise<UploadPage> {
    const [records, total] = await this.prismaClient.$transaction([
      this.prismaClient.upload.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take }),
      this.prismaClient.upload.count({ where: { userId } }),
    ]);
    return { uploads: records.map(PrismaUploadMapper.toDomain), total };
  }

  // Un GROUP BY status en la base, en vez de traer todos los uploads para contarlos
  async countByStatusForUser(userId: string): Promise<StatusCounts> {
    const groups = await this.prismaClient.upload.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } });
    const counts: StatusCounts = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
    for (const group of groups) {
      counts[group.status] = group._count._all;
    }
    return counts;
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
