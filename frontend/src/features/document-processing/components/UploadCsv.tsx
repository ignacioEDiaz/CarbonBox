"use client";

// Solo diseño: no sabe de la API ni de la sesión. La lógica llega por props desde UploadForm.
// Imágenes: public/logo-carbonbox-blanco.png y public/bg-carbonbox.png
import { ChangeEvent, DragEvent, FormEvent } from "react";
import s from "./UploadCsv.module.css";

type UploadCsvProps = {
  fileName?: string;
  fileSize?: number; // bytes
  isDragging?: boolean;
  isUploading?: boolean;
  progress?: number; // 0 a 100, mientras sube
  error?: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function UploadCsv({
  fileName,
  fileSize = 0,
  isDragging = false,
  isUploading = false,
  progress = 0,
  error,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onSubmit,
}: UploadCsvProps) {
  const dropClass = [s.drop, isDragging && s.dropOver, fileName && s.dropReady].filter(Boolean).join(" ");
  return (
    <main className={s.main}>
      <div className={s.head}>
        <span className={s.badge}><span className={s.dot} />Carga masiva de datos</span>
        <h1 className={s.title}>Subir un <span>CSV</span></h1>
        <p className={s.sub}>
          CSV UTF-8 separado por comas, con el encabezado <code>category,amount,unit,date</code>. Hasta 10 MB.
        </p>
      </div>

      <div className={s.wrap}>
        {/* img y no Image: es decorativa y su tamaño lo maneja el CSS */}
        <img src="/logo-carbonbox-blanco.png" alt="" aria-hidden className={s.logoBg} />

        <form className={s.card} onSubmit={onSubmit}>
          <label className={dropClass} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
            <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
            <span className={s.fileIcon}>CSV</span>
            <span className={s.label}>{fileName || "Arrastrá un CSV acá o hacé clic para elegirlo"}</span>
            <span className={s.hint}>
              {fileName ? `${(fileSize / 1024).toFixed(1)} KB · listo para subir` : "Soltalo en cualquier parte de este recuadro"}
            </span>
          </label>
          {error && <p className={s.error}>{error}</p>}
          {isUploading && (
            <div className={s.progress}>
              <div className={s.progressBar} style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className={s.row}>
            <span className={s.hint}>Formato: .csv · Máx. 10 MB</span>
            <button type="submit" className={s.btn} disabled={!fileName || isUploading}>
              {isUploading ? `Subiendo… ${progress}%` : "Subir →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
