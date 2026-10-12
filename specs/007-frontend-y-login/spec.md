# Feature Specification: Frontend y login

**Feature Branch**: `007-frontend-y-login`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "El último spec: el frontend de la consigna (dashboard, lista,
subida y detalle con polling) y, a pedido del autor, login con JWT para que cada persona vea y
procese solo sus uploads. El frontend es sencillo y funcional, para probar todo a mano; el
diseño visual llega después, con imágenes."

## Clarifications

### Session 2026-10-11

- Q: ¿Por qué login, si la consigna dice que no hace falta? → A: Lo pidió el autor: las
  funciones que dicen "del usuario" (la lista, el dashboard) tienen que ser de un usuario real y
  no de `user-123`. Reemplaza la decisión "sin autenticación" de los specs anteriores.
- Q: ¿Cómo se registra un usuario? → A: Con email y contraseña (mínimo 8 caracteres). El email
  no se repite. Iniciar sesión devuelve un token que vence a la hora.
- Q: ¿Qué pasa si alguien pide un upload ajeno? → A: "No encontrado", igual que uno inexistente:
  no se confirma que exista.
- Q: ¿Cómo se ve? → A: Sencillo y funcional, con los colores de estado que pide la consigna. El
  diseño final lo manda el autor después; este spec no lo cubre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrarse e iniciar sesión (Priority: P1)

Una persona crea su cuenta con email y contraseña, inicia sesión y queda dentro de la
aplicación hasta cerrar sesión o hasta que vence el token.

**Why this priority**: sin sesión no se puede usar ninguna otra pantalla.

**Acceptance Scenarios**:

1. **Given** un email nuevo y una contraseña de 8 o más caracteres, **When** se registra,
   **Then** la cuenta queda creada.
2. **Given** un email ya registrado, **When** se registra de nuevo, **Then** un error dice que
   ya existe.
3. **Given** un email inválido o una contraseña corta, **When** se registra, **Then** un error de
   validación dice qué corregir.
4. **Given** una cuenta, **When** inicia sesión con la contraseña correcta, **Then** recibe un
   token; con una incorrecta, un error que no dice cuál de los dos datos falló.
5. **Given** una pantalla de la aplicación sin sesión o con el token vencido, **When** se abre,
   **Then** lleva al inicio de sesión.

---

### User Story 2 - Cada persona ve solo lo suyo (Priority: P1)

**Acceptance Scenarios**:

1. **Given** una petición a cualquier endpoint de uploads sin token o con un token inválido,
   **When** llega, **Then** responde "no autorizado".
2. **Given** dos personas con uploads, **When** cada una pide su lista, su dashboard, un detalle,
   los resultados o los errores, **Then** solo ve lo suyo; lo ajeno responde "no encontrado".
3. **Given** una persona sube un archivo, **When** se guarda, **Then** el upload queda a su nombre.

---

### User Story 3 - Usar la aplicación de punta a punta (Priority: P1)

**Acceptance Scenarios**:

1. **Dashboard (`/`)**: muestra total, completados, en proceso y fallidos, y un enlace para subir.
2. **Subida (`/uploads/new`)**: selector o arrastrar y soltar; solo acepta `.csv`; muestra el
   avance mientras sube y al terminar lleva al detalle.
3. **Lista (`/uploads`)**: tabla con nombre, estado (badge amarillo PENDING, azul PROCESSING,
   verde COMPLETED, rojo FAILED), fecha, filas procesadas y enlace al detalle; 10 por página.
4. **Detalle (`/uploads/:id`)**: nombre, fecha y estado; se actualiza solo cada 3 segundos
   mientras no termina; barra de progreso mientras procesa; si COMPLETED, la tabla de datos y los
   errores por fila; si FAILED, el mensaje de error; botón para volver a la lista.

### Edge Cases

- El token vence con la aplicación abierta: el siguiente pedido lleva al inicio de sesión.
- Una persona escribe a mano la dirección del detalle de un upload ajeno: "no encontrado".
- Los uploads creados antes de este spec quedan a nombre de `user-123`, que no es un usuario
  real: nadie los ve.

## Requirements *(mandatory)*

- **FR-001**: Registro (`POST /api/v1/auth/register`) con email válido único y contraseña de 8 a
  72 caracteres, guardada con un hash con sal (nunca en texto plano).
- **FR-002**: Inicio de sesión (`POST /api/v1/auth/login`) que devuelve un token firmado que
  vence en 1 hora (configurable); credenciales incorrectas responden "no autorizado" sin decir
  cuál falló.
- **FR-003**: Todos los endpoints de uploads MUST exigir el token y usar el usuario del token.
- **FR-004**: Un upload ajeno MUST responder igual que uno inexistente.
- **FR-005**: `GET /api/v1/uploads/summary` MUST devolver `{ total, pending, processing,
  completed, failed }` del usuario.
- **FR-006**: El frontend MUST cubrir las cuatro pantallas de la consigna más inicio de sesión,
  registro y cerrar sesión.
- **FR-007**: El detalle MUST consultar cada 3 segundos mientras el estado no sea final, y dejar
  de hacerlo cuando lo es.
- **FR-008**: El backend MUST tener pruebas automáticas del registro, el inicio de sesión, la
  protección de rutas y la separación entre usuarios.

## Success Criteria *(mandatory)*

- **SC-001**: Una persona nueva se registra, inicia sesión, sube un CSV y ve sus resultados sin
  usar la terminal.
- **SC-002**: Ninguna petición sin token válido obtiene datos de uploads.
- **SC-003**: Ninguna persona ve datos de otra.
- **SC-004**: El backend sigue con todas sus pruebas en verde y el frontend compila sin errores.

## Assumptions

- El token se guarda en el navegador (almacenamiento local) y viaja en el encabezado
  `Authorization`. Para una aplicación de prueba alcanza; en producción convendría una cookie
  `httpOnly`.
- No hay recuperación de contraseña ni renovación del token: al vencer, se inicia sesión de nuevo.
- El frontend corre en el puerto 3001 y reenvía `/api` al backend, así no hace falta CORS.
