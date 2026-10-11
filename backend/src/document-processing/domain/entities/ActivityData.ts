import { randomUUID } from "node:crypto";
import { Either } from "../../../shared/domain/Either";
import { ValidationError } from "../../../shared/domain/errors";

export type ActivityDataProps = {
  id: string;
  uploadId: string;
  category: string;
  amount: number;
  unit: string;
  date: string; // "YYYY-MM-DD": un día calendario, sin hora ni zona horaria
  createdAt: Date;
};

type NewActivityData = Omit<ActivityDataProps, "id" | "createdAt">;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// new Date("2024-02-31") no falla: se corre al 2 de marzo. Por eso se reconstruye
// la fecha y se compara que año, mes y día sigan siendo los mismos.
function isValidCalendarDate(date: string): boolean {
  if (!ISO_DATE.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function findInvalidField({ category, amount, unit, date }: NewActivityData): string | null {
  if (category === "") return "La categoría no puede estar vacía";
  if (unit === "") return "La unidad no puede estar vacía";
  if (!Number.isFinite(amount) || amount <= 0) return "La cantidad debe ser un número mayor que cero";
  if (!isValidCalendarDate(date)) return `La fecha "${date}" no es válida (formato YYYY-MM-DD)`;
  return null;
}

// Una fila válida de un CSV procesado. Es inmutable: no tiene métodos que la cambien.
export class ActivityData {
  private constructor(private readonly props: ActivityDataProps) {}

  static create(data: NewActivityData): Either<ValidationError, ActivityData> {
    const trimmed = { ...data, category: data.category.trim(), unit: data.unit.trim() };
    const invalidField = findInvalidField(trimmed);
    if (invalidField !== null) {
      return Either.left(new ValidationError(invalidField));
    }
    return Either.right(new ActivityData({ ...trimmed, id: randomUUID(), createdAt: new Date() }));
  }

  static restore(props: ActivityDataProps): ActivityData {
    return new ActivityData(props);
  }

  get id(): string {
    return this.props.id;
  }

  get uploadId(): string {
    return this.props.uploadId;
  }

  get category(): string {
    return this.props.category;
  }

  get amount(): number {
    return this.props.amount;
  }

  get unit(): string {
    return this.props.unit;
  }

  get date(): string {
    return this.props.date;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
