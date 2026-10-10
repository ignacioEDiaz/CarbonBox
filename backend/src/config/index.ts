import convict from "convict";
import { IConvictProps } from "./IConvictProps";

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
      format: String,
      default: "",
      env: "DATABASE_URL",
      sensitive: true, // incluye la contraseña: Convict no la muestra
    },
  },
};

// Recibe el entorno por parámetro para poder testearla sin tocar process.env
export function loadConfig(env: NodeJS.ProcessEnv = process.env): IConvictProps {
  const config = convict(schema, { env });
  config.validate({ allowed: "strict" });
  return config.getProperties();
}
