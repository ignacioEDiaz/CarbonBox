# Feature Specification: Base del proyecto

**Feature Branch**: `001-base-del-proyecto`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Base del proyecto: dejar el entorno de desarrollo listo para construir
el sistema de procesamiento de documentos. Base de datos que se levanta con un solo comando y
conserva los datos; servicio backend con chequeo de salud que informa si el servicio y la base
responden; configuración por entorno con archivo de ejemplo y error claro si falta un valor;
piezas compartidas (resultado éxito/error sin excepciones, contratos de commands y queries, base
para controllers, manejador central de errores, contenedor de dependencias). Fuera de alcance:
entidades de negocio, tablas, endpoints de uploads, cola, worker y frontend."

## User Scenarios & Testing *(mandatory)*

> En este spec el "usuario" es quien desarrolla el sistema (y quien evalúa la prueba al
> clonarlo). El valor que se entrega es un entorno que arranca, se puede verificar y sirve de
> base para los specs siguientes.

### User Story 1 - Levantar el entorno y verificar que está sano (Priority: P1)

Quien desarrolla clona el repositorio, levanta la base de datos con un solo comando, arranca el
servicio backend y consulta el chequeo de salud. La respuesta le dice si el servicio está vivo
y si la base de datos responde.

**Why this priority**: sin una base de datos y un servicio que se conecten, no se puede
construir ni probar nada de lo que sigue (dominio, subida, worker, consultas). Es también lo
primero que hace un evaluador al recibir la prueba.

**Independent Test**: con un clon limpio, seguir los pasos documentados, consultar el chequeo
de salud y comprobar que informa servicio y base disponibles. Después apagar la base y volver
a consultarlo.

**Acceptance Scenarios**:

1. **Given** la base de datos levantada y el servicio arrancado, **When** se consulta el
   chequeo de salud, **Then** responde con éxito e informa que el servicio y la base están
   disponibles.
2. **Given** el servicio arrancado y la base de datos apagada, **When** se consulta el chequeo
   de salud, **Then** responde con una señal de falla, distinguible de una respuesta sana, que
   informa que la base no está disponible, y el servicio sigue funcionando.
3. **Given** la base de datos estuvo apagada y se vuelve a levantar, **When** se consulta otra
   vez el chequeo de salud, **Then** informa la base disponible sin reiniciar el servicio.
4. **Given** la base de datos tiene datos guardados, **When** se detiene y se vuelve a
   levantar, **Then** los datos siguen estando.

---

### User Story 2 - Configurar el servicio por entorno (Priority: P2)

Quien desarrolla configura los datos de conexión a la base y el puerto del servicio en el
entorno, sin tocar código, partiendo de un archivo de ejemplo versionado. Si falta un valor
obligatorio o tiene un formato inválido, el servicio no arranca y dice exactamente qué valor
falta o está mal.

**Why this priority**: evita que se suban credenciales al repositorio y que un error de
configuración aparezca recién en tiempo de ejecución como una falla confusa. Depende de que
exista el servicio (P1).

**Independent Test**: copiar el archivo de ejemplo, arrancar el servicio y verificar que
funciona. Después borrar o corromper un valor obligatorio y verificar que el arranque falla
con un mensaje que nombra ese valor.

**Acceptance Scenarios**:

1. **Given** una configuración copiada del archivo de ejemplo sin cambios, **When** se arranca
   el servicio en el entorno local, **Then** arranca y se conecta a la base.
2. **Given** falta un valor obligatorio, **When** se arranca el servicio, **Then** no arranca y
   el mensaje nombra el valor faltante.
3. **Given** un valor con formato inválido (por ejemplo, un puerto que no es un número),
   **When** se arranca el servicio, **Then** no arranca y el mensaje nombra el valor y el
   formato esperado.

---

### User Story 3 - Piezas compartidas para los specs siguientes (Priority: P3)

Quien desarrolla los próximos specs cuenta con piezas comunes: una forma de representar el
resultado de una operación como éxito o error sin lanzar excepciones, contratos para
manejadores de escritura (commands) y de lectura (queries), una base común para controllers,
un manejador central que convierte cualquier error en una respuesta con formato consistente, y
un registro de dependencias donde se dan de alta las piezas del sistema.

**Why this priority**: no entrega valor visible por sí sola, pero todos los specs siguientes
la usan, y define cómo se manejan los errores en todo el sistema. Se puede verificar con tests
unitarios sin base de datos.

**Independent Test**: correr los tests unitarios de las piezas compartidas y verificar que
pasan. Pedir una ruta inexistente al servicio y verificar que el error tiene el formato
consistente.

**Acceptance Scenarios**:

1. **Given** una operación que termina bien, **When** devuelve su resultado, **Then** el
   resultado indica éxito y da acceso al valor.
2. **Given** una operación que falla de forma esperable, **When** devuelve su resultado,
   **Then** el resultado indica error y da acceso al error, sin que se lance una excepción.
3. **Given** un error de validación, uno de recurso no encontrado y uno inesperado, **When**
   llegan al manejador central, **Then** cada uno se convierte en una respuesta con la misma
   estructura, con un código de estado acorde a su tipo.
4. **Given** un error inesperado, **When** se responde al cliente, **Then** la respuesta no
   expone detalles internos (trazas, consultas, credenciales), y el detalle queda registrado
   en el log del servicio.
5. **Given** una pieza registrada en el registro de dependencias, **When** otra pieza la
   necesita, **Then** la recibe por su constructor sin crearla ella misma.

---

### Edge Cases

- El servicio arranca antes de que la base esté lista: el servicio arranca igual, el chequeo
  de salud informa la base no disponible y se recupera solo cuando la base aparece.
- El puerto configurado ya está ocupado: el servicio no arranca y el mensaje indica el puerto
  en conflicto.
- Se consulta una ruta que no existe: la respuesta usa el mismo formato de error que el resto
  del sistema.
- El chequeo de salud no debe quedarse colgado si la base no contesta: responde con la base no
  disponible en un tiempo acotado.
- Se detiene la base y se vuelve a levantar varias veces: los datos se conservan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La base de datos DEBE poder levantarse y detenerse con un solo comando
  documentado.
- **FR-002**: La base de datos DEBE conservar sus datos entre reinicios.
- **FR-003**: El servicio backend DEBE exponer un chequeo de salud que informe por separado el
  estado del servicio y el de la base de datos.
- **FR-004**: El chequeo de salud DEBE responder con una señal de falla, distinguible de la de
  éxito, cuando la base no está disponible, y DEBE responder en un tiempo acotado aunque la
  base no conteste.
- **FR-005**: El servicio NO DEBE caerse cuando la base deja de estar disponible, y DEBE
  volver a reportarla disponible cuando se recupere, sin reiniciarse.
- **FR-006**: Los datos de conexión a la base y el puerto del servicio DEBEN leerse del
  entorno, no del código.
- **FR-007**: El repositorio DEBE incluir un archivo de configuración de ejemplo, con todos los
  valores necesarios y sin secretos reales. El archivo con la configuración real NO DEBE
  versionarse.
- **FR-008**: Si falta un valor obligatorio de configuración o tiene formato inválido, el
  servicio NO DEBE arrancar y DEBE informar qué valor es y qué se esperaba.
- **FR-009**: El sistema DEBE ofrecer un tipo de resultado que represente éxito (con su valor)
  o error (con su causa), para que las operaciones informen fallas esperables sin lanzar
  excepciones.
- **FR-010**: El sistema DEBE definir contratos separados para manejadores de escritura
  (commands) y de lectura (queries), y ambos DEBEN devolver el tipo de resultado de FR-009.
- **FR-011**: El sistema DEBE ofrecer una base común para controllers que traduzca un
  resultado de éxito en una respuesta exitosa y un resultado de error en un error para el
  manejador central, sin que cada controller maneje errores por su cuenta.
- **FR-012**: El sistema DEBE tener un único manejador central de errores que convierta todo
  error en una respuesta con estructura consistente (tipo de error y mensaje legible) y un
  código de estado acorde: validación → solicitud inválida, no encontrado → recurso
  inexistente, cualquier otro → error interno.
- **FR-013**: Las respuestas de error inesperado NO DEBEN exponer detalles internos al
  cliente, y DEBEN registrar el detalle completo en el log del servicio.
- **FR-014**: El sistema DEBE tener un registro de dependencias donde se dan de alta las
  piezas, y las piezas DEBEN recibir sus dependencias por constructor.
- **FR-015**: Las piezas compartidas (FR-009 a FR-012) DEBEN estar cubiertas por tests
  unitarios escritos antes que su implementación, y los tests DEBEN pasar.
- **FR-016**: Los pasos para levantar el entorno DEBEN estar documentados en el README.

### Key Entities

- **Resultado**: representa el desenlace de una operación. Es éxito (con un valor) o error
  (con una causa), nunca las dos cosas a la vez.
- **Error de aplicación**: un error esperable con un tipo (validación, no encontrado,
  inesperado) y un mensaje legible. Su tipo determina cómo se responde al cliente.
- **Estado de salud**: el estado del servicio y el de la base de datos, cada uno disponible o
  no disponible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde un clon limpio, una persona que sigue el README tiene la base y el servicio
  funcionando, con el chequeo de salud en verde, en menos de 10 minutos y con no más de 4
  comandos.
- **SC-002**: El chequeo de salud responde en menos de 1 segundo con la base disponible y en
  menos de 5 segundos con la base caída.
- **SC-003**: El 100 % de los datos guardados en la base siguen disponibles después de detener
  y volver a levantar la base.
- **SC-004**: En el 100 % de los casos de configuración faltante o inválida, el mensaje de
  arranque nombra el valor afectado.
- **SC-005**: El 100 % de las respuestas de error del servicio, incluidas las de rutas
  inexistentes, tienen la misma estructura.
- **SC-006**: Todos los tests unitarios de las piezas compartidas pasan, y ninguno está
  salteado.

## Assumptions

- El entorno de desarrollo es Windows con una herramienta de contenedores instalada (Docker
  Desktop). Solo la base de datos corre en contenedor; el servicio corre en la máquina.
- El chequeo de salud es público: el sistema no tiene autenticación en esta prueba.
- La configuración obligatoria de este spec es la conexión a la base y el puerto del servicio.
  Los valores para la cola y el almacenamiento de archivos se agregan en los specs que los
  usan.
- Los valores de ejemplo (usuario y contraseña de la base local) son solo para desarrollo y no
  se consideran secretos.
- En este spec no se crean tablas ni datos de negocio. Para verificar FR-002 alcanza con
  cualquier dato de prueba.
- Las piezas compartidas se usan recién a partir del spec 002. En este spec se validan con
  tests unitarios y con el chequeo de salud y el manejo de rutas inexistentes.
