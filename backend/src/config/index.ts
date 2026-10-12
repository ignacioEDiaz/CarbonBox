import convict from "convict";
import { IConvictProps } from "./IConvictProps";

// Convict no tiene "obligatorio": un formato propio rechaza el valor vacío
convict.addFormat({
  name: "required-string",
  validate: (value: unknown) => {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("es obligatorio y no puede estar vacío");
    }
  },
});

// Las variables de entorno llegan como texto: estos formatos las convierten a número y exigen un entero
function integerFormat(name: string, min: number, max: number, rule: string): convict.Format {
  return {
    name,
    coerce: (value: unknown) => Number(value),
    validate: (value: unknown) => {
      if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
        throw new Error(rule);
      }
    },
  };
}

// 43200 s (12 h) es el máximo que acepta SQS para el tiempo de ocultamiento
convict.addFormat(integerFormat("visibility-seconds", 0, 43200, "debe ser un entero entre 0 y 43200"));
convict.addFormat(integerFormat("positive-int", 1, Number.MAX_SAFE_INTEGER, "debe ser un entero mayor que 0"));

// HS256 con un secreto corto se puede adivinar por fuerza bruta: se exigen al menos 32 caracteres
convict.addFormat({
  name: "jwt-secret",
  validate: (value: unknown) => {
    if (typeof value !== "string" || value.length < 32) {
      throw new Error("es obligatorio y debe tener al menos 32 caracteres");
    }
  },
});

const schema: convict.Schema<IConvictProps> = {
  port: {
    doc: "Puerto HTTP del servicio",
    format: "port",
    default: 3000,
    env: "PORT",
  },
  database: {
    url: {
      doc: "URL de conexión a PostgreSQL",
      format: "required-string",
      default: "",
      env: "DATABASE_URL",
      sensitive: true, // incluye la contraseña: Convict no la muestra
    },
  },
  // Las credenciales de AWS no están acá: las lee el SDK de AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY
  aws: {
    region: {
      doc: "Región de AWS",
      format: "required-string",
      default: "us-east-1",
      env: "AWS_REGION",
    },
    endpoint: {
      doc: "Endpoint de S3 y SQS. Vacío para AWS real; http://localhost:4566 para LocalStack",
      format: String,
      default: "",
      env: "AWS_ENDPOINT_URL",
    },
  },
  storage: {
    bucket: {
      doc: "Bucket de S3 donde se guardan los archivos subidos",
      format: "required-string",
      default: "",
      env: "S3_BUCKET",
    },
  },
  queue: {
    url: {
      doc: "URL de la cola de SQS donde se publican los uploads a procesar",
      format: "required-string",
      default: "",
      env: "SQS_QUEUE_URL",
    },
    visibilityTimeoutSeconds: {
      doc: "Segundos que un mensaje recibido queda oculto para los demás consumidores",
      format: "visibility-seconds",
      default: 60,
      env: "SQS_VISIBILITY_TIMEOUT_SECONDS",
    },
  },
  upload: {
    maxFileSizeMb: {
      doc: "Tamaño máximo de un archivo subido, en MB",
      format: "positive-int",
      default: 10,
      env: "UPLOAD_MAX_FILE_SIZE_MB",
    },
  },
  jwt: {
    secret: {
      doc: "Secreto para firmar los tokens de sesión",
      format: "jwt-secret",
      default: "",
      env: "JWT_SECRET",
      sensitive: true,
    },
    expiresInSeconds: {
      doc: "Vencimiento del token de sesión, en segundos",
      format: "positive-int",
      default: 3600,
      env: "JWT_EXPIRES_IN_SECONDS",
    },
  },
};

// Recibe el entorno por parámetro para poder testearla sin tocar process.env
export function loadConfig(env: NodeJS.ProcessEnv = process.env): IConvictProps {
  const config = convict(schema, { env });
  config.validate({ allowed: "strict" });
  return config.getProperties();
}
