import { ActivityData } from "../../../../../../src/document-processing/domain/entities/ActivityData";
import { PrismaActivityDataMapper } from "../../../../../../src/document-processing/infrastructure/persistence/mappers/PrismaActivityDataMapper";
import { ActivityData as ActivityDataRecord } from "../../../../../../src/generated/prisma/client";

const record: ActivityDataRecord = {
  id: "7a1d2c3b-5555-4e6f-8a9b-666677778888",
  uploadId: "0b6f4c2e-1111-4a3b-9c5d-222233334444",
  category: "Electricity",
  amount: 150.5,
  unit: "kWh",
  date: new Date("2024-01-15T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
};

describe("PrismaActivityDataMapper", () => {
  it("toDomain convierte la fecha de la base en el día 'YYYY-MM-DD'", () => {
    const activity = PrismaActivityDataMapper.toDomain(record);

    expect(activity).toBeInstanceOf(ActivityData);
    expect(activity.date).toBe("2024-01-15");
  });

  it("toPersistence guarda el día como medianoche UTC", () => {
    const activity = PrismaActivityDataMapper.toDomain(record);

    expect(PrismaActivityDataMapper.toPersistence(activity).date).toEqual(new Date("2024-01-15T00:00:00.000Z"));
  });

  it("toPersistence(toDomain(registro)) devuelve el mismo registro", () => {
    expect(PrismaActivityDataMapper.toPersistence(PrismaActivityDataMapper.toDomain(record))).toEqual(record);
  });
});
