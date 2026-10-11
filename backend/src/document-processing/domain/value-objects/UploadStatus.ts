import { ValueObject } from "../../../shared/domain/ValueObject";

export type UploadStatusValue = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

// Desde cada estado, a cuáles se puede pasar. COMPLETED y FAILED son finales.
const ALLOWED_TRANSITIONS: Record<UploadStatusValue, UploadStatusValue[]> = {
  PENDING: ["PROCESSING", "FAILED"], // FAILED: no se pudo encolar (spec 003)
  PROCESSING: ["PROCESSING", "COMPLETED", "FAILED"], // PROCESSING -> PROCESSING: reintento
  COMPLETED: [],
  FAILED: [],
};

export class UploadStatus extends ValueObject<UploadStatusValue> {
  static readonly PENDING = new UploadStatus("PENDING");
  static readonly PROCESSING = new UploadStatus("PROCESSING");
  static readonly COMPLETED = new UploadStatus("COMPLETED");
  static readonly FAILED = new UploadStatus("FAILED");

  private constructor(value: UploadStatusValue) {
    super(value);
  }

  // Para reconstruir el estado desde la base (el mapper)
  static from(value: UploadStatusValue): UploadStatus {
    return new UploadStatus(value);
  }

  canTransitionTo(next: UploadStatus): boolean {
    return ALLOWED_TRANSITIONS[this.value].includes(next.value);
  }
}
