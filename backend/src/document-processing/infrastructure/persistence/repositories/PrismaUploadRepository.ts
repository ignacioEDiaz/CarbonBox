import { PrismaClient } from "../../../../generated/prisma/client";
import { Upload } from "../../../domain/entities/Upload";
import { IUploadRepository } from "../../../domain/repositories/IUploadRepository";
import { PrismaUploadMapper } from "../mappers/PrismaUploadMapper";

export class PrismaUploadRepository implements IUploadRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async save(upload: Upload): Promise<void> {
    const data = PrismaUploadMapper.toPersistence(upload);
    // upsert: el mismo método sirve para el upload nuevo y para cada cambio de estado
    await this.prismaClient.upload.upsert({ where: { id: upload.id }, create: data, update: data });
  }

  async findById(id: string): Promise<Upload | null> {
    const record = await this.prismaClient.upload.findUnique({ where: { id } });
    return record === null ? null : PrismaUploadMapper.toDomain(record);
  }
}
