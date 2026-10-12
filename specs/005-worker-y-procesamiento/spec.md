# Feature Specification: Worker y procesamiento

**Feature Branch**: `005-worker-y-procesamiento`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Un proceso separado (el worker de la consigna, `npm run worker`)
toma los avisos de la cola, baja el archivo, lo parsea con la pieza del spec 004, guarda las
filas válidas y los errores por fila, y marca el upload COMPLETED o FAILED. Si ninguna fila es
válida, FAILED. Los errores por fila se guardan y se consultan con su propio endpoint.
Reintentos ante fallas transitorias y cola de mensajes fallidos (DLQ)."

## Clarifications

### Session 2026-10-11

- Q: ¿Qué estado toma un upload si ninguna fila es válida? → A: FAILED, con el mensaje
  "Ninguna de las N filas es válida: revisá los errores por fila". COMPLETED con 0 filas
  engañaría a la persona. Los errores por fila se guardan igual.
- Q: ¿Dónde se guardan los errores por fila? → A: En un registro propio por error (línea y
  motivo, asociado al upload), que se reemplaza en cada intento y se consulta con su propio
  pedido de lectura. El mensaje de error del upload es uno solo y no alcanza para cientos.
- Q: ¿Cómo es el worker? → A: Como pide la consigna: un script separado que hace polling (si la
  cola está vacía, espera 3 segundos y vuelve a preguntar) y por cada aviso baja el archivo,
  parsea, valida, guarda, actualiza el estado y recién al final elimina el aviso.
- Q: ¿Qué pasa si el procesamiento falla por un problema transitorio (almacenamiento o base
  caídos)? → A: El aviso no se elimina y la cola lo vuelve a entregar. En el tercer intento el
  upload se marca FAILED ("No se pudo procesar después de 3 intentos") y se elimina el aviso.
  Si ni eso se puede, la cola mueve el aviso a una cola de mensajes fallidos (DLQ).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El archivo subido se procesa solo (Priority: P1) 🎯 MVP

Con el worker corriendo, un CSV subido pasa de PENDING a PROCESSING y termina COMPLETED (con
conteos) o FAILED (con motivo), sin que nadie intervenga. Las filas válidas quedan guardadas.

**Why this priority**: es el criterio de "listo" del plan general y lo que hace que el sistema
funcione de punta a punta.

**Independent Test**: subir un CSV, correr el worker y consultar el upload y sus filas.

**Acceptance Scenarios**:

1. **Given** un upload PENDING con un CSV de 3 filas (2 válidas, 1 con la categoría vacía),
   **When** el worker procesa su aviso, **Then** el upload queda COMPLETED con total 3,
   procesadas 2 y fallidas 1, hay 2 datos de actividad guardados y el aviso ya no está en la cola.
2. **Given** un CSV donde ninguna fila es válida, **When** se procesa, **Then** el upload queda
   FAILED con "Ninguna de las N filas es válida: revisá los errores por fila", sin datos de
   actividad, y el aviso se elimina.
3. **Given** un archivo que el parser rechaza entero (otro encabezado, no UTF-8, comillas mal
   cerradas, sin filas), **When** se procesa, **Then** el upload queda FAILED con el motivo del
   parser y el aviso se elimina.
4. **Given** el procesamiento empezó, **When** se consulta el upload, **Then** está PROCESSING.
5. **Given** la cola vacía, **When** el worker corre, **Then** espera 3 segundos y vuelve a
   preguntar, sin errores.

---

### User Story 2 - Ver los errores por fila (Priority: P2)

La persona consulta los errores de su upload y ve, para cada fila rechazada, la línea y el motivo.

**Why this priority**: sin esto, "fallidas: 1" no dice qué corregir.

**Independent Test**: procesar un CSV con filas rotas y pedir sus errores.

**Acceptance Scenarios**:

1. **Given** un upload procesado con un error en la línea 3, **When** se piden sus errores,
   **Then** la respuesta es `{ data: [{ line: 3, message: "La categoría no puede estar vacía" }] }`.
2. **Given** un upload sin errores o todavía no procesado, **When** se piden sus errores,
   **Then** la respuesta es `{ data: [] }`.
3. **Given** un identificador que no existe, **When** se piden sus errores, **Then** "no encontrado".

---

### User Story 3 - Fallas, avisos repetidos y reintentos (Priority: P3)

El procesamiento es robusto: un aviso repetido no procesa dos veces, un aviso inválido no traba
la cola, y una falla transitoria se reintenta hasta 3 veces sin dejar uploads en PROCESSING
para siempre.

**Why this priority**: la cola entrega "al menos una vez" y los servicios pueden caerse. Va
después porque el camino feliz (US1) ya entrega valor.

**Independent Test**: con dobles, simular avisos repetidos, avisos sin identificador y fallas
del almacenamiento en el primer y en el tercer intento.

**Acceptance Scenarios**:

1. **Given** un upload ya COMPLETED o FAILED, **When** llega otro aviso suyo, **Then** no se
   procesa de nuevo y el aviso se elimina.
2. **Given** un aviso cuyo upload no existe, o sin identificador, **When** se procesa, **Then**
   se elimina el aviso sin cambiar nada.
3. **Given** el almacenamiento no responde en el primer o segundo intento, **When** se procesa,
   **Then** el aviso no se elimina (se va a reintentar) y el upload no queda en un estado final.
4. **Given** el almacenamiento no responde en el tercer intento, **When** se procesa, **Then**
   el upload queda FAILED con "No se pudo procesar después de 3 intentos" y el aviso se elimina.
5. **Given** un reintento de un upload que quedó PROCESSING, **When** se procesa bien, **Then**
   termina igual que si hubiera sido el primer intento (filas y errores reemplazados, no duplicados).

### Edge Cases

- El worker se frena (Ctrl+C) en medio de un aviso: termina ese aviso y cierra las conexiones.
- La base no responde al buscar el upload, en todos los intentos: el aviso nunca se elimina y la
  cola lo mueve a la DLQ después de 3 entregas.
- Un aviso que no es JSON: se trata como aviso sin identificador.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El worker MUST ser un proceso separado que se inicia con `npm run worker`.
- **FR-002**: Si la cola está vacía, MUST esperar 3 segundos antes de volver a preguntar.
- **FR-003**: El worker MUST traducir el aviso a un pedido de procesamiento y no contener reglas
  de negocio; MUST eliminar el aviso solo al final, cuando el procesamiento terminó o el error
  es de negocio.
- **FR-004**: MUST marcar el upload PROCESSING antes de procesar (también en un reintento).
- **FR-005**: MUST leer el archivo guardado y parsearlo con la pieza del spec 004.
- **FR-006**: MUST guardar las filas válidas y los errores por fila, reemplazando los de un
  intento anterior.
- **FR-007**: MUST marcar COMPLETED con total, procesadas y fallidas si hay al menos una fila
  válida; FAILED con el motivo si el parser rechazó el archivo o ninguna fila es válida.
- **FR-008**: Un upload inexistente o ya terminado MUST resolverse sin procesar y eliminando el aviso.
- **FR-009**: Una falla transitoria MUST dejar el aviso en la cola; en el tercer intento MUST
  marcar FAILED ("No se pudo procesar después de 3 intentos") y eliminar el aviso.
- **FR-010**: La cola MUST mover a una DLQ los avisos entregados más de 3 veces.
- **FR-011**: MUST existir una consulta de errores por fila de un upload (`GET
  /api/v1/uploads/:id/errors` → `{ data: [{ line, message }] }`, ordenados por línea; 404 si
  el upload no existe).
- **FR-012**: El comportamiento MUST estar cubierto por pruebas automáticas con dobles, más una
  prueba de punta a punta contra la base y la cola emuladas.

### Key Entities

- **Error de fila guardado**: upload, línea y motivo. Se reemplazan en cada intento.
- **Pedido de procesamiento**: identificador del upload y número de intento.

## Success Criteria *(mandatory)*

- **SC-001**: Con el worker corriendo, un CSV subido llega a COMPLETED o FAILED en menos de 10
  segundos sin intervención.
- **SC-002**: En el 100% de los casos procesados, procesadas + fallidas = total y hay tantos datos
  de actividad como procesadas y tantos errores guardados como fallidas.
- **SC-003**: Ningún upload queda en PROCESSING después del tercer intento fallido.
- **SC-004**: Procesar dos veces el mismo aviso deja el mismo resultado.
- **SC-005**: Todos los escenarios tienen una prueba automática y todas pasan.

## Assumptions

- 3 intentos y 3 segundos de espera son valores fijos (no configurables) para este spec.
- El tiempo de ocultamiento de 60 s ya configurado es mayor que lo que tarda procesar 10 MB (~1 s).
- Los resultados (`/results`) y la lista paginada son del spec 006.
