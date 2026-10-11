import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { IConvictProps } from "../../../config/IConvictProps";
import { IFileStorage } from "../../../shared/infrastructure/storage/IFileStorage";

// Guarda los CSV en S3 (LocalStack en local). Cada archivo va a una clave nueva: el nombre que
// mandó el usuario nunca se usa, así dos "datos.csv" no se pisan y "../x.csv" no hace daño.
export class S3FileStorage implements IFileStorage {
  private readonly bucket: string;

  constructor(
    private readonly s3Client: S3Client,
    config: IConvictProps,
  ) {
    this.bucket = config.storage.bucket;
  }

  async save(content: Buffer): Promise<string> {
    const key = `uploads/${randomUUID()}.csv`;
    await this.s3Client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: content, ContentType: "text/csv" }),
    );
    return key;
  }

  async read(location: string): Promise<Buffer> {
    const { Body } = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucket, Key: location }));
    if (Body === undefined) {
      throw new Error(`S3 no devolvió contenido para ${location}`);
    }
    return Buffer.from(await Body.transformToByteArray());
  }
}
