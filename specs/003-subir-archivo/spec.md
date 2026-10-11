# Feature Specification: Subir archivo

**Feature Branch**: `003-subir-archivo`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Subir un CSV y que quede registrado y encolado para procesar:
guardar el archivo original, crear el upload en PENDING, publicar un aviso con el identificador
y responder enseguida. Consultar el estado de un upload por su identificador. El almacenamiento
de archivos y la cola de mensajes van detrás de contratos, con una versión local que funcione
ahora y la posibilidad de enchufar servicios en la nube más adelante, eligiendo por
configuración y sin tocar la lógica. Fuera de alcance: leer y validar el contenido del CSV,
el worker, los listados, los resultados y el frontend."

Ajuste del autor: la subida revisa también el encabezado del CSV (solo la primera línea).

## Clarifications

### Session 2026-10-11

- Q: ¿La cola y el almacenamiento usan servicios en la nube desde ahora? → A: Usan los mismos
  servicios de la nube, pero emulados en la máquina local, sin cuenta ni costo. Cuando el
  autor conecte su cuenta, se pasa a los servicios reales cambiando solo la configuración
  (dirección del servicio y credenciales): el código es el mismo en los dos casos. Los dos
  servicios quedan además detrás de contratos, para probar la lógica con dobles y no depender
  de un proveedor concreto. Se descartó escribir un proveedor local distinto (disco y una tabla
  como cola) porque habría que programar a mano lo que la cola real ya hace (ocultar el aviso
  mientras se procesa, contar entregas) y después reemplazarlo.
- Q: ¿La cola local puede vivir en la memoria del servicio? → A: No. El servicio que recibe
  las subidas y el que procesa son procesos separados y no comparten memoria. La cola local
  DEBE ser persistente y visible para los dos.
- Q: ¿Qué recibe el usuario al subir? → A: Un comprobante: el identificador y el estado
  PENDING. Significa "recibido y en la fila", no "procesado". El resultado se consulta después
  con ese identificador.
- Q: ¿Qué pasa si falla publicar el aviso con el upload ya registrado? → A: El upload se marca
  FAILED con el mensaje "No se pudo encolar el archivo para procesarlo" y la subida responde
  con un error interno. Así ningún upload queda en PENDING para siempre sin aviso (el frontend
  haría polling sin fin). Para eso se agrega la transición PENDING → FAILED a las reglas del
  spec 002: un upload puede fallar antes de empezar a procesarse. Se descartaron dejarlo en
  PENDING como limitación (queda trabado) y un proceso que republique los PENDING viejos
  (patrón outbox: más robusto, pero es un componente más; queda como mejora documentada).
- Q: ¿La subida revisa algo del contenido del CSV? → A: Solo el encabezado, la primera línea:
  tiene que ser `category,amount,unit,date`. Es barato (no se recorre el archivo) y le avisa
  al usuario en el momento si subió un archivo equivocado. Las filas de datos se siguen
  validando recién al procesar, fila por fila, para no frenar la respuesta y para poder
  informar cuántas filas pasaron y cuántas fallaron.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir un CSV y recibir el comprobante (Priority: P1)

Una persona elige un archivo CSV y lo envía. El sistema guarda el archivo original tal cual
llegó, registra un upload en estado PENDING, deja un aviso en la cola con el identificador de
ese upload y responde enseguida con el comprobante: identificador, estado, nombre del archivo y
fecha de creación. No espera a que el archivo se procese.

**Why this priority**: es la puerta de entrada de todo el sistema. Sin subida no hay nada que
procesar ni que consultar. Entrega valor sola: el archivo queda guardado y registrado aunque
todavía no exista el worker.

**Independent Test**: enviar un CSV y comprobar que hay exactamente un archivo guardado igual
al original, un upload en PENDING y un aviso en la cola con su identificador.

**Acceptance Scenarios**:

1. **Given** un archivo `datos.csv` con contenido, **When** se sube, **Then** la respuesta
   indica "aceptado" y trae el identificador, el estado PENDING, el nombre `datos.csv` y la
   fecha de creación.
2. **Given** una subida aceptada, **When** se revisa el sistema, **Then** hay un archivo
   guardado idéntico byte a byte al enviado, un upload en PENDING del usuario `user-123` que
   apunta a ese archivo, y un aviso en la cola cuyo único dato es el identificador del upload.
3. **Given** una petición sin archivo, **When** se envía, **Then** se rechaza con un error de
   validación que explica que falta el archivo.
4. **Given** un archivo `datos.txt`, `datos` o sin nombre, **When** se sube, **Then** se
   rechaza con un error de validación que explica que debe ser un `.csv`.
5. **Given** un archivo `vacio.csv` de 0 bytes, **When** se sube, **Then** se rechaza con un
   error de validación.
6. **Given** un archivo `.csv` que supera el tamaño máximo, **When** se sube, **Then** se
   rechaza indicando que es demasiado grande.
7. **Given** cualquier subida rechazada, **When** se revisa el sistema, **Then** no quedó
   ningún archivo guardado, ningún upload y ningún aviso.
8. **Given** un archivo `.csv` con el encabezado `category,amount,unit,date` pero filas con
   datos inválidos (cantidad negativa, fecha inexistente, campos vacíos), **When** se sube,
   **Then** se acepta igual: las filas se revisan después, al procesar.
9. **Given** dos subidas de archivos con el mismo nombre, **When** se revisa el sistema,
   **Then** hay dos uploads y dos archivos guardados distintos: ninguno pisó al otro.
10. **Given** un archivo `.csv` cuya primera línea no es el encabezado esperado (falta una
    columna, sobra una, tiene otro nombre o es directamente una fila de datos), **When** se
    sube, **Then** se rechaza con un error de validación que dice qué encabezado se esperaba
    y cuál llegó.
11. **Given** un archivo `.csv` con el encabezado escrito `Category, Amount ,UNIT,date`,
    terminado en salto de línea de Windows o precedido por la marca invisible que agregan
    algunos editores (BOM), **When** se sube, **Then** se acepta: mayúsculas, espacios
    alrededor de cada nombre, el tipo de salto de línea y esa marca no cuentan.
12. **Given** la cola no responde, **When** se sube un archivo válido, **Then** la respuesta
    es un error interno, y el upload registrado queda en FAILED con el mensaje "No se pudo
    encolar el archivo para procesarlo". No queda ningún upload en PENDING sin aviso.

---

### User Story 2 - Consultar el estado de un upload (Priority: P2)

Con el identificador del comprobante, la persona (o el frontend, cada pocos segundos) consulta
cómo va su upload: estado, nombre, conteos de filas cuando existan, mensaje de error si falló
y fechas.

**Why this priority**: es lo que le da sentido al comprobante. Depende de que existan uploads
(US1).

**Independent Test**: subir un archivo, consultar con el identificador recibido y comparar los
datos; consultar con un identificador inexistente.

**Acceptance Scenarios**:

1. **Given** un upload recién subido, **When** se consulta por su identificador, **Then** se
   obtiene el mismo identificador, estado PENDING, el nombre del archivo, los conteos y el
   mensaje de error vacíos, y las fechas de creación y de última actualización.
2. **Given** un upload que ya fue completado o falló, **When** se consulta, **Then** se
   obtienen sus conteos de filas o su mensaje de error.
3. **Given** un identificador que no existe o está mal formado, **When** se consulta,
   **Then** la respuesta es "no encontrado".
4. **Given** cualquier consulta, **When** se revisa la respuesta, **Then** no incluye la
   ubicación interna del archivo guardado.

---

### User Story 3 - La cola entrega los avisos entre procesos (Priority: P3)

El proceso que va a procesar los archivos (spec 005) pide el próximo aviso. La cola le entrega
el más antiguo que esté disponible y lo oculta por un tiempo, para que nadie más lo tome. Si
el trabajo termina, el proceso confirma y el aviso se elimina. Si el proceso se cae sin
confirmar, el aviso reaparece al vencer ese tiempo y se entrega de nuevo, con un contador que
dice cuántas veces se entregó.

**Why this priority**: sin esto, un aviso publicado no le llega a nadie. Va después de US1 y
US2 porque quien lo consume llega en el spec 005, pero se define acá porque es parte del mismo
contrato de mensajería que la publicación.

**Independent Test**: publicar avisos y ejercitar recibir, recibir de nuevo, esperar el
vencimiento y confirmar, comprobando qué se entrega en cada paso.

**Acceptance Scenarios**:

1. **Given** una cola vacía, **When** se pide un aviso, **Then** no se obtiene ninguno.
2. **Given** dos avisos publicados, **When** se piden de a uno, **Then** se entrega primero el
   más antiguo, y cada uno trae su contenido y un contador de entregas en 1.
3. **Given** un aviso recién entregado y no confirmado, **When** otro consumidor pide un aviso
   antes de que venza el tiempo de ocultamiento, **Then** no recibe ese aviso.
4. **Given** un aviso entregado y no confirmado, **When** vence el tiempo de ocultamiento y se
   pide un aviso, **Then** se entrega de nuevo con el contador en 2.
5. **Given** un aviso entregado, **When** se confirma, **Then** no vuelve a entregarse nunca.
6. **Given** un aviso ya confirmado, **When** se confirma otra vez, **Then** no pasa nada y no
   hay error.
7. **Given** un aviso publicado por un proceso, **When** otro proceso pide un aviso, **Then**
   lo recibe: la cola no depende de la memoria de quien publicó.
8. **Given** un solo aviso y varios consumidores que lo piden al mismo tiempo, **When** se
   resuelve, **Then** lo recibe exactamente uno.

---

### User Story 4 - Cambiar a servicios en la nube sin tocar la lógica (Priority: P4)

Hoy los archivos y los avisos van a un emulador local de los servicios de la nube. Cuando el
autor conecte su cuenta, cambia la configuración (dirección del servicio y credenciales) y el
mismo sistema pasa a usar el almacenamiento y la cola reales. La subida, la consulta y el
procesamiento siguen funcionando igual, con el mismo código.

**Why this priority**: es el objetivo del autor, pero no hace falta para que el sistema
funcione de punta a punta: el emulador alcanza para desarrollar, probar y entregar. Como el
código es el mismo, conectar la cuenta no obliga a modificar ningún spec.

**Independent Test**: repetir los escenarios de US1 y US3 con la configuración de la nube real
y obtener los mismos resultados que con el emulador.

**Acceptance Scenarios**:

1. **Given** la configuración por defecto, **When** arranca el servicio, **Then** usa el
   emulador local y no necesita cuenta ni credenciales reales.
2. **Given** la configuración de la nube real y sus credenciales, **When** se sube un
   archivo, **Then** el archivo y el aviso quedan en esos servicios y la respuesta es la misma
   que con el emulador.
3. **Given** falta un valor obligatorio de configuración (por ejemplo, la dirección de la
   cola), **When** arranca el servicio, **Then** no arranca y el error nombra lo que falta,
   sin mostrar secretos.

---

### User Story 5 - Evitar uploads duplicados por reintentos (Priority: P5, opcional)

Si la respuesta de una subida se pierde (un corte de red, un timeout) y el cliente reintenta,
el sistema no crea un segundo upload. El cliente manda una clave única por intento de subida;
si esa clave ya se usó, el sistema devuelve el upload que ya existe.

**Why this priority**: mejora la robustez, pero el sistema funciona sin esto. El doble clic,
el caso más común, se evita en el frontend deshabilitando el botón mientras sube (spec 007).
Se implementa al final del spec solo si las demás historias ya funcionan; si no, se documenta
en "Limitaciones conocidas" del README con este diseño como solución (constitución,
principio V).

**Independent Test**: subir dos veces el mismo archivo con la misma clave y comprobar que hay
un solo upload, un solo archivo guardado y un solo aviso.

**Acceptance Scenarios**:

1. **Given** un upload creado con la clave `abc-123`, **When** se vuelve a subir con la misma
   clave, **Then** se responde con el mismo upload, sin guardar otro archivo ni publicar otro
   aviso.
2. **Given** dos subidas con la misma clave al mismo tiempo, **When** se resuelven, **Then**
   queda un solo upload y las dos respuestas traen su identificador.
3. **Given** dos subidas sin clave, o con claves distintas, **When** se envían, **Then** se
   crean dos uploads, igual que en US1.

---

### Edge Cases

- **Varios archivos en una misma petición:** se usa el primero y se ignoran los demás.
- **Nombre con rutas o caracteres raros** (`../../algo.csv`): el nombre original se guarda
  como dato del upload, pero nunca se usa para decidir dónde se guarda el archivo.
- **Mayúsculas en la extensión** (`DATOS.CSV`): se acepta, según la regla del spec 002.
- **Solo el encabezado, sin filas de datos:** se acepta. Qué significa un CSV sin filas lo
  decide el procesamiento (spec 005).
- **Columnas en otro orden** (`amount,category,unit,date`): se rechaza. El orden forma parte
  del formato esperado, igual que en el ejemplo de la consigna.
- **Primera línea que no se puede leer como texto** (un archivo binario renombrado a `.csv`):
  no coincide con el encabezado y se rechaza.
- **Tipo de contenido declarado por el navegador:** no se usa para validar. Distintos
  navegadores y sistemas declaran tipos distintos para un mismo CSV. Vale la extensión.
- **Falla al guardar el archivo:** no se crea upload ni aviso, y la respuesta es un error
  interno.
- **Falla al registrar el upload después de guardar el archivo:** queda un archivo huérfano
  sin upload. No afecta a ningún usuario; se documenta como limitación.
- **Falla al publicar el aviso después de registrar el upload:** el upload pasa a FAILED con
  el mensaje "No se pudo encolar el archivo para procesarlo" y la respuesta es un error
  interno (US1, escenario 12). Si además falla guardar ese FAILED (por ejemplo, porque se cayó
  la base), el upload queda en PENDING: se documenta como limitación, con el patrón outbox
  como solución.
- **Doble envío del mismo archivo:** sin clave de idempotencia crea dos uploads. El doble
  clic lo evita el frontend (spec 007); el reintento por respuesta perdida lo resuelve la
  clave opcional de US5.
- **Misma clave con otro archivo:** se devuelve el upload existente. La clave identifica el
  intento de subida, no el contenido.
- **Aviso entregado dos veces:** es esperable (entrega "al menos una vez"). Que procesarlo dos
  veces dé el mismo resultado ya lo garantiza el spec 002.
- **Avisos que fallan siempre:** la cola solo informa cuántas veces entregó cada aviso. Decidir
  cuándo rendirse y qué hacer con ese aviso es del spec 005.
- **Paso del emulador a la nube con datos existentes:** los archivos y avisos guardados en el
  emulador no se migran. Un upload creado contra el emulador no se puede procesar contra la
  nube real.
- **El emulador local no está levantado:** la subida responde un error interno, igual que si
  fallara el servicio real.

## Requirements *(mandatory)*

### Functional Requirements

**Subida**

- **FR-001**: El sistema DEBE aceptar un archivo por petición de subida. Si llegan varios, usa
  el primero.
- **FR-002**: El sistema DEBE rechazar con un error de validación una subida sin archivo, con
  un nombre que no cumpla la regla de nombre del spec 002 (FR-001), con un archivo de 0 bytes
  o con un archivo mayor que el tamaño máximo (10 MB).
- **FR-003**: Durante la subida, el sistema DEBE revisar solo la primera línea del archivo y
  rechazar con un error de validación la subida cuyo encabezado no sea exactamente
  `category,amount,unit,date`, en ese orden. Al comparar se ignoran las mayúsculas, los
  espacios alrededor de cada nombre, el salto de línea final (`\n` o `\r\n`) y una marca BOM
  al principio. El error DEBE indicar el encabezado esperado y el recibido. El sistema NO DEBE
  leer ni validar las filas de datos durante la subida.
- **FR-003a**: La regla del encabezado DEBE estar definida en un solo lugar y ser la misma que
  use el procesamiento del CSV (spec 004), para que la subida y el procesamiento nunca
  acepten formatos distintos.
- **FR-004**: En una subida aceptada el sistema DEBE, en este orden: guardar el archivo
  original sin modificarlo; registrar un upload en PENDING con la ubicación del archivo; y
  publicar un aviso cuyo único dato es el identificador del upload.
- **FR-005**: El sistema DEBE responder la subida aceptada sin esperar al procesamiento, con el
  identificador, el estado, el nombre del archivo y la fecha de creación, y de una forma que
  distinga "aceptado para procesar" de "terminado".
- **FR-006**: Una subida rechazada NO DEBE dejar archivo guardado, upload ni aviso.
- **FR-007**: La ubicación de cada archivo guardado DEBE ser única y NO DEBE derivarse del
  nombre que envió el usuario.
- **FR-008**: Todo upload DEBE quedar asociado al usuario `user-123`.
- **FR-008a**: Si falla publicar el aviso después de registrar el upload, el sistema DEBE
  marcar el upload FAILED con el mensaje "No se pudo encolar el archivo para procesarlo" y
  responder con un error interno.
- **FR-008b**: Las reglas de estado del spec 002 DEBEN admitir la transición PENDING → FAILED.
  Las demás transiciones no cambian.

**Consulta**

- **FR-009**: El sistema DEBE devolver un upload por su identificador con: identificador,
  estado, nombre del archivo, filas totales, procesadas y fallidas, mensaje de error, fecha de
  creación y de última actualización. NO DEBE exponer la ubicación interna del archivo.
- **FR-010**: Ante un identificador inexistente o mal formado, el sistema DEBE responder "no
  encontrado".

**Almacenamiento de archivos**

- **FR-011**: El almacenamiento DEBE guardar un contenido y devolver su ubicación, y DEBE
  devolver exactamente el mismo contenido cuando se lo pide por esa ubicación.

**Mensajería**

- **FR-012**: Un aviso publicado DEBE quedar disponible para un proceso distinto del que lo
  publicó y DEBE sobrevivir al reinicio de cualquiera de los dos.
- **FR-013**: Pedir un aviso DEBE entregar un aviso disponible, en orden aproximado de
  publicación (el más antiguo primero, sin garantía estricta), o ninguno si no hay. El
  emulador local entrega en orden; la cola en la nube solo lo garantiza aproximadamente.
- **FR-014**: Un aviso entregado DEBE quedar oculto durante un tiempo configurable. Mientras
  esté oculto NO DEBE entregarse a ningún consumidor.
- **FR-015**: Un aviso entregado y no confirmado DEBE volver a estar disponible al vencer ese
  tiempo (entrega "al menos una vez").
- **FR-016**: Cada entrega DEBE incrementar un contador de entregas del aviso, y el aviso
  entregado DEBE informar ese contador.
- **FR-017**: Confirmar un aviso DEBE eliminarlo definitivamente. Confirmar uno ya eliminado
  NO DEBE ser un error.
- **FR-018**: Varios consumidores simultáneos NO DEBEN recibir el mismo aviso mientras está
  oculto. En la cola de la nube, la entrega es "al menos una vez" y excepcionalmente puede
  repetirse; lo que protege de verdad es que procesar dos veces dé el mismo resultado
  (spec 002).

**Proveedores**

- **FR-019**: La lógica de subida y la de procesamiento DEBEN depender solo de tres contratos
  (guardar y leer archivos, publicar avisos, consumir avisos), nunca de un proveedor concreto.
- **FR-020**: El almacenamiento y la mensajería DEBEN configurarse por entorno: dirección del
  servicio, región, credenciales, nombre del contenedor de archivos y de la cola. Pasar del
  emulador local a la nube real DEBE requerir solo cambiar esos valores, sin cambios de
  código.
- **FR-021**: DEBE existir un emulador local de los dos servicios que funcione sin cuenta en
  la nube, que se levante con el mismo comando que la base y que deje creados el contenedor
  de archivos y la cola. Es la configuración por defecto.
- **FR-022**: Las credenciales reales NUNCA DEBEN estar en el repositorio. Si falta un valor
  obligatorio de configuración, el servicio NO DEBE arrancar, y el error DEBE nombrar lo que
  falta sin mostrar secretos.

**Duplicados (opcional, US5)**

- **FR-025**: Si una subida trae una clave de idempotencia que ya tiene un upload asociado, el
  sistema DEBE responder con ese upload sin guardar otro archivo ni publicar otro aviso. Dos
  subidas simultáneas con la misma clave DEBEN dejar un solo upload. Sin clave, cada subida
  crea un upload nuevo.

**Errores y calidad**

- **FR-023**: Si el almacenamiento, la base o la cola fallan durante una subida o una
  consulta, el sistema DEBE responder con un error interno sin detalles técnicos, como define
  el spec 001.
- **FR-024**: La lógica de subida y de consulta DEBE tener tests escritos antes que su
  implementación, usando dobles de los tres contratos. Las implementaciones del
  almacenamiento y de la cola DEBEN tener tests de integración contra el emulador local.

### Key Entities

- **Upload**: definido en el spec 002. Este spec lo crea en PENDING y lo lee.
- **Archivo guardado**: el contenido original de un CSV, identificado por una ubicación que
  devuelve el almacenamiento. Se conserva después de procesar.
- **Aviso de procesamiento**: el mensaje que viaja por la cola. Lleva solo el identificador
  del upload. Atributos propios de la cola: momento de publicación, momento hasta el que está
  oculto y contador de entregas.
- **Clave de idempotencia** (opcional, US5): un valor que manda el cliente por intento de
  subida y que queda asociado a un único upload.
- **Comprobante de subida**: lo que recibe quien sube. Identificador, estado, nombre del
  archivo y fecha de creación.
- **Proveedor**: una implementación concreta de un contrato. En este spec hay una por
  contrato, que habla con el servicio de la nube; la configuración decide si ese servicio es
  el emulador local o la nube real. En los tests de la lógica se usan dobles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: subir un CSV de 1 MB responde en menos de 1 segundo en el entorno de desarrollo,
  sin esperar ningún procesamiento.
- **SC-002**: el 100 % de las subidas aceptadas dejan exactamente 1 archivo guardado idéntico
  byte a byte al enviado, 1 upload en PENDING y 1 aviso con su identificador.
- **SC-003**: el 100 % de las subidas rechazadas dejan 0 archivos, 0 uploads y 0 avisos.
- **SC-003a**: el 100 % de los archivos con un encabezado distinto del esperado se rechazan
  en la subida, y el 100 % de los archivos con el encabezado correcto se aceptan aunque sus
  filas tengan datos inválidos.
- **SC-004**: consultar un upload responde en menos de 1 segundo, y el 100 % de las consultas
  con un identificador inexistente responden "no encontrado" sin error interno.
- **SC-005**: con 20 consumidores simultáneos y 5 avisos, se entregan exactamente 5 avisos
  distintos: ninguno se entrega dos veces mientras está oculto (verificado contra el emulador
  local; ver FR-018 para la nube).
- **SC-006**: un aviso no confirmado vuelve a entregarse después del tiempo de ocultamiento,
  con el contador de entregas incrementado en 1.
- **SC-007**: pasar del emulador local a la nube real requiere 0 cambios de código: solo
  cambian los valores de configuración documentados.
- **SC-007a**: una persona que clona el repositorio levanta la base, el almacenamiento y la
  cola con 1 comando, sin cuenta en la nube.
- **SC-008**: todos los tests del spec pasan y ninguno está salteado.

## Assumptions

- No hay autenticación: todo upload pertenece a `user-123` (constitución, restricciones).
- La regla de nombre de archivo es la del spec 002. Las reglas de estado son las del spec 002
  más la transición PENDING → FAILED (FR-008b).
- El tamaño máximo de 10 MB es un valor razonable para CSV de datos de actividad y no viene de
  la consigna. Los archivos se manejan completos en memoria durante la subida.
- El archivo original se conserva después de procesar (CLAUDE.md, decisiones tomadas). No hay
  borrado de archivos en este spec.
- Leer y validar las filas de datos del CSV es del spec 004. La subida solo revisa el
  encabezado (FR-003), y esa regla la reutiliza el spec 004. Consumir los avisos y procesar es del
  spec 005, que también decide el máximo de entregas y qué hacer con un aviso que falla
  siempre. Los listados y los resultados son del spec 006. El frontend y lo que necesite para
  llamar a la API desde otro origen son del spec 007.
- La clave de idempotencia (US5, FR-025) es opcional y va al final del spec. Si no se llega,
  se documenta como limitación conocida, con el diseño de US5 como solución.
- Conectar la cuenta real de la nube (US4) se verifica cuando el autor la tenga enlazada. Este
  spec deja el sistema listo para hacerlo con solo configuración y lo verifica contra el
  emulador local.
