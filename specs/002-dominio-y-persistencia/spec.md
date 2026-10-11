# Feature Specification: Dominio y persistencia

**Feature Branch**: `002-dominio-y-persistencia`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "El modelo del negocio y su almacenamiento: un upload (archivo CSV
subido y su procesamiento) con su nombre validado, estado y transiciones permitidas
(PENDING → PROCESSING → COMPLETED | FAILED), y los datos de actividad (filas válidas del CSV).
Guardar, actualizar y buscar uploads; guardar y leer las filas de un upload. Tablas creadas con
una migración versionada. Fuera de alcance: endpoints, subida, parseo, cola, worker, listados y
frontend. Duda: qué pasa si el procesamiento se reintenta con el upload ya en PROCESSING."

## Clarifications

### Session 2026-10-10

- Q: ¿Se permite volver a marcar como en proceso un upload que ya está en PROCESSING (el worker
  se cayó a mitad y el mensaje volvió a la cola)? → A: Sí. PROCESSING → PROCESSING se acepta
  como reintento, y guardar las filas de un upload reemplaza las de un intento anterior. El
  identificador del upload es la clave de idempotencia del procesamiento. Se descartaron
  marcarlo FAILED (un corte transitorio dejaría fallado un archivo válido) y permitir
  FAILED → PROCESSING (FAILED dejaría de ser final; nadie lo pidió).

## User Scenarios & Testing *(mandatory)*

> Como en el spec 001, el "usuario" de este spec es quien desarrolla los specs siguientes
> (subida, worker, consultas). Lo que se entrega son las reglas del negocio y un lugar
> confiable donde guardar y recuperar los datos.

### User Story 1 - Ciclo de vida de un upload (Priority: P1)

Cuando alguien sube un archivo, el sistema crea un upload con un nombre válido y en estado
PENDING. A medida que se procesa, el upload avanza por los estados permitidos: PROCESSING y
después COMPLETED (con el conteo de filas) o FAILED (con un mensaje de error). Cualquier
intento de saltear o retroceder un estado se rechaza con un error de validación, sin romper el
sistema.

**Why this priority**: las reglas de estado son el corazón del negocio. Si viven en un solo
lugar, ni la API ni el worker pueden dejar un upload en un estado imposible. Se puede verificar
sin base de datos.

**Independent Test**: crear uploads y aplicarles secuencias de cambios de estado válidas e
inválidas, comprobando el resultado de cada una.

**Acceptance Scenarios**:

1. **Given** un nombre de archivo `datos.csv`, **When** se crea un upload, **Then** queda en
   PENDING, con el usuario `user-123`, sin conteos ni mensaje de error, y con fecha de creación.
2. **Given** un nombre vacío, `datos.txt` o `datos`, **When** se intenta crear un upload,
   **Then** se rechaza con un error de validación que explica el motivo.
3. **Given** un nombre `DATOS.CSV`, **When** se crea un upload, **Then** se acepta.
4. **Given** un upload en PENDING, **When** se marca como en proceso, **Then** pasa a
   PROCESSING.
5. **Given** un upload en PROCESSING, **When** se marca como completado con 10 filas totales,
   8 procesadas y 2 fallidas, **Then** pasa a COMPLETED con esos conteos.
6. **Given** un upload en PROCESSING, **When** se marca como fallido con el mensaje "archivo
   ilegible", **Then** pasa a FAILED con ese mensaje.
7. **Given** un upload en PENDING, **When** se intenta marcar como completado o fallido,
   **Then** se rechaza y el upload sigue en PENDING.
8. **Given** un upload en COMPLETED o FAILED, **When** se intenta cualquier cambio de estado,
   **Then** se rechaza y el upload no cambia.
9. **Given** un upload en PROCESSING, **When** se intenta marcar como fallido sin mensaje, o
   como completado con conteos que no cierran (procesadas + fallidas distinto del total, o
   valores negativos), **Then** se rechaza.
10. **Given** un upload en PROCESSING (el worker se cayó a mitad y el mensaje volvió a la
    cola), **When** el procesamiento se reintenta y se lo marca de nuevo como en proceso,
    **Then** se acepta y sigue en PROCESSING. Un reintento no es un error del upload.

---

### User Story 2 - Guardar y recuperar uploads (Priority: P2)

El sistema guarda un upload nuevo, lo actualiza cada vez que cambia de estado y lo recupera
por su identificador exactamente como se guardó. Si se pide un upload que no existe, se
informa como "no encontrado". Las tablas de la base se crean con una migración versionada que
se aplica con un solo comando.

**Why this priority**: la API (spec 003) y el worker (spec 005) son procesos separados y solo
se comunican a través de lo guardado. Depende de las reglas de US1.

**Independent Test**: con la base levantada y la migración aplicada, guardar un upload,
leerlo, cambiarle el estado, volver a leerlo y comparar todos los campos.

**Acceptance Scenarios**:

1. **Given** una base vacía, **When** se aplica la migración, **Then** quedan creadas las
   estructuras para uploads y datos de actividad.
2. **Given** un upload nuevo, **When** se guarda y se busca por su identificador, **Then** se
   obtiene un upload con los mismos valores en todos sus campos.
3. **Given** un upload guardado en PENDING, **When** se marca como en proceso, se guarda y se
   vuelve a buscar, **Then** está en PROCESSING y su fecha de última actualización es posterior
   a la de creación.
4. **Given** un upload guardado en COMPLETED, **When** se busca, **Then** tiene los conteos de
   filas guardados.
5. **Given** un identificador que no existe, **When** se busca, **Then** el resultado indica
   "no encontrado", sin lanzar una excepción.
6. **Given** un upload recuperado de la base, **When** se le intenta aplicar una transición
   inválida, **Then** se rechaza igual que uno recién creado: las reglas no se pierden al
   guardar y leer.

---

### User Story 3 - Datos de actividad de un upload (Priority: P3)

Cada fila válida de un CSV procesado se convierte en un dato de actividad (categoría, cantidad,
unidad y fecha) que pertenece a un upload. El sistema guarda todas las filas de un upload en
una sola operación y las devuelve cuando se piden por upload.

**Why this priority**: las necesitan el worker (spec 005), para guardar el resultado, y las
consultas (spec 006), para mostrarlo. Depende de que existan uploads guardados (US2).

**Independent Test**: guardar un upload, guardarle un lote de filas y leerlas por upload,
comparando cada valor.

**Acceptance Scenarios**:

1. **Given** categoría `Electricity`, cantidad `150.5`, unidad `kWh` y fecha `2024-01-15`,
   **When** se crea un dato de actividad, **Then** se acepta con esos valores.
2. **Given** una categoría o unidad vacía, una cantidad cero o negativa, o una fecha
   inexistente (por ejemplo, `2024-02-31`), **When** se intenta crear un dato de actividad,
   **Then** se rechaza con un error de validación.
3. **Given** un upload guardado y 5 datos de actividad, **When** se guardan juntos y se leen
   por ese upload, **Then** se obtienen los 5 con los mismos valores, incluida la fecha como el
   mismo día calendario.
4. **Given** un upload sin filas guardadas, **When** se leen sus datos de actividad, **Then**
   se obtiene una lista vacía.
5. **Given** un identificador de upload que no existe, **When** se intentan guardar filas para
   él, **Then** se rechaza y no se guarda ninguna fila.
6. **Given** dos uploads con filas, **When** se leen las de uno, **Then** no aparecen las del
   otro.
7. **Given** un upload con 5 filas guardadas por un intento anterior, **When** se guardan 3
   filas nuevas para ese mismo upload (reintento), **Then** al leerlas hay exactamente esas 3:
   las anteriores se reemplazan y no se duplican.

---

### Edge Cases

- **Mayúsculas y espacios en el nombre:** `DATOS.CSV` se acepta. Un nombre que es solo
  `.csv` o tiene espacios alrededor (`"  datos.csv  "`) se rechaza en el primer caso y se
  recorta en el segundo.
- **Fechas y zona horaria:** una fecha `2024-01-15` se guarda y se lee como el 15 de enero,
  sin importar la zona horaria de la máquina. No debe correrse al día 14.
- **Cantidades con decimales:** `150.5` se lee como `150.5`, sin redondeos.
- **Lote parcial:** si una fila de un lote no se puede guardar (por ejemplo, porque el upload
  no existe), no se guarda ninguna. No quedan lotes a medias.
- **Upload completado sin filas válidas** (0 procesadas, todas fallidas): se permite
  registrarlo así. Decidir si eso debería ser FAILED corresponde al spec 005.
- **Reintentos del procesamiento:** si el worker muere a mitad, el upload queda en
  PROCESSING y el mensaje vuelve a la cola. El reintento se acepta (PROCESSING → PROCESSING) y
  el nuevo lote de filas reemplaza al anterior. El identificador del upload funciona como
  clave de idempotencia: procesar dos veces el mismo upload deja el mismo resultado que
  procesarlo una vez.

## Requirements *(mandatory)*

### Functional Requirements

**Upload y nombre de archivo**

- **FR-001**: El sistema DEBE crear un upload solo con un nombre de archivo válido. Un nombre
  válido no está vacío, termina en `.csv` (sin distinguir mayúsculas) y tiene al menos un
  carácter antes de la extensión. Los espacios alrededor se recortan.
- **FR-002**: Un upload nuevo DEBE tener un identificador único generado por el sistema, el
  estado PENDING, el usuario `user-123`, la ubicación del archivo guardado, la fecha de
  creación y la de última actualización, y sin conteos ni mensaje de error.

**Estados**

- **FR-003**: Los estados válidos DEBEN ser exactamente PENDING, PROCESSING, COMPLETED y
  FAILED.
- **FR-004**: Las únicas transiciones permitidas DEBEN ser: PENDING → PROCESSING, PROCESSING →
  PROCESSING (reintento), PROCESSING → COMPLETED y PROCESSING → FAILED. COMPLETED y FAILED son
  finales.
- **FR-005**: Marcar como COMPLETED DEBE requerir los conteos de filas totales, procesadas y
  fallidas: enteros no negativos que cumplan procesadas + fallidas = totales.
- **FR-006**: Marcar como FAILED DEBE requerir un mensaje de error no vacío.
- **FR-007**: Toda transición o dato inválido DEBE rechazarse con un error de validación
  devuelto como resultado (sin lanzar excepciones), y el upload NO DEBE modificarse.
- **FR-008**: Las reglas de estado DEBEN vivir en el propio upload, para que ningún otro
  componente (API, worker) pueda saltearlas.

**Datos de actividad**

- **FR-009**: Un dato de actividad DEBE crearse solo con categoría y unidad no vacías, una
  cantidad numérica mayor que cero y una fecha calendario válida en formato `YYYY-MM-DD`.
- **FR-010**: Cada dato de actividad DEBE pertenecer a exactamente un upload.

**Persistencia**

- **FR-011**: El sistema DEBE guardar un upload nuevo y actualizar uno existente con su estado,
  conteos, mensaje de error y fecha de última actualización.
- **FR-012**: El sistema DEBE recuperar un upload por su identificador con los mismos valores
  con que se guardó. Si no existe, DEBE informarlo como "no encontrado".
- **FR-013**: El sistema DEBE guardar todas las filas de actividad de un upload en una sola
  operación de todo o nada, que **reemplaza** las filas que ese upload tuviera de un intento
  anterior. Así, guardar dos veces el mismo lote no duplica filas (idempotencia por
  identificador de upload).
- **FR-014**: El sistema DEBE devolver las filas de actividad de un upload, y solo las de ese
  upload.
- **FR-015**: Las estructuras de almacenamiento DEBEN crearse con una migración versionada en
  el repositorio, que se aplica con un solo comando documentado.
- **FR-016**: Las fechas de actividad DEBEN conservarse como el mismo día calendario, sin
  desplazamientos por zona horaria.
- **FR-017**: Las reglas de dominio (FR-001 a FR-010) DEBEN tener tests unitarios escritos
  antes que su implementación. La persistencia (FR-011 a FR-016) DEBE tener tests de
  integración contra la base de desarrollo.

### Key Entities

- **Upload**: el archivo subido y el estado de su procesamiento. Atributos: identificador,
  nombre de archivo, ubicación del archivo guardado, estado, usuario, filas totales,
  procesadas y fallidas (opcionales hasta completar), mensaje de error (solo si falló), fecha
  de creación y de última actualización. Es la raíz del agregado: los cambios de estado pasan
  por él.
- **Nombre de archivo**: un valor con su propia regla de validez (FR-001). Es inmutable.
- **Estado del upload**: uno de los cuatro valores de FR-003, con las transiciones de FR-004.
- **Dato de actividad**: una fila válida de un CSV procesado. Atributos: identificador,
  upload al que pertenece, categoría, cantidad, unidad, fecha y fecha de creación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: el 100 % de las transiciones inválidas de la matriz de estados (todas las
  combinaciones origen → destino no permitidas) se rechazan, y el 100 % de las válidas se
  aceptan.
- **SC-002**: el 100 % de los campos de un upload y de sus datos de actividad se recuperan con
  el mismo valor con que se guardaron, incluidas fechas y decimales.
- **SC-003**: en una base vacía, la estructura completa queda creada con 1 comando en menos de
  1 minuto.
- **SC-004**: un lote de 1.000 filas de actividad de un upload se guarda en menos de 2 segundos
  y se lee completo en menos de 1 segundo, en el entorno de desarrollo.
- **SC-005**: ante un lote con un upload inexistente, quedan guardadas 0 filas.
- **SC-006**: todos los tests unitarios y de integración del spec pasan, y ninguno está
  salteado.

## Assumptions

- No hay autenticación: todo upload pertenece a `user-123` (constitución, restricciones).
- La "ubicación del archivo guardado" es un texto opaco que define el almacenamiento del spec
  003. Este spec solo exige que no esté vacío.
- La validación de las filas del CSV y el reporte de qué filas fallaron y por qué son del spec
  004. Este spec define qué es un dato de actividad válido para guardarse.
- Borrar uploads o datos de actividad está fuera de alcance: el archivo y su resultado se
  conservan para auditoría (CLAUDE.md, decisiones tomadas).
- Los listados paginados de uploads son del spec 006. Acá solo se busca por identificador.
- Se usa la misma base de desarrollo del spec 001 (Docker). Los tests de integración necesitan
  que esté levantada.
