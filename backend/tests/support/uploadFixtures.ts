import { Upload } from "../../src/document-processing/domain/entities/Upload";
import { FileName } from "../../src/document-processing/domain/value-objects/FileName";

// Un upload nuevo (PENDING) que apunta a fileUrl, para los tests del procesamiento
export function pendingUpload(fileUrl = "memory/datos.csv"): Upload {
  const fileName = FileName.create("datos.csv");
  if (fileName.isLeft()) throw fileName.value;
  const upload = Upload.create({ fileName: fileName.value, fileUrl, userId: "user-123" });
  if (upload.isLeft()) throw upload.value;
  return upload.value;
}
