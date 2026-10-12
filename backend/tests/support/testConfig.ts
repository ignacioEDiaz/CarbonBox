import { IConvictProps } from "../../src/config/IConvictProps";

// Cada sección se puede pisar en parte: testConfig({ upload: { maxFileSizeMb: 1 } })
export type TestConfigOverrides = {
  [K in keyof IConvictProps]?: IConvictProps[K] extends object ? Partial<IConvictProps[K]> : IConvictProps[K];
};

// Configuración válida y completa para los tests que no necesitan servicios reales.
// La base apunta a un puerto cerrado: Prisma recién se conecta en la primera consulta.
const BASE: IConvictProps = {
  port: 0,
  database: { url: "postgresql://u:p@localhost:1/db" },
  aws: { region: "us-east-1", endpoint: "http://localhost:4566" },
  storage: { bucket: "test-bucket" },
  queue: { url: "http://localhost:4566/000000000000/test", visibilityTimeoutSeconds: 60 },
  upload: { maxFileSizeMb: 10 },
  jwt: { secret: "secreto-de-los-tests-de-al-menos-32-caracteres", expiresIn: "1h" },
};

export function testConfig(overrides: TestConfigOverrides = {}): IConvictProps {
  return {
    port: overrides.port ?? BASE.port,
    database: { ...BASE.database, ...overrides.database },
    aws: { ...BASE.aws, ...overrides.aws },
    storage: { ...BASE.storage, ...overrides.storage },
    queue: { ...BASE.queue, ...overrides.queue },
    upload: { ...BASE.upload, ...overrides.upload },
    jwt: { ...BASE.jwt, ...overrides.jwt },
  };
}
