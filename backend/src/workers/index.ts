import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { AwilixContainer } from "awilix";
import { setTimeout as sleep } from "node:timers/promises";
import { loadConfig } from "../config";
import { PrismaClient } from "../generated/prisma/client";
import { buildContainer } from "../main/container";
import { FileProcessingWorker } from "./FileProcessingWorker";

// Si la cola está vacía, cuánto esperar antes de volver a preguntar (polling, como pide la consigna)
const POLL_INTERVAL_MS = 3000;

// Arranque del worker (npm run worker): un proceso aparte de la API, con el mismo contenedor.
// Como main/index.ts, es el único lugar con try/catch: el bucle no puede morir por una falla
// transitoria, así que la registra y sigue. El mensaje no se borró y SQS lo va a reentregar.
async function main(): Promise<void> {
  const container = buildContainer(loadConfig());
  const worker = container.resolve<FileProcessingWorker>("fileProcessingWorker");
  let running = true;
  // Ctrl+C: termina el mensaje que está procesando y sale del bucle
  process.on("SIGINT", () => (running = false));
  process.on("SIGTERM", () => (running = false));

  console.log(`Worker escuchando la cola (cada ${POLL_INTERVAL_MS / 1000} s si está vacía). Ctrl+C para salir.`);
  while (running) {
    try {
      const outcome = await worker.processNextMessage();
      if (outcome === "discarded") console.warn("Mensaje sin uploadId: se descartó");
      if (outcome === "processed") console.log("Mensaje procesado");
      if (outcome === "empty") await sleep(POLL_INTERVAL_MS);
    } catch (error) {
      console.error("Falla al procesar; el mensaje queda en la cola para reintentarse:", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
  await closeConnections(container);
}

async function closeConnections(container: AwilixContainer): Promise<void> {
  await container.resolve<PrismaClient>("prismaClient").$disconnect();
  container.resolve<SQSClient>("sqsClient").destroy();
  container.resolve<S3Client>("s3Client").destroy();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
