# Feature Specification: Parseo y validación del CSV

**Feature Branch**: `004-parseo-y-validacion`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Convertir el contenido crudo de un CSV subido en filas de datos de
actividad válidas y separar las filas con problemas, indicando en qué línea está cada problema y
por qué. Solo la pieza de parseo y validación, con tests; no lee la cola, no cambia el estado del
upload ni guarda nada (eso es el spec 005). Problemas de archivo entero: no es texto UTF-8, el
encabezado no es `category,amount,unit,date` o no hay filas de datos. Problemas por fila: no
tiene 4 columnas, category o unit vacías, amount que no es un número positivo, fecha que no es
YYYY-MM-DD o no existe. Se reutilizan las reglas que ya existen (encabezado del 003, fila del
002). Fuera de alcance: qué estado toma un upload si todas las filas son inválidas y dónde se
guardan o muestran los errores por fila (spec 005)."

## Clarifications

### Session 2026-10-11

- Q: ¿Cómo se separan las columnas de cada fila? → A: Siguiendo el estándar del formato CSV: un
  valor entre comillas puede contener comas (`"Oficina, piso 2"`) y comillas escritas dobles
  (`"Sala ""A"""`), y los saltos de línea pueden ser de Windows o de Unix. Se usa una biblioteca
  probada que ya implementa el estándar, envuelta detrás de un contrato propio. Se descartó
  separar por comas a mano: es más corto, pero marca como inválida una fila correcta que tenga
  una coma entre comillas.
- Q: ¿Qué formatos de cantidad (`amount`) se aceptan? → A: Formato estricto: solo dígitos, con
  un punto decimal opcional seguido de dígitos (`1200`, `12.5`, `0.75`). Se rechazan la coma
  decimal (`12,5`), los separadores de miles (`1.200,50`, `1,200`), la notación científica
  (`1e3`), los números hexadecimales (`0x10`), los signos (`+5`, `-5`), el texto mezclado
  (`12kg`) y el valor vacío. La coma decimal se descartó porque `1,200` es ambiguo (¿mil
  doscientos o uno coma dos?) y porque en un CSV la coma ya separa columnas.
- Q: ¿Este spec decide qué le pasa al upload? → A: No. Esta pieza solo lee y clasifica:
  devuelve las filas válidas, los errores y los totales, o un error de archivo. Cambiar el
  estado del upload, guardar las filas y decidir qué hacer si todas las filas son inválidas es
  trabajo del spec 005.

## User Scenarios & Testing *(mandatory)*

Quien usa esta pieza es el procesamiento del spec 005: le entrega el contenido de un archivo
subido y recibe el resultado. Al final, quien se beneficia es la persona que subió el CSV:
termina viendo cuántas filas se cargaron y, de las que no, en qué línea está el problema y qué
tiene que corregir.

### User Story 1 - Separar las filas válidas de las inválidas, con línea y motivo (Priority: P1)

El procesamiento entrega el contenido de un CSV con encabezado correcto y el identificador del
upload. La pieza recorre cada fila de datos y la clasifica: si cumple todas las reglas, pasa a
la lista de filas válidas, asociada a ese upload; si no, pasa a la lista de errores con el
número de línea del archivo y el motivo. Devuelve las dos listas y el total de filas de datos.

**Why this priority**: es el corazón del procesamiento. Sin esto no hay datos para guardar ni
resultados para mostrar, y es el criterio de "listo" del spec: un CSV con filas rotas devuelve
válidas y errores por separado.

**Independent Test**: entregar un CSV con filas buenas y malas mezcladas y comprobar qué filas
quedaron en cada lista, el número de línea y el motivo de cada error, y que los totales cierran.

**Acceptance Scenarios**:

1. **Given** un CSV con encabezado y tres filas correctas, **When** se procesa, **Then** hay
   tres filas válidas con sus valores (categoría, cantidad como número, unidad y fecha),
   asociadas al upload, ninguna fila con error y el total es 3.
2. **Given** un CSV donde la línea 3 tiene la categoría vacía, **When** se procesa, **Then** la
   línea 3 aparece en los errores con un motivo que dice que la categoría no puede estar vacía,
   y el resto de las filas sigue su curso.
3. **Given** filas con la unidad vacía, con cantidad `0`, `-5`, `abc`, `12,5`, `1e3` o vacía,
   **When** se procesa, **Then** cada una aparece en los errores con su línea y un motivo que
   explica qué está mal.
4. **Given** filas con fecha `2024-02-31`, `2024-13-01`, `31/01/2024`, `2024-1-5` o vacía,
   **When** se procesa, **Then** cada una aparece en los errores con su línea y un motivo que
   menciona la fecha recibida y el formato esperado.
5. **Given** una fila con 3 columnas y otra con 5, **When** se procesa, **Then** las dos
   aparecen en los errores con un motivo que dice cuántas columnas se esperaban y cuántas
   llegaron.
6. **Given** una fila con varios problemas a la vez (categoría vacía y fecha inválida), **When**
   se procesa, **Then** aparece una sola vez en los errores, con un único motivo.
7. **Given** una fila con espacios alrededor de los valores (` Electricidad , 12.5 , kWh ,
   2024-03-01 `), **When** se procesa, **Then** es válida y los valores se guardan sin esos
   espacios.
8. **Given** cualquier CSV que se pudo procesar, **When** se revisa el resultado, **Then** la
   cantidad de filas válidas más la cantidad de filas con error es igual al total de filas de
   datos.
9. **Given** el mismo contenido procesado dos veces, **When** se comparan los resultados,
   **Then** tienen las mismas filas válidas (mismos valores), los mismos errores y el mismo
   total.

---

### User Story 2 - Rechazar un archivo que no se puede procesar (Priority: P2)

Si el problema no es de una fila sino del archivo entero, la pieza no intenta clasificar filas:
devuelve un único error de validación que explica qué tiene el archivo, y ninguna fila.

**Why this priority**: evita resultados engañosos (por ejemplo, "0 válidas, 5000 con error"
porque el archivo usaba punto y coma o tenía otro encabezado) y le da al procesamiento un motivo
claro para marcar el upload como fallido. Va después de US1 porque es el camino excepcional.

**Independent Test**: entregar un archivo con otro encabezado, uno sin filas de datos y uno que
no es texto, y comprobar que en los tres casos llega un error de archivo con un mensaje claro y
ninguna fila.

**Acceptance Scenarios**:

1. **Given** un archivo cuya primera línea no es `category,amount,unit,date` (otro orden, una
   columna de más o de menos, separado por punto y coma, o directamente una fila de datos),
   **When** se procesa, **Then** devuelve un error de archivo que dice qué encabezado se
   esperaba y cuál llegó, con la misma regla y el mismo mensaje que usa la subida (spec 003).
2. **Given** un encabezado escrito `Category, Amount ,UNIT,date`, con salto de línea de Windows
   o precedido por la marca invisible BOM, **When** se procesa, **Then** se acepta igual que en
   la subida.
3. **Given** un archivo que solo tiene el encabezado, o el encabezado y líneas vacías, **When**
   se procesa, **Then** devuelve un error de archivo que dice que no tiene filas de datos.
4. **Given** un archivo que no es texto UTF-8 válido (por ejemplo, guardado con otra
   codificación o un binario renombrado), **When** se procesa, **Then** devuelve un error de
   archivo que pide guardarlo como CSV UTF-8.
5. **Given** un archivo con un valor entre comillas que nunca se cierra, **When** se procesa,
   **Then** devuelve un error de archivo que indica la línea donde empieza ese valor.
6. **Given** cualquiera de los casos anteriores, **When** se revisa el resultado, **Then** no
   trae ninguna fila válida ni errores por fila: solo el error de archivo.

---

### User Story 3 - Leer el CSV según el estándar (Priority: P3)

Los archivos llegan de planillas y de otros sistemas, con distintas formas de escribir el mismo
contenido. La pieza las lee todas igual: valores entre comillas que contienen comas o comillas,
saltos de línea de Windows o de Unix, y líneas vacías en el medio o al final.

**Why this priority**: sin esto, filas correctas se marcarían como inválidas según con qué
programa se exportó el archivo. Va última porque los casos comunes (US1) funcionan sin comillas.

**Independent Test**: entregar el mismo conjunto de filas escrito de varias formas (con y sin
comillas, `\n` y `\r\n`, con líneas vacías) y comprobar que el resultado es idéntico.

**Acceptance Scenarios**:

1. **Given** una fila con la categoría `"Oficina, piso 2"` entre comillas, **When** se procesa,
   **Then** es válida y la categoría es `Oficina, piso 2` (4 columnas, no 5).
2. **Given** una fila con la categoría `"Sala ""A"""`, **When** se procesa, **Then** es válida y
   la categoría es `Sala "A"`.
3. **Given** el mismo contenido con saltos de línea de Windows y de Unix, **When** se procesa,
   **Then** los dos resultados son iguales.
4. **Given** líneas vacías entre filas y un salto de línea al final del archivo, **When** se
   procesa, **Then** se ignoran: no cuentan como filas ni como errores, y los números de línea
   de los errores siguen coincidiendo con la línea real del archivo.

### Edge Cases

- **Línea con solo espacios**: se trata como línea vacía y se ignora.
- **Línea con cuatro valores vacíos** (`,,,`): es una fila; tiene 4 columnas, así que se valida y
  sale como error (categoría vacía).
- **Valor entre comillas que ocupa varias líneas**: el estándar lo permite. La fila cuenta una
  vez, y si tiene error se informa la línea donde empieza.
- **Cantidad con ceros a la izquierda** (`007`): es válida y vale 7. **Sin dígito antes o
  después del punto** (`.5`, `5.`): se rechaza por formato.
- **Cantidad muy grande pero escrita solo con dígitos**: se acepta mientras sea un número
  representable; el formato estricto ya descarta las formas exóticas.
- **Filas repetidas**: las dos son válidas; esta pieza no descarta duplicados (dos consumos
  iguales en el mismo día pueden ser reales).
- **Archivo de 10 MB** (el máximo de la subida), con cientos de miles de filas: se procesa
  entero, sin cortar la lista de errores. Cuántos errores se guardan o muestran lo decide el 005.
- **Todas las filas inválidas**: no es un error de archivo; el resultado trae 0 válidas y todos
  los errores. Qué estado toma el upload lo decide el 005.
- **Archivo separado por punto y coma** (Excel en español): falla el encabezado y sale como error
  de archivo, con un mensaje que muestra lo que llegó.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La pieza MUST recibir el contenido crudo de un archivo y el identificador del upload
  al que pertenece, y no depender de dónde está guardado el archivo ni de la cola.
- **FR-002**: MUST rechazar con un error de archivo, sin devolver filas, el contenido que no sea
  texto UTF-8 válido, con un mensaje que pida guardarlo como CSV UTF-8.
- **FR-003**: MUST validar el encabezado con la misma regla de la subida (spec 003), sin
  duplicarla: misma tolerancia a mayúsculas, espacios alrededor de cada nombre, salto de línea de
  Windows y marca BOM, y mismo mensaje de error.
- **FR-004**: MUST separar las columnas según el estándar CSV: valores entre comillas con comas,
  comillas escritas dobles y saltos de línea de Windows o de Unix.
- **FR-005**: MUST ignorar las líneas vacías o con solo espacios, en cualquier lugar del archivo;
  no cuentan como filas ni como errores.
- **FR-006**: MUST devolver un error de archivo si después del encabezado no queda ninguna fila de
  datos.
- **FR-007**: MUST devolver un error de archivo, indicando la línea, si un valor entre comillas
  nunca se cierra.
- **FR-008**: Cada fila con una cantidad de columnas distinta de 4 MUST registrarse como error con
  un motivo que diga cuántas columnas se esperaban y cuántas llegaron.
- **FR-009**: La cantidad MUST aceptarse solo en formato estricto (dígitos y un punto decimal
  opcional seguido de dígitos); cualquier otro formato es un error de la fila con un motivo que
  muestre el valor recibido.
- **FR-010**: Las reglas de la fila (categoría y unidad no vacías, cantidad mayor que cero, fecha
  `YYYY-MM-DD` que exista en el calendario) MUST ser las mismas que ya aplica la entidad de dato
  de actividad (spec 002), sin duplicarlas.
- **FR-011**: Los espacios alrededor de cada valor MUST descartarse antes de validar.
- **FR-012**: Cada error de fila MUST indicar el número de línea del archivo donde empieza la fila
  (el encabezado es la línea 1, y las líneas vacías también cuentan) y un único motivo en
  español.
- **FR-013**: Cada fila válida MUST quedar asociada al upload recibido y tener sus valores ya
  convertidos (la cantidad como número).
- **FR-014**: El resultado de un archivo procesable MUST incluir las filas válidas, los errores
  por fila y el total de filas de datos, con válidas + errores = total.
- **FR-015**: Procesar el mismo contenido varias veces MUST dar el mismo resultado (mismos valores
  válidos, mismos errores y mismo total).
- **FR-016**: Los errores esperables (de archivo o de fila) MUST devolverse como resultado, nunca
  como una falla inesperada del proceso.
- **FR-017**: MUST procesar un archivo del tamaño máximo de subida (10 MB) completo.
- **FR-018**: El comportamiento MUST quedar cubierto por pruebas automáticas que no necesiten la
  base de datos, el almacenamiento de archivos ni la cola.

### Key Entities

- **Resultado del parseo**: lo que devuelve la pieza cuando el archivo es procesable. Tiene las
  filas válidas, los errores por fila y el total de filas de datos.
- **Fila válida**: un dato de actividad (categoría, cantidad, unidad, fecha) asociado al upload.
  Es la entidad que ya existe desde el spec 002.
- **Error de fila**: número de línea del archivo y motivo. No es un error del sistema: es
  información para la persona que subió el archivo.
- **Error de archivo**: un único motivo que impide procesar el archivo entero (codificación,
  encabezado, sin filas, comillas sin cerrar).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de los archivos procesables, cada fila de datos aparece exactamente una
  vez: como válida o como error (válidas + errores = total).
- **SC-002**: En el 100% de los errores de fila, el número de línea informado coincide con la
  línea que muestra un editor de texto o una planilla al abrir el archivo, y el motivo dice qué
  valor está mal.
- **SC-003**: Un archivo de 10 MB se procesa completo en menos de 10 segundos en la máquina de
  desarrollo.
- **SC-004**: El mismo contenido escrito con o sin comillas, con saltos de línea de Windows o de
  Unix y con o sin líneas vacías da el mismo resultado.
- **SC-005**: Los cinco problemas de archivo entero (codificación, encabezado, sin filas de datos,
  comillas sin cerrar y encabezado separado por punto y coma) devuelven un solo error claro y
  ninguna fila.
- **SC-006**: Todos los escenarios de aceptación de este spec tienen una prueba automática que
  corre sin servicios externos, y todas pasan.

## Assumptions

- La codificación admitida es UTF-8 (la opción "CSV UTF-8" de Excel). Otras codificaciones se
  rechazan con un mensaje claro en vez de mostrar caracteres rotos.
- El separador de columnas es la coma y el orden de las columnas es fijo
  (`category,amount,unit,date`), como ya decidió la subida en el spec 003.
- Una fila con varios problemas informa uno solo, el primero que encuentran las reglas de la
  entidad. Alcanza para que la persona corrija y vuelva a subir.
- La pieza devuelve todos los errores sin límite; cuántos se guardan o se muestran lo decide el
  spec 005.
- El identificador de cada fila válida se genera nuevo en cada procesamiento. "Mismo resultado"
  se refiere a los valores, no a esos identificadores; guardar las filas de un upload reemplaza
  las de un intento anterior (spec 002).
- Depende de la regla de encabezado del spec 003 y de la entidad de dato de actividad del spec
  002, que ya existen y se reutilizan.
- Fuera de alcance: leer de la cola, bajar el archivo del almacenamiento, cambiar el estado del
  upload, guardar filas y decidir qué pasa si todas las filas son inválidas (spec 005).
