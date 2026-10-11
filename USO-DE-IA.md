# Uso de Inteligencia Artificial en esta Prueba

## Herramientas Utilizadas

- [x] Claude Code (extensión de VS Code, modelo Claude Opus 5.5)
- [ ] GitHub Copilot
- [ ] ChatGPT
- [ ] Cursor AI
- [x] Otra: GitHub Spec Kit (`specify` CLI 1.0.12), para trabajar con Spec-Driven Development

## Cómo trabajé con la IA

Usé Spec-Driven Development con Spec Kit. Antes de escribir código, la IA y yo acordamos una
**constitución** (las reglas que todo el proyecto tiene que cumplir) y después cada parte del
sistema pasa por cuatro etapas: `specify` (qué y por qué), `plan` (cómo y con qué tecnología),
`tasks` (pasos concretos) e `implement`.

La IA propone y yo reviso, corrijo y decido. Cada etapa queda registrada en la bitácora de
abajo.

## Bitácora por etapa

### 0. Inicialización del proyecto

- **Qué hizo la IA:** inicializó el repositorio git, corrió
  `specify init --here --integration claude --script ps --extension git` y agregó un
  `.gitignore` para el monorepo.
- **Qué decidí yo:** usar Spec Kit. La IA eligió scripts de PowerShell porque trabajo en
  Windows, y la extensión de git para que cada spec tenga su rama numerada.
- **Qué verifiqué:** que `specify init --force` no pisara mi `CLAUDE.md` (la IA lo respaldó y
  lo comparó antes y después) y que los commits automáticos de Spec Kit quedaran apagados,
  porque los commits los quiero controlar yo.

### 1. Constitución (`.specify/memory/constitution.md`)

- **Qué aporté yo:** los principios: arquitectura DDD + Clean Architecture + CQRS, respetar el
  árbol de carpetas de la consigna, empezar por Docker con PostgreSQL, TDD y código legible
  sin "choclos".
- **Qué hizo la IA:** redactó la constitución con esos principios y sumó las reglas de
  arquitectura que ya tenía en `CLAUDE.md`.
- **Qué discutimos y ajustamos:**
  - Yo había pedido "minimizar las líneas de código". La IA propuso escribirlo como "código
    legible y mínimo": lo mínimo es la cantidad de código y de abstracciones (YAGNI), no la
    longitud de cada línea, porque un one-liner críptico es más corto pero más difícil de
    entender. Estuve de acuerdo.
  - TDD obligatorio en `domain`, `application` y el parser CSV, con dobles de las interfaces.
    Los tests de integración (Prisma contra la base, endpoints) quedaron como recomendados.
    Si no se escriben, se documenta la verificación manual.
  - Se aclaró que "de punta a punta antes que perfecto" decide el alcance, no la calidad: no
    sirve de excusa para saltear tests ni para meter lógica en un controller.

### 2. Spec 001: base del proyecto (spec y plan)

- **Qué hizo la IA:** redactó el spec (qué y por qué, sin tecnología) y el plan (stack,
  decisiones con alternativas, contrato de `/health`, guía de validación). Antes de escribir
  el plan armó un proyecto descartable para comprobar que las versiones elegidas funcionan
  juntas, incluido un `SELECT 1` contra Postgres en Docker.
- **Qué detectó al verificar (y no hubiera visto leyendo documentación):**
  - El tag `latest` de Prisma en npm apuntaba a una release candidate (8.0.0-rc), así que se
    fijó la 7.10.0 estable.
  - En modo `strict`, Awilix rechaza que un singleton dependa de algo registrado con una vida
    más corta: los valores fijos van con `asValue`.
- **Qué cambié yo:** la IA propuso Vitest como runner de tests y le pedí usar **Jest** para
  hacer TDD. Al verificarlo aparecieron dos problemas que obligaron a ajustar el plan:
  - `ts-jest` no soporta TypeScript 7, así que se bajó a TypeScript 6.0.3.
  - Con `module: nodenext`, `ts-jest` pide `isolatedModules`, y en ese modo deja de chequear
    tipos: un test con un error de tipos pasaba en verde. Se pasó a `module: commonjs` +
    `moduleResolution: bundler`, y ahora un error de tipos hace fallar el test.

### 3. Spec 001: implementación

- **Qué hizo la IA:** escribió el código y los tests siguiendo `tasks.md` con TDD: primero el
  test, verlo fallar y después la implementación. Hizo un commit atómico por cada par test +
  código y verificó a mano contra Postgres real lo que no cubren los tests (base caída, base
  colgada con timeout, persistencia, configuración inválida y puerto ocupado).
- **Qué decidí yo:**
  - Frenar en el checkpoint de la Fase 2 para revisar el código antes de seguir.
  - Cuando quise pasar al spec 002, la IA me recordó que el 001 estaba a la mitad y que mi
    constitución dice "un spec por vez". Elegí terminar el 001 primero.
- **Problemas que aparecieron y cómo se resolvieron:**
  - Los tests HTTP con `fastify.inject` fallaban: Fastify depende de `cookie@2`, un paquete
    ESM puro, y Jest solo puede cargarlo si Node corre con `--experimental-vm-modules`. La IA
    leyó el código de Jest para entender la condición exacta y cambió el script de tests
    (documentado en research.md §3).
  - Un test del controller llamaba a `handle(request)` cuando la firma no recibe parámetros.
    El chequeo de tipos de `ts-jest` lo detectó y se simplificó el test.
- **Preguntas que hice para entender el código:**
  - De dónde sale `Either`.
  - Qué se gana sin `try/catch` en los controllers.
  - En qué momento se usan los archivos de `application` y de `infrastructure`.

### 4. Spec 002: dominio y persistencia

- **Qué hizo la IA:** redactó el spec, el plan y las tareas. Implementó con TDD los value
  objects (`FileName`, `UploadStatus`), las entidades (`Upload`, `ActivityData`), los mappers
  y los repositorios de Prisma, con tests de integración contra una base de tests separada.
- **Lo que discutimos antes de decidir** (preguntas mías que cambiaron o confirmaron el
  diseño):
  - **¿Qué pasa si el worker se cae a mitad y el mensaje vuelve a la cola?** Elegí permitir
    PROCESSING → PROCESSING como reintento y que guardar las filas las reemplace, para que el
    procesamiento sea **idempotente por `uploadId`**. Descartamos marcarlo FAILED (un corte
    transitorio fallaría un archivo válido) y permitir FAILED → PROCESSING (FAILED dejaría
    de ser final).
  - **¿Al worker no le deberían llegar los datos validados?** La API valida lo instantáneo
    (que haya archivo y que sea `.csv`) y el worker valida el contenido, porque leer el
    archivo es lento y es justo lo que se hace en segundo plano. Lo dice la propia consigna.
  - **¿Cómo se informa un fallo?** No se le "devuelve" nada al usuario: se guarda FAILED con
    `errorMessage` y el frontend lo ve por polling. El *visibility timeout* de la cola es la
    red de seguridad cuando el worker muere sin poder avisar.
  - **¿Sirve una idempotency key?** En el worker, el `uploadId` ya cumple ese rol. Un
    `Idempotency-Key` en `POST /uploads` quedó anotado como mejora opcional para el 003.
- **Lo que encontró la prueba previa al plan:**
  - Prisma 7 bloquea `migrate reset` cuando lo ejecuta un agente de IA, porque borra la base,
    y pide consentimiento explícito. La IA no lo salteó: diseñó los tests con
    `migrate deploy` (que crea la base si falta) y con ids aleatorios por test.
  - En Prisma 7, `migrate dev` ya no regenera el cliente: el script corre `generate` antes.
  - La fecha `DATE` vuelve como el mismo día con el proceso en UTC-3, UTC+9 y UTC+14, siempre
    que se convierta en UTC (`new Date("YYYY-MM-DD")` y `toISOString().slice(0, 10)`).
- **Ajustes durante la implementación:**
  - Jest valida la configuración de todos los proyectos, así que el `globalSetup` de
    integración tuvo que existir desde el primer paso.
  - La IA sacó un ternario anidado que ella misma había escrito en un test, porque iba contra
    la regla de legibilidad de la constitución.

## ¿Qué Generé con IA?

### Backend

- [x] Configuración de Spec Kit y constitución del proyecto
- [x] Specs, planes y tareas (revisados y ajustados por mí)
- [x] `docker-compose.yml` con PostgreSQL
- [x] Piezas compartidas: `Either`, contratos de handlers, `BaseController`, `adaptRoute` y
  manejador central de errores
- [x] Configuración con Convict, contenedor de Awilix y arranque
- [x] Health check (`GET /health`) y todos los tests del spec 001
- [x] Schema de Prisma, migración inicial, value objects, entidades, mappers y repositorios
  (spec 002), con sus tests unitarios y de integración

### Frontend

- [ ] _(se completa en el spec 007)_

## ¿Qué Modifiqué o Corregí?

1. **Principio de código mínimo:** reformulado de "menos líneas" a "legible y mínimo" (ver
   bitácora, etapa 1).
2. **Runner de tests:** la IA propuso Vitest y lo cambié por Jest. Eso obligó a bajar a
   TypeScript 6 y a ajustar el `tsconfig` para que los tests sigan chequeando tipos (ver
   bitácora, etapa 2).

## ¿Qué Aprendí?

1. **Spec-Driven Development:**
   - _(completar con tus palabras: qué es la constitución, por qué el spec no habla de
     tecnología, para qué sirve separar spec, plan y tasks)_
2. **Either y manejo de errores:**
   - _(completar con tus palabras: por qué los errores esperables viajan como valor y por
     qué los controllers no tienen try/catch)_
3. **Capas e inversión de dependencias:**
   - _(completar con tus palabras: por qué el handler depende de `IDatabaseHealthChecker` y
     no de Prisma, y qué hace el contenedor de Awilix al arrancar)_
4. **Idempotencia:**
   - _(completar con tus palabras: qué significa que procesar dos veces dé el mismo
     resultado, por qué hace falta con una cola que entrega "al menos una vez" y cómo lo
     resuelven PROCESSING → PROCESSING y el reemplazo de filas)_
5. **DDD (aggregate root y value objects):**
   - _(completar con tus palabras: por qué todo cambio de estado pasa por `Upload`, qué
     diferencia hay entre un value object y una entidad, y para qué sirven `create` y
     `restore`)_

## Limitaciones Encontradas con IA

- **Las versiones "latest" no siempre son estables ni compatibles.** La primera propuesta
  (TypeScript 7 y Vitest) cambió al verificarla: Prisma tenía una RC como `latest` y
  `ts-jest` no soporta TypeScript 7. Sirvió que la IA probara las combinaciones en un
  proyecto descartable antes de escribir el plan.
- **Problemas que solo aparecen al ejecutar.** La incompatibilidad de Jest con un paquete ESM
  de Fastify no estaba prevista en el plan y apareció recién con el primer test HTTP.

## Tiempo Invertido

- Setup y constitución: _(completar)_
- Backend: _(completar)_
- Frontend: _(completar)_
- Debugging y ajustes: _(completar)_
- **Total:** _(completar)_
