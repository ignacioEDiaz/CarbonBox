import { randomUUID } from "node:crypto";
import { AggregateRoot } from "../../../shared/domain/AggregateRoot";
import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";
import { FileName } from "../value-objects/FileName";
import { UploadStatus } from "../value-objects/UploadStatus";

export type UploadProps = {
  id: string;
  fileName: FileName;
  fileUrl: string;
  status: UploadStatus;
  userId: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RowCounts = {
  totalRows: number;
  processedRows: number;
  failedRows: number;
};

type NewUpload = {
  fileName: FileName;
  fileUrl: string;
  userId: string;
  idempotencyKey?: string | null; // la manda el cliente para no crear dos uploads al reintentar
};

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

function isValidIdempotencyKey(key: string): boolean {
  return key.trim() !== "" && key.length <= MAX_IDEMPOTENCY_KEY_LENGTH;
}

function areValidCounts({ totalRows, processedRows, failedRows }: RowCounts): boolean {
  const counts = [totalRows, processedRows, failedRows];
  const allNonNegativeIntegers = counts.every((count) => Number.isInteger(count) && count >= 0);
  return allNonNegativeIntegers && processedRows + failedRows === totalRows;
}

// Aggregate root: todo cambio de estado pasa por estos métodos, así nadie
// (ni la API ni el worker) puede dejar un upload en un estado imposible.
export class Upload extends AggregateRoot {
  private constructor(private props: UploadProps) {
    super(props.id);
  }

  static create({ fileName, fileUrl, userId, idempotencyKey = null }: NewUpload): Either<ValidationError, Upload> {
    if (fileUrl.trim() === "") {
      return Either.left(new ValidationError("La ubicación del archivo no puede estar vacía"));
    }
    if (idempotencyKey !== null && !isValidIdempotencyKey(idempotencyKey)) {
      return Either.left(
        new ValidationError(`La clave de idempotencia debe tener entre 1 y ${MAX_IDEMPOTENCY_KEY_LENGTH} caracteres`),
      );
    }
    const now = new Date();
    return Either.right(
      new Upload({
        id: randomUUID(),
        fileName,
        fileUrl,
        status: UploadStatus.PENDING,
        userId,
        totalRows: null,
        processedRows: null,
        failedRows: null,
        errorMessage: null,
        idempotencyKey,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  // Reconstruye un upload ya guardado: los datos vienen de la base, no se vuelven a validar
  static restore(props: UploadProps): Upload {
    return new Upload(props);
  }

  get fileName(): FileName {
    return this.props.fileName;
  }

  get fileUrl(): string {
    return this.props.fileUrl;
  }

  get status(): UploadStatus {
    return this.props.status;
  }

  get userId(): string {
    return this.props.userId;
  }

  get totalRows(): number | null {
    return this.props.totalRows;
  }

  get processedRows(): number | null {
    return this.props.processedRows;
  }

  get failedRows(): number | null {
    return this.props.failedRows;
  }

  get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  get idempotencyKey(): string | null {
    return this.props.idempotencyKey;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Desde PENDING, o desde PROCESSING si el procesamiento se reintenta
  markAsProcessing(): Either<ValidationError, void> {
    if (!this.status.canTransitionTo(UploadStatus.PROCESSING)) {
      return this.invalidTransition(UploadStatus.PROCESSING);
    }
    this.update({ status: UploadStatus.PROCESSING });
    return Either.right(undefined);
  }

  markAsCompleted(counts: RowCounts): Either<ValidationError, void> {
    if (!this.status.canTransitionTo(UploadStatus.COMPLETED)) {
      return this.invalidTransition(UploadStatus.COMPLETED);
    }
    if (!areValidCounts(counts)) {
      return Either.left(
        new ValidationError("Los conteos deben ser enteros no negativos y procesadas + fallidas = totales"),
      );
    }
    this.update({ status: UploadStatus.COMPLETED, ...counts });
    return Either.right(undefined);
  }

  markAsFailed(errorMessage: string): Either<ValidationError, void> {
    if (!this.status.canTransitionTo(UploadStatus.FAILED)) {
      return this.invalidTransition(UploadStatus.FAILED);
    }
    if (errorMessage.trim() === "") {
      return Either.left(new ValidationError("Un upload fallido necesita un mensaje de error"));
    }
    this.update({ status: UploadStatus.FAILED, errorMessage });
    return Either.right(undefined);
  }

  private invalidTransition(next: UploadStatus): Either<ValidationError, void> {
    return Either.left(new ValidationError(`No se puede pasar de ${this.status.value} a ${next.value}`));
  }

  private update(changes: Partial<UploadProps>): void {
    this.props = { ...this.props, ...changes, updatedAt: new Date() };
  }
}
