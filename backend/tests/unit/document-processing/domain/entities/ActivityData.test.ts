import { ActivityData } from "../../../../../src/document-processing/domain/entities/ActivityData";
import { ValidationError } from "../../../../../src/shared/domain/errors";

const valid = {
  uploadId: "0b6f4c2e-1111-4a3b-9c5d-222233334444",
  category: "Electricity",
  amount: 150.5,
  unit: "kWh",
  date: "2024-01-15",
};

describe("ActivityData.create", () => {
  it("crea un dato de actividad válido con id propio", () => {
    const result = ActivityData.create(valid);

    expect(result.isRight()).toBe(true);
    if (result.isLeft()) return;
    const activity = result.value;
    expect(activity.id).not.toBe("");
    expect(activity.uploadId).toBe(valid.uploadId);
    expect([activity.category, activity.amount, activity.unit, activity.date]).toEqual([
      "Electricity",
      150.5,
      "kWh",
      "2024-01-15",
    ]);
    expect(activity.createdAt).toBeInstanceOf(Date);
  });

  it("recorta categoría y unidad", () => {
    const result = ActivityData.create({ ...valid, category: "  Water ", unit: " m3 " });

    expect(result.isRight() && [result.value.category, result.value.unit]).toEqual(["Water", "m3"]);
  });

  it("acepta el 29 de febrero de un año bisiesto", () => {
    expect(ActivityData.create({ ...valid, date: "2024-02-29" }).isRight()).toBe(true);
  });

  it.each([
    { label: "categoría vacía", changes: { category: "" } },
    { label: "categoría con solo espacios", changes: { category: "   " } },
    { label: "unidad vacía", changes: { unit: "" } },
    { label: "cantidad 0", changes: { amount: 0 } },
    { label: "cantidad negativa", changes: { amount: -3 } },
    { label: "cantidad NaN", changes: { amount: Number.NaN } },
    { label: "cantidad infinita", changes: { amount: Number.POSITIVE_INFINITY } },
    { label: "fecha inexistente 2024-02-31", changes: { date: "2024-02-31" } },
    { label: "29 de febrero de un año no bisiesto", changes: { date: "2023-02-29" } },
    { label: "mes 13", changes: { date: "2024-13-01" } },
    { label: "formato DD/MM/YYYY", changes: { date: "15/01/2024" } },
    { label: "fecha vacía", changes: { date: "" } },
  ])("rechaza $label", ({ changes }) => {
    const result = ActivityData.create({ ...valid, ...changes });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ValidationError);
  });
});
