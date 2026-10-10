# Constitución de CarbonBox

## Core Principles

### I. Arquitectura DDD + Clean Architecture + CQRS (NO NEGOCIABLE)

- El backend se organiza en el bounded context `document-processing`, con `Upload` como
  aggregate root, `ActivityData` como entidad y `UploadStatus` y `FileName` como value objects.
- Hay cuatro capas: `domain`, `application`, `infrastructure` y `presentation`. Las dependencias
  apuntan hacia adentro. `domain` NO DEBE importar Prisma, Fastify, Awilix ni ninguna librería
  de infraestructura.
- Las interfaces de repositorio (`IUploadRepository`, `IActivityDataRepository`) se declaran en
  `domain` y se implementan en `infrastructure`.
- Las reglas de negocio viven en las entidades y los value objects. Por ejemplo, las
  transiciones `PENDING → PROCESSING → COMPLETED | FAILED` las valida `Upload`, y una
  transición inválida se rechaza.
- CQRS: toda escritura es un command con su handler; toda lectura es una query con su handler.
  Un handler NO DEBE hacer las dos cosas.
- Todo handler devuelve `Promise<Either<Error, Result>>`. Los errores esperables se devuelven
  como `left`, no se lanzan.
- Los controllers y el worker son puertas de entrada: traducen la petición HTTP o el mensaje de
  la cola a un command o una query, llaman al handler y traducen el resultado. NO DEBEN contener
  lógica de negocio, consultas de Prisma ni `try/catch`. Los errores los resuelve un manejador
  central de Fastify.
- Las dependencias se inyectan por constructor y se registran en Awilix. Los handlers dependen
  de interfaces, nunca de clases concretas.

**Por qué:** es lo que pide la consigna y lo que más puntaje tiene (30 puntos). Además, la
lógica de negocio en controllers es un red flag explícito. Separar capas permite testear el
dominio y los handlers sin base de datos ni HTTP.

### II. Estructura de carpetas de la consigna

- Backend y frontend respetan el árbol de la sección "Estructura del Proyecto" de
  `PRUEBA-TECNICA-FULLSTACK.md`.
- Agregados permitidos (la consigna los pide pero el árbol no los lista):
  `GetUploadResultsQuery`, `GetUploadResultsQueryHandler`, `GetUploadResultsController` e
  `IFileStorage` en `backend/src/shared/infrastructure/storage/`.
- `docker-compose.yml` va en la raíz del repositorio.
- Cualquier otra desviación del árbol DEBE justificarse en el `plan.md` del spec que la
  introduce y documentarse en el README.

**Por qué:** el evaluador va a buscar los archivos donde la consigna dice que están. Una
estructura predecible facilita la revisión y la defensa del código.

### III. TDD (NO NEGOCIABLE)

- En `domain`, `application` y el parser CSV, el test se escribe primero y se ve fallar antes
  de escribir la implementación (rojo → verde → refactor).
- Los tests de handlers usan dobles de las interfaces (repositorios, storage, cola), no Prisma
  ni la base real.
- Todo comportamiento nuevo o bug corregido entra con un test que lo cubra.
- Los repositorios Prisma y los endpoints DEBERÍAN tener tests de integración (contra el
  Postgres de Docker y con `fastify.inject`) cuando el costo sea razonable. Si no se escriben,
  el spec DEBE dejar documentada la verificación manual.
- Un spec NO se da por terminado con tests en rojo o salteados.

**Por qué:** los tests demuestran que el código hace lo que el spec dice, permiten refactorizar
sin miedo y son un bonus explícito de la evaluación (tests del parser).

### IV. Código legible y mínimo

- Se escribe la menor cantidad de código que cumple el requisito. Nada de abstracciones,
  parámetros u opciones "por si acaso" (YAGNI).
- Legibilidad por encima de brevedad: menos líneas NO justifica one-liners crípticos,
  ternarios anidados ni trucos del lenguaje. Si hay que elegir, gana el código más fácil de
  leer.
- Cada función hace una sola cosa. Si no se entiende de un vistazo (como guía, más de ~25
  líneas), se divide.
- Los nombres describen la intención (`markAsProcessing`, no `update2`). Los comentarios
  explican el porqué, no el qué.
- TypeScript en modo `strict` y sin `any`. Cuando un tipo es desconocido se usa `unknown` y se
  valida.
- No se deja código muerto ni comentado.
- Una dependencia nueva se agrega solo si reemplaza código propio más largo o más frágil, y se
  justifica en el plan.
- Todo el código DEBE poder explicarlo su autor línea por línea en una entrevista.

**Por qué:** "no armar un choclo". El código se lee muchas más veces de las que se escribe, y
el autor lo tiene que defender frente a otra persona.

### V. De punta a punta antes que perfecto

- Se construye en specs verticales, y cada uno deja algo funcionando y verificable.
- Ante una decisión de alcance, primero lo CRÍTICO de la consigna (subir, listar, procesar,
  mostrar resultados), después lo IMPORTANTE y por último lo NICE TO HAVE y los bonus (DLQ,
  reintentos con backoff, UI pulida).
- Este principio decide el alcance, no la calidad: NO autoriza a saltear los principios I y III.
- Lo que no se llegue a hacer se documenta en "Limitaciones conocidas" del README, con la razón
  y qué se haría con más tiempo.

**Por qué:** que no funcione de punta a punta es un red flag de la evaluación. Un sistema
simple que funciona vale más que una arquitectura perfecta a medio hacer.

## Restricciones técnicas y stack

- **Backend:** Node.js, TypeScript, Fastify, Prisma, PostgreSQL y Awilix.
- **Frontend:** Next.js 14+ con App Router, TypeScript, React Query, Axios y Tailwind.
- **Infraestructura local:** Docker Compose levanta solo PostgreSQL (y LocalStack si se usa
  para S3/SQS). La API, el worker y el frontend corren con `npm` en la máquina, fuera de Docker.
- **Procesos:** la API y el worker son procesos separados (`npm run dev` y `npm run worker`) y
  no comparten memoria. La cola DEBE funcionar entre procesos.
- **Entorno de desarrollo:** Windows con Docker Desktop. Los scripts y comandos documentados
  DEBEN funcionar en ese entorno.
- **Configuración:** por variables de entorno. Se versiona `.env.example`, nunca `.env`.
- **Autenticación:** no hay. Se asume `userId = "user-123"`.
- Las decisiones de diseño ya tomadas en `CLAUDE.md` (orden del flujo, el mensaje lleva solo
  el `uploadId`, la API no parsea, se conserva el archivo original) son vinculantes para los
  planes.

## Flujo de trabajo

- Spec-Driven Development con Spec Kit: constitución → `specify` → `plan` → `tasks` →
  `implement`. El spec describe qué y por qué, sin tecnología; el stack va en el plan.
- Un spec por vez. No se arranca el siguiente hasta que el actual funcione, tenga los tests en
  verde y su criterio de "listo" esté verificado.
- El primer spec (`001-base-del-proyecto`) arranca por Docker Compose con PostgreSQL y la
  conexión a la base, antes que cualquier lógica de negocio.
- Cada spec trabaja en su rama `NNN-nombre`, creada por Spec Kit.
- Commits atómicos con mensajes descriptivos: un cambio lógico por commit.
- `USO-DE-IA.md` (entregable obligatorio) se actualiza al cerrar cada spec: qué se generó con
  IA, qué se corrigió y qué se aprendió.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica del proyecto. Los `plan.md` DEBEN
  pasar el "Constitution Check" del template antes de implementar.
- Toda complejidad extra o excepción a un principio se justifica en la tabla "Complexity
  Tracking" del plan correspondiente.
- Enmiendas: se proponen por escrito, se explica el motivo y se registran en el Sync Impact
  Report con su versión.
- Versionado semántico: MAJOR si se elimina o redefine un principio; MINOR si se agrega un
  principio o sección, o se amplía una guía de forma material; PATCH si son aclaraciones o
  redacción.
- La guía operativa para el agente está en `CLAUDE.md`. Si contradice esta constitución, se
  corrige `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
