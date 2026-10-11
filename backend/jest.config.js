const tsJestProject = { preset: "ts-jest", testEnvironment: "node" };

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Sin base de datos: dominio, mappers, piezas compartidas y HTTP con fastify.inject
    { ...tsJestProject, displayName: "unit", roots: ["<rootDir>/tests/unit", "<rootDir>/tests/http"] },
    // Contra la base de tests (TEST_DATABASE_URL), migrada por globalSetup
    {
      ...tsJestProject,
      displayName: "integration",
      roots: ["<rootDir>/tests/integration"],
      setupFiles: ["dotenv/config"],
      globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
    },
  ],
};
