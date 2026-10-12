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

### 5. Spec 003: subir archivo

- **Qué hizo la IA:** redactó el spec, el plan y las tareas, y lo implementó con TDD:
  contratos `IFileStorage`, `IMessagePublisher` e `IMessageConsumer`; `S3FileStorage`,
  `SqsMessagePublisher` y `SqsMessageConsumer` con el SDK de AWS; el value object `CsvHeader`;
  `CreateUploadCommandHandler` y `GetUploadByIdQueryHandler` con sus controllers;
  `POST /api/v1/uploads` y `GET /api/v1/uploads/:id`; y la clave de idempotencia.
- **Decisiones mías:**
  - **Interfaces para pasar a AWS sin tocar código.** Le pedí que todo quedara detrás de
    contratos para trabajar en local y conectar mi cuenta de AWS después.
  - **LocalStack y no una tabla de Postgres como cola.** Con LocalStack el código es el mismo
    que con AWS real y solo cambia el endpoint; con una tabla habría que programar a mano el
    ocultamiento y el contador de entregas, y después tirarlo.
  - **Si no se puede encolar, el upload queda FAILED** (opción B de tres). Para eso agregamos
    la transición PENDING → FAILED: ningún upload queda en PENDING para siempre.
  - **La API revisa el encabezado del CSV** (solo la primera línea). Fue un punto medio que
    pedí: avisa al instante si subí el archivo equivocado, sin parsear las filas.
  - **El patrón State para los estados:** lo evaluamos y no lo usé. Con 4 estados y un
    comportamiento que solo cambia en qué transiciones se permiten, la tabla es más simple.
- **Qué se corrigió o descubrió en el camino:**
  - **Otra sesión de Claude Code abierta en paralelo** reescribió el spec y generó un plan con
    disco y Postgres que yo no había elegido. Lo detecté al ver los archivos cambiados, lo
    descarté y regeneré el plan con mis decisiones. Aprendí a no tener dos agentes sobre los
    mismos archivos.
  - **LocalStack exige token desde marzo de 2026.** Antes de escribir el plan la IA lo
    investigó y lo probó en un contenedor descartable: la 4.14.0 es la última que arranca sin
    cuenta. Quedó fijada en esa versión, para que quien evalúe lo levante sin registrarse.
  - **La prueba mostró que SQS estándar solo garantiza orden aproximado y entrega "al menos una
    vez"**, así que se ajustó el spec: lo que protege de duplicados es la idempotencia del 002.
    También mostró que LocalStack revisa el vencimiento cada ~1 s, y los tests preguntan en un
    bucle en vez de dormir un tiempo fijo.
  - **Un commit se hizo con dos tests fallando:** la IA verificaba con un `grep` del resumen
    y la cadena de comandos siguió igual. Eran tests de la cola que hacían polling 5 s con el
    timeout por defecto de Jest (5 s). Se les dio un timeout propio y desde ahí se verifica
    con el código de salida de Jest.
  - **La clave de idempotencia se validaba tarde:** al principio vivía en `Upload.create`, que
    corre después de subir el archivo, así que una clave inválida dejaba un archivo huérfano.
    Se pasó a un value object (`IdempotencyKey`) que el handler valida al principio.
  - **`prisma migrate dev` no corre desde un agente** (terminal no interactiva). La migración
    se generó con `prisma migrate diff` y se aplicó con `migrate deploy`.
  - **Con `adapter-pg`, Prisma informa el índice violado en otro lugar** (`meta.driverAdapterError`
    y no `meta.target`). La IA lo comprobó con un script antes de escribir la traducción del
    error.
- **Preguntas que hice para entender el código:**
  - Por qué `Upload` es una entidad (identidad propia, cambia en el tiempo y protege sus
    reglas; la fila de Prisma no es la entidad).
  - Si convenía el patrón State para los estados.
  - Cómo se testeó el spec 002.
- **Diagramas para estudiar:** le pedí a la IA diagramas en Miro de lo que estaba hecho. El
  primero del recorrido de la subida tenía una explicación muy escueta y no usaba el estilo de
  los anteriores; le pedí rehacerlo como si se lo explicara a alguien que no conoce el
  proyecto: mapa con colores por capa, glosario y cada paso con qué pasa, qué datos viajan
  (con un ejemplo de punta a punta) y por qué se hizo así.

### 6. Spec 004: parseo y validación del CSV (spec y plan)

- **Qué hizo la IA:** propuso el alcance (el parser solo lee y clasifica; cambiar estados y
  guardar es del 005), redactó el spec y el plan, y antes de escribir el plan probó la
  biblioteca en una carpeta aparte.
- **Decisiones mías:**
  - **Usar una biblioteca (`csv-parse`) y no `split(",")` a mano.** Con `split`, una fila
    correcta con una coma entre comillas (`"Oficina, piso 2"`) se marcaría como inválida.
  - **Cantidad en formato estricto** (`1200` o `12.5`). Descarté aceptar coma decimal porque
    `1,200` es ambiguo y en un CSV la coma ya separa columnas.
- **Qué descubrimos al probar la biblioteca antes de planificar** (no lo hubiera adivinado):
  - **Con saltos de línea de Windows (`\r\n`), los números de línea se corrían.** Se resolvió
    pasando `\r\n` a `\n` antes de parsear. (La causa exacta se corrigió en la implementación:
    ver abajo.)
  - **Los tipos de `csv-parse` mienten con la opción `raw`:** el tipo dice lista de textos pero
    llega un objeto. Por eso la línea de cada fila se calcula con el callback `on_record`, que
    sí está bien tipado, y no hace falta ningún `any` ni `as`.
  - **Con una comilla sin cerrar, la biblioteca informa la última línea del archivo**, no la de
    la comilla. El mensaje dice "después de la línea N" (la última fila que se leyó bien), y
    ajusté el spec para que diga eso.
  - **`Number()` no alcanza para validar la cantidad:** `Number("")` es 0 y `Number("1e3")` es
    1000. Se valida primero con una expresión regular.
  - 10 MB (unas 235 mil filas) se parsean en menos de 1 segundo: no hacen falta streams.
- **Lo que quedó para el 005:** qué estado toma un upload si todas las filas son inválidas y
  dónde se guardan los errores por fila.

### 7. Spec 004: implementación

- **Qué hizo la IA:** implementó `CsvParserService` y su interfaz con TDD, en tres pasos (filas
  válidas e inválidas, errores de archivo, formato estándar): 48 tests del parser y el test de
  10 MB. Actualizó README, CLAUDE.md y el quickstart.
- **Qué se corrigió o descubrió en el camino:**
  - **Un test desmintió la investigación.** En el plan se había anotado que con `\r\n` las
    líneas se corrían por las líneas en blanco. El test de `\r\n` con líneas en blanco pasó sin
    arreglar nada: la causa real era un `\r\n` **dentro de un valor entre comillas** (una fila
    de varias líneas), que la biblioteca cuenta doble. En la prueba original estaban las dos
    cosas juntas. Se corrigió el research; la solución (normalizar a `\n`) era la misma.
  - **`instanceof TypeError` fallaba solo en los tests.** Jest corre el código en un contexto
    aislado y el `TypeError` que lanza `TextDecoder` no es el mismo objeto que el del test. Se
    reconoce el error por su código de Node (`ERR_ENCODING_INVALID_ENCODED_DATA`), el mismo
    patrón que ya usa el manejador central de errores.
  - **El script de prueba manual de la guía no corría en Windows y no daba error:** `npx` es un
    `.cmd` y `cmd.exe` corta el argumento en el primer salto de línea. Se dejó en una sola línea
    y se verificó la salida.
  - **Un script de Python que usó la IA para editar dos archivos les cambió los fines de línea**
    (en Windows escribe `\r\n`). Se notó porque el diff mostraba 90 líneas cambiadas por agregar
    3, y se corrigió antes del commit.
  - **Errores de la IA al escribir los tests**, que el propio test mostró: armar el CSV de 10 MB
    con `csv(...lines)` pasaba 260 mil argumentos y desbordaba la pila; y correr `npx jest`
    directo hace fallar los tests HTTP porque no agrega `--experimental-vm-modules` (hay que
    usar `npm run test:unit`).

### 8. Spec 005: worker y procesamiento

- **Decisiones mías:** si ninguna fila es válida, el upload termina FAILED (COMPLETED con 0
  filas engañaría); los errores por fila se guardan en una tabla `RowError` con su propio
  handler y endpoint (`GET /api/v1/uploads/:id/errors`); el worker tenía que respetar el de la
  consigna (script aparte con polling). Antes de implementar le pedí a la IA el diseño paso a
  paso en Miro (frame 7) para entenderlo y poder explicarlo.
- **Qué hizo la IA:** spec, plan y tareas, y la implementación con TDD: `FileProcessingWorker`,
  `ProcessFileCommandHandler`, `FileProcessingService`, la tabla y el repositorio de `RowError`,
  la query de errores, `npm run worker` y la DLQ. 281 tests en verde, y una prueba a mano con
  la API y el worker corriendo: un CSV de 3 filas llegó a COMPLETED en ~1 s.
- **Qué se corrigió en el camino:** `RowError` vivía en la capa de aplicación (el parser) y el
  repositorio, que está en el dominio, no podía importarlo: se movió al dominio. El bucle del
  worker necesita `try/catch` y la constitución no lo permite en el worker: el bucle quedó en
  `workers/index.ts` (arranque), y el worker solo procesa un mensaje y deja salir los errores.

### 9. Spec 006: consultas

- **Qué hizo la IA:** spec, plan y tareas, y con TDD la lista paginada
  (`ListUploadsQueryHandler`) y los resultados (`GetUploadResultsQueryHandler`), con sus
  controllers, rutas y tests unitarios, HTTP y de integración. 302 tests en verde y prueba a mano
  con la API y el worker.
- **Decisiones que tomó la IA y quedaron anotadas en el spec:** `page` por defecto 1, `limit` por
  defecto 10 y máximo 100, y un valor inválido responde 400 en vez de corregirse en silencio.
  La lista va del más nuevo al más viejo, desempatando por id para no repetir uploads entre
  páginas; `data` y `total` se leen en la misma transacción.
- **Qué se corrigió en el camino:** la IA cerró por error, además de sus procesos de prueba, la
  API y el worker que estuvieran corriendo en otras terminales (buscó por nombre de proceso).

### 10. Spec 007: frontend y login

- **Decisiones mías:** agregar login con JWT aunque la consigna no lo pide, para que "los uploads
  del usuario" sean de un usuario real; un frontend sencillo y funcional para probar todo a
  mano, porque el diseño lo voy a mandar después con imágenes.
- **Qué hizo la IA:** el contexto `auth` (registro como command, login como query, `scrypt` y JWT
  detrás de interfaces), las rutas de uploads protegidas con separación por usuario, el
  resumen para el dashboard y el frontend en Next.js 16 con React Query, Axios y Tailwind. 344
  tests del backend en verde, el frontend compila, y una prueba de punta a punta a través del
  frontend con dos usuarios.
- **Qué se corrigió o descubrió en el camino:**
  - Los tipos de `jsonwebtoken` no aceptan un texto cualquiera como vencimiento ("1h") sin un
    `as`: se pasó a segundos (`JWT_EXPIRES_IN_SECONDS`).
  - La Idempotency-Key era global: con usuarios, otro podía recibir un upload ajeno reusando la
    clave. Ahora responde 409.
  - En la prueba manual, `curl` de Git Bash rompía el cuerpo con una "ñ" (problema de cómo
    Windows pasa argumentos no ASCII); con el cuerpo en un archivo funciona. No era un bug de
    la aplicación.
  - Esta vez la IA guardó los PID de lo que lanzó para cerrar solo sus procesos.

### 11. Diseño, documentación y ajustes finales

- **Qué aporté yo:** el código del diseño de cada pantalla (subida, dashboard, lista, detalle, login y
  registro) como componentes de solo diseño, y los ajustes que vi al probar: fondo blanco en las
  tablas del detalle, paginar los datos procesados de a 10 y la versión para celular.
- **Qué hizo la IA:** pasó cada diseño a TypeScript separando la vista (props, sin lógica) de la
  lógica (hooks de React Query), reemplazó el gráfico decorativo del dashboard por datos reales
  (`GET /api/v1/uploads/activity-by-month`), el diagrama de AWS (`docs/arquitectura-aws.md` y
  `.png`) y un tablero de Miro con toda la arquitectura, que después pasó al repo en Mermaid
  (`docs/arquitectura-completa.md`).
- **Qué se corrigió o descubrió en el camino:**
  - **En el celular no se podía volver a la lista:** el CSS ocultaba el menú en pantallas
    angostas y la tabla de uploads tenía 760 px de ancho mínimo. El menú pasó a una segunda fila
    y la tabla se muestra como tarjetas, solo con CSS (`data-label` en cada celda).
  - **El gráfico mostraba solo 2026:** comparaba el último año contra `último - 1`, que no tenía
    datos, y los de 2024 quedaban afuera. Ahora compara los dos años más recientes con datos.
  - **En Miro, los diagramas no se pueden mover después de crearlos**, y al actualizarlos se
    corrían. Hubo que reacomodar el texto alrededor y crear los siguientes en su lugar final.
  - **Corregí con la IA mi propio texto de "¿Qué aprendí?"**: había escrito que un mensaje
    repetido en PROCESSING se ignora y que se hace *upsert* de las filas, y el código hace otra
    cosa (ver punto 4).

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
- [x] LocalStack en Docker, contratos de storage y mensajería, implementaciones con S3 y SQS,
  subida y consulta de uploads, encabezado del CSV y clave de idempotencia (spec 003), con sus
  tests unitarios, HTTP y de integración contra LocalStack
- [x] Parser del CSV (`CsvParserService` con `csv-parse`, spec 004) y sus tests unitarios
- [x] Worker, procesamiento, errores por fila y DLQ (spec 005), con tests unitarios y de integración
- [x] Lista paginada y resultados (spec 006), con sus tests
- [x] Login con JWT (contexto `auth`, `scrypt`, rutas protegidas y datos separados por usuario),
  resumen y actividad por mes para el dashboard (spec 007), con sus tests
- [x] Diagramas: arquitectura en AWS (`docs/arquitectura-aws.md`) y arquitectura completa
  (tablero de Miro y `docs/arquitectura-completa.md`)
- [x] `sample-data.csv` (60 filas) y `sample-data-con-errores.csv`

### Frontend

- [x] Setup de Next.js con React Query, Axios y Tailwind, y la lógica de cada pantalla (login,
  registro, dashboard, lista, subida con progreso y detalle con polling)
- [x] Pasar a TypeScript el diseño de cada pantalla (el código del diseño lo traje yo) y
  conectarlo con la lógica
- [x] Gráfico del dashboard con datos reales, paginación de resultados y versión para celular

## ¿Qué Modifiqué o Corregí?

1. **Principio de código mínimo:** reformulado de "menos líneas" a "legible y mínimo" (ver
   bitácora, etapa 1).
2. **Runner de tests:** la IA propuso Vitest y lo cambié por Jest. Eso obligó a bajar a
   TypeScript 6 y a ajustar el `tsconfig` para que los tests sigan chequeando tipos (ver
   bitácora, etapa 2).
3. **Un plan que no era mío:** otra sesión de Claude Code abierta en paralelo generó un plan con
   disco y Postgres como cola. Lo descarté y lo regeneré con LocalStack (etapa 5).
4. **Si no se puede encolar, el upload queda FAILED:** elegí esa opción entre tres para que
   ningún upload quede en PENDING para siempre (etapa 5).
5. **La API también revisa el encabezado del CSV:** fue un punto medio que pedí para avisar al
   instante si se subió el archivo equivocado (etapa 5).
6. **La clave de idempotencia se validaba tarde** y dejaba archivos huérfanos en S3: pasó a un
   value object que se valida al principio (etapa 5).
7. **Un commit con tests fallando:** la IA verificaba con un `grep` del resumen. Desde ahí se
   verifica con el código de salida de Jest (etapa 5).
8. **Un test desmintió la investigación** sobre la causa de los números de línea corridos con
   `\r\n`, y se corrigió el research (etapa 7).
9. **Si ninguna fila es válida, FAILED y no COMPLETED,** y los errores por fila en su propia
   tabla con su endpoint: decisiones mías para el worker (etapa 8).
10. **Login con JWT en vez de `user-123`:** lo agregué para que la separación por usuario sea
    real. La IA detectó que la Idempotency-Key tenía que dejar de ser global (etapa 10).
11. **Versión para celular y gráfico del dashboard:** los dos problemas los encontré yo al
    probar la app (etapa 11).

## ¿Qué Aprendí?

En este proyecto aprendí a aplicar **Domain-Driven Design (DDD)**, estructurar el manejo funcional de errores con **`Either`** y gestionar flujos asíncronos resilientes mediante **colas y buckets S3 emulados con LocalStack (AWS)**.

1. **Spec-Driven Development:**
   - **Constitución:** Documento de reglas innegociables y estándares que rige el proyecto como fuente única de verdad.
   - **Por qué el spec no habla de tecnología:** Porque describe el *qué* (reglas del negocio) y no el *cómo*, evitando acoplar el negocio a librerías o bases de datos.
   - **Separar spec, plan y tasks:** La *Spec* define el requerimiento; el *Plan*, la estrategia técnica; y las *Tasks*, tareas atómicas y ejecutables para no codear a ciegas.

2. **Either y manejo de errores:**
   - **Errores esperables como valor:** En vez de lanzar excepciones (`throw`), los fallos de negocio viajan explícitamente (`Left`/`Right`), obligando al compilador a exigir su tratamiento.
   - **Controllers sin try/catch:** Como el caso de uso devuelve un `Either`, el controller solo desempaqueta el resultado: si es `Right` responde (200 o 202) y si es `Left` lo lanza. Un único manejador de errores central en Fastify traduce cada error al status HTTP (400, 401, 404, 409); lo inesperado responde 500 sin detalles.

3. **Capas e inversión de dependencias:**
   - **`IDatabaseHealthChecker` y no Prisma:** Aplica inversión de dependencias (DIP) y arquitectura hexagonal. El handler depende de un contrato/interfaz, desacoplándose del ORM y facilitando mocks para tests.
   - **Awilix al arrancar:** Es el contenedor IoC; al iniciar registra y resuelve el árbol de dependencias (repos, servicios, casos de uso) e inyecta todo automáticamente sin instanciar a mano.

4. **Idempotencia:**
   - **En el procesamiento (worker), por `uploadId`:**
     - **Upload ya terminado (`COMPLETED` o `FAILED`):** El mensaje es una entrega repetida. No se procesa de nuevo y se borra de la cola.
     - **`PROCESSING → PROCESSING` se acepta como reintento:** Si el worker anterior se cayó a mitad de camino, el upload quedó en `PROCESSING`. El mensaje vuelve a la cola y otro intento lo retoma desde cero.
     - **Reemplazo de filas, todo o nada:** Guardar las filas de un upload borra las del intento anterior e inserta las nuevas en una sola transacción, y lo mismo pasa con los errores por fila. Procesar dos veces da exactamente las mismas filas, nunca el doble.
   - **El mensaje se borra al final:** Recién cuando el upload quedó en un estado final. Si algo falla antes, SQS lo reentrega. Al tercer intento el upload se marca `FAILED`, así nunca queda en `PROCESSING` para siempre.

5. **DDD (Aggregate Root y Value Objects):**
   - **Todo cambio pasa por `Upload`:** Al ser el Aggregate Root, es el guardián de las reglas del negocio e invariantes; nadie debe mutar su estado directamente.
   - **Value Object vs Entidad:** La *Entidad* tiene identidad única y persistente en el tiempo (un ID). El *Value Object* no tiene ID, es inmutable y se define solo por sus valores.
   - **`create` vs `restore`:** `create` instancia una entidad nueva validando sus reglas (devuelve un `Either`); `restore` reconstruye en memoria una entidad que ya existe en la BD, sin revalidar, porque ya se validó cuando se creó. Lo usan los mappers al leer de Prisma.

## Limitaciones Encontradas con IA

- **Las versiones "latest" no siempre son estables ni compatibles.** La primera propuesta
  (TypeScript 7 y Vitest) cambió al verificarla: Prisma tenía una RC como `latest` y
  `ts-jest` no soporta TypeScript 7. Sirvió que la IA probara las combinaciones en un
  proyecto descartable antes de escribir el plan.
- **Problemas que solo aparecen al ejecutar.** La incompatibilidad de Jest con un paquete ESM
  de Fastify no estaba prevista en el plan y apareció recién con el primer test HTTP.
- **Hay que revisar cómo verifica.** Un commit salió con dos tests fallando porque la IA miraba
  el resumen con un `grep` en vez del código de salida.
- **Puede pisar cosas fuera de su tarea:** una segunda sesión abierta en paralelo reescribió un
  spec, y en otro momento la IA cerró la API y el worker que yo tenía corriendo. Hay que mirar
  los archivos cambiados antes de aceptar.
- **También puede equivocarse al explicar.** Lo que escribí en "¿Qué aprendí?" lo revisé contra
  el código: dos afirmaciones no coincidían (el *upsert* y los eventos de dominio) y las corregí.

## Tiempo Invertido

- Setup y constitución: 10min
- Backend: 3hs
- Frontend: 1h
- Debugging y ajustes: 1h:30
- **Total:** 5h:40
