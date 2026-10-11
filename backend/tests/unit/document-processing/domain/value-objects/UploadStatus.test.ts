import {
  UploadStatus,
  UploadStatusValue,
} from "../../../../../src/document-processing/domain/value-objects/UploadStatus";

// Matriz completa de data-model.md: [desde, hacia, permitida]
const transitions: [UploadStatusValue, UploadStatusValue, boolean][] = [
  ["PENDING", "PENDING", false],
  ["PENDING", "PROCESSING", true],
  ["PENDING", "COMPLETED", false],
  ["PENDING", "FAILED", false],
  ["PROCESSING", "PENDING", false],
  ["PROCESSING", "PROCESSING", true], // reintento
  ["PROCESSING", "COMPLETED", true],
  ["PROCESSING", "FAILED", true],
  ["COMPLETED", "PENDING", false],
  ["COMPLETED", "PROCESSING", false],
  ["COMPLETED", "COMPLETED", false],
  ["COMPLETED", "FAILED", false],
  ["FAILED", "PENDING", false],
  ["FAILED", "PROCESSING", false],
  ["FAILED", "COMPLETED", false],
  ["FAILED", "FAILED", false],
];

describe("UploadStatus", () => {
  it.each(transitions)("%s -> %s permitida: %s", (from, to, allowed) => {
    expect(UploadStatus.from(from).canTransitionTo(UploadStatus.from(to))).toBe(allowed);
  });

  it("from devuelve un estado igual a la instancia estática", () => {
    expect(UploadStatus.from("COMPLETED").equals(UploadStatus.COMPLETED)).toBe(true);
    expect(UploadStatus.from("COMPLETED").equals(UploadStatus.FAILED)).toBe(false);
  });
});
