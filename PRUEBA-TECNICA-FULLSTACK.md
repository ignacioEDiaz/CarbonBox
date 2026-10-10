# Prueba Técnica - Desarrollador Full Stack

## Información General

**Posición:** Desarrollador Full Stack
**Tiempo estimado:** 4 horas
**Modalidad:** Remota - **Se permite y fomenta el uso de herramientas de IA**

\---

## Sobre el Uso de Inteligencia Artificial

### ¿Por qué permitimos IA en esta prueba?



El objetivo NO es que memorices sintaxis o que ya sepas todo sobre cada tecnología. El objetivo es evaluar:

✅ **Tu capacidad de aprendizaje rápido**
✅ **Cómo usas herramientas modernas para ser productivo**
✅ **Tu criterio para validar y adaptar código generado**
✅ **Tu habilidad para integrar diferentes tecnologías**
✅ **Tu capacidad de resolver problemas complejos con ayuda**

### Herramientas de IA Permitidas y Recomendadas

* **Claude Code** (claude.ai/code) - Recomendado
* **GitHub Copilot**
* **ChatGPT**
* **Cursor AI**
* Cualquier otra herramienta de IA que te ayude

### Cómo Usar IA Efectivamente en esta Prueba

#### ✅ Usos Apropiados de IA

1. **Aprender sintaxis nueva:**

   * "¿Cómo configuro Prisma con PostgreSQL?"
   * "Muéstrame un ejemplo de Fastify route handler"
   * "¿Cómo se hace polling en React Query?"
2. **Generar código boilerplate:**

   * Estructura inicial de carpetas
   * Configuraciones de TypeScript/ESLint
   * Schemas de Prisma
   * Componentes base de React
3. **Resolver problemas específicos:**

   * "Tengo este error de TypeScript: \[error]. ¿Cómo lo soluciono?"/handler?
   * "¿Cómo parseo un CSV en Node.js?" //adaptare?
   * "¿Cómo implemento un worker que consuma mensajes?"/nose
4. **Entender patrones arquitectónicos:**

   * "Explícame el patrón Repository en TypeScript" /segregacion de interfaces e inyeccion de dependecias
   * "¿Cómo implemento CQRS con handlers?"/nose
   * "Dame un ejemplo de Either pattern para manejo de errores"/nose
5. **Debugging:**

   * "Mi query de Prisma falla con este error: \[error]"
   * "El polling no se detiene, ¿qué estoy haciendo mal?"

#### ❌ Usos Inapropiados de IA

1. **Copiar/pegar código sin entender:**

   * Si no puedes explicar qué hace el código, no lo uses
   * Tendrás que defender tus decisiones en la entrevista
2. **Dejar que la IA decida todo:**

   * La arquitectura debe tener tu criterio
   * Las decisiones técnicas deben estar justificadas por ti
3. **No validar el código generado:**

   * La IA puede generar código con errores o antipatrones
   * Debes revisar y adaptar según los requisitos

### Lo Que Valoramos en el Uso de IA

En la documentación final, valoraremos que expliques:

1. **¿Qué generaste con IA?**

   * "Usé Claude Code para generar la estructura inicial del backend"
   * "Copilot me ayudó con los schemas de Prisma"
2. **¿Qué modificaste o corregiste?**

   * "La IA generó el handler sin Either pattern, lo adapté manualmente"
   * "El código de parsing no validaba errores, agregué validaciones"
3. **¿Qué aprendiste en el proceso?**

   * "No conocía React Query, aprendí sobre staleTime y refetchInterval"
   * "Entendí cómo funciona el patrón Repository gracias a los ejemplos generados"
4. **¿Qué limitaciones encontraste?**

   * "La IA no entendía bien CQRS, tuve que investigar en la documentación"
   * "El código de SQS era muy básico, lo mejoré con retry logic"

\---

## Contexto del Proyecto

Bienvenido/a a la prueba técnica de CarbonBox. El objetivo es evaluar tus habilidades técnicas construyendo un **sistema completo de procesamiento asíncrono de documentos** que refleja nuestro stack tecnológico y patrones arquitectónicos.

**No necesitas ser experto en todas estas tecnologías.** Si tienes más experiencia en backend que frontend (o viceversa), **usa las herramientas de IA para nivelar las áreas donde tienes menos experiencia.**

### Lo Que Buscamos Evaluar

**Habilidades Técnicas:**

* Capacidad de trabajar con arquitecturas empresariales complejas
* Entendimiento de patrones de diseño (DDD, Clean Architecture, CQRS)
* Integración de múltiples servicios (Base de datos, colas, almacenamiento)
* Desarrollo full stack (aunque seas más fuerte en un área)

**Habilidades Blandas:**

* Capacidad de aprendizaje rápido
* Uso efectivo de herramientas modernas (IA, documentación, Stack Overflow)
* Resolución de problemas de forma autónoma
* Comunicación clara de decisiones técnicas

\---

## Descripción del Proyecto

### Sistema de Procesamiento Asíncrono de Documentos

Debes construir un sistema que permita a usuarios **subir archivos CSV con datos de actividad**, procesarlos de forma **asíncrona** usando colas de mensajes, y **visualizar los resultados** cuando el procesamiento termine.

### Flujo del Sistema

```
1. Usuario sube CSV desde el frontend
2. Backend guarda archivo en almacenamiento (S3 o local)
3. Backend encola mensaje para procesamiento asíncrono (SQS o mock)
4. Backend crea registro en base de datos (estado: PENDING)
5. Backend responde inmediatamente al frontend con ID de upload

\[PROCESAMIENTO ASÍNCRONO]
6. Worker consume mensaje de la cola
7. Worker descarga y procesa el archivo CSV
8. Worker valida datos y guarda registros en base de datos
9. Worker actualiza estado del upload (COMPLETED o FAILED)

\[CONSULTA DE RESULTADOS]
10. Frontend consulta periódicamente el estado
11. Cuando está completo, muestra los resultados procesados
```

\---

## Stack Tecnológico Requerido

### Backend

* **Runtime:** Node.js + TypeScript
* **Framework HTTP:** Fastify
* **ORM:** Prisma
* **Base de datos:** PostgreSQL (Docker local)
* **Arquitectura:** DDD + Clean Architecture + CQRS
* **Mensajería:** AWS SQS (puede usar LocalStack para desarrollo local o implementar un mock simple)
* **Almacenamiento:** AWS S3 (puede usar LocalStack o filesystem local)

### Frontend

* **Framework:** Next.js 14+ (App Router)
* **Lenguaje:** TypeScript
* **Manejo de Estado:** React Query (TanStack Query)
* **HTTP Client:** Axios
* **Estilos:** Tailwind CSS

### DevOps

* **Containerización:** Docker + Docker Compose
* **Variables de entorno:** Segregadas por ambiente

\---

## Guía Si nunca has trabajado con estas tecnologías



#### 1\. Divide el problema en partes pequeñas

**Usa IA para aprender cada pieza:**

```
Paso 1: "Claude, ¿cómo creo un proyecto básico de Fastify con TypeScript?"
Paso 2: "¿Cómo conecto Prisma a PostgreSQL?"
Paso 3: "Dame un ejemplo de un endpoint POST que reciba un archivo"
... y así sucesivamente
```

#### 2\. Empieza por lo más simple

**Orden recomendado de implementación:**

1. **Base de datos (30 min):**

   * Docker Compose con PostgreSQL
   * Schema de Prisma
   * Migración inicial
   * **Ayuda de IA:** "¿Cómo configuro Prisma con PostgreSQL en Docker?"
2. **Backend básico (1 hora):**

   * Setup de Fastify
   * Endpoint POST /uploads (sin procesamiento aún)
   * Endpoint GET /uploads/:id
   * **Ayuda de IA:** "Muéstrame un CRUD básico con Fastify y Prisma"
3. **Frontend básico (1 hora):**

   * Setup de Next.js
   * Formulario de subida
   * Lista simple de uploads
   * **Ayuda de IA:** "¿Cómo hago un form con file upload en Next.js?"
4. **Procesamiento asíncrono (1.5 horas):**

   * Parseo de CSV
   * Worker simple (puede ser mock de SQS)
   * Actualización de estados
   * **Ayuda de IA:** "¿Cómo parseo CSV en Node.js y valido datos?"
5. **Arquitectura y refactoring (30 min):**

   * Organizar en carpetas según DDD
   * Implementar Either pattern básico
   * Documentar decisiones
   * **Ayuda de IA:** "¿Cómo organizo mi código siguiendo Clean Architecture?"

#### 3\. Funcionalidad sobre perfección

✅ **CRÍTICO (Debe funcionar):**

* Subir archivo
* Ver lista de uploads
* Procesar CSV (aunque sea de forma simple)
* Mostrar resultados

✅ **IMPORTANTE (Si tienes tiempo):**

* CQRS básico (separar commands de queries)
* Either pattern en algunos lugares
* Docker Compose funcionando

⚠️ **NICE TO HAVE (Si sobra tiempo):**

* Arquitectura DDD perfecta
* Tests unitarios
* UI muy pulida
* Retry logic avanzado

#### 4\. Documenta TODO lo que no sepas

Si no lograste implementar algo, documéntalo:

```markdown
## Limitaciones Conocidas

### Arquitectura
- No implementé completamente el patrón Repository (falta de tiempo)
- Los handlers no siguen estrictamente CQRS
- \*\*Razón:\*\* Prioricé funcionalidad end-to-end
- \*\*Con más tiempo haría:\*\* Refactorizar siguiendo el patrón completo

### Procesamiento Asíncrono
- Usé un setTimeout en lugar de SQS real
- \*\*Razón:\*\* No tenía experiencia previa con SQS
- \*\*Aprendizaje:\*\* Investigué sobre LocalStack pero opté por un mock simple

### Testing
- No incluí tests
- \*\*Razón:\*\* Prioricé que el sistema funcione completo
- \*\*Con más tiempo haría:\*\* Tests unitarios para parsers y validaciones
```

\---

## Estructura del Proyecto

### Backend

```
backend/
├── src/
│   ├── main/
│   │   ├── index.ts                    # Bootstrap de la aplicación
│   │   └── App.ts                      # Clase principal
│   ├── config/
│   │   ├── IConvictProps.ts           # Schema de configuración
│   │   └── index.ts                    # Setup de Convict
│   ├── document-processing/            # Bounded Context
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── CreateUploadCommandHandler.ts
│   │   │   │   │   └── ProcessFileCommandHandler.ts
│   │   │   │   └── objects/
│   │   │   │       ├── CreateUploadCommand.ts
│   │   │   │       └── ProcessFileCommand.ts
│   │   │   ├── queries/
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── GetUploadByIdQueryHandler.ts
│   │   │   │   │   └── ListUploadsQueryHandler.ts
│   │   │   │   └── objects/
│   │   │   │       ├── GetUploadByIdQuery.ts
│   │   │   │       └── ListUploadsQuery.ts
│   │   │   └── services/
│   │   │       ├── FileProcessingService.ts
│   │   │       └── CsvParserService.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Upload.ts           # Aggregate Root
│   │   │   │   └── ActivityData.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── UploadStatus.ts
│   │   │   │   └── FileName.ts
│   │   │   └── repositories/
│   │   │       ├── IUploadRepository.ts
│   │   │       └── IActivityDataRepository.ts
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── PrismaUploadRepository.ts
│   │   │   │   │   └── PrismaActivityDataRepository.ts
│   │   │   │   ├── mappers/
│   │   │   │   │   ├── PrismaUploadMapper.ts
│   │   │   │   │   └── PrismaActivityDataMapper.ts
│   │   │   │   └── models/
│   │   │   │       └── schema.prisma
│   │   │   ├── messaging/
│   │   │   │   ├── SqsMessagePublisher.ts  # o MockMessagePublisher
│   │   │   │   └── SqsMessageConsumer.ts   # o MockMessageConsumer
│   │   │   ├── storage/
│   │   │   │   └── S3FileStorage.ts        # o LocalFileStorage
│   │   │   └── dependency-injection/
│   │   │       └── DocumentProcessingModule.ts
│   │   └── presentation/
│   │       ├── controllers/
│   │       │   ├── CreateUploadController.ts
│   │       │   ├── GetUploadByIdController.ts
│   │       │   └── ListUploadsController.ts
│   │       └── routes/
│   │           └── DocumentProcessingRoutes.ts
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── AggregateRoot.ts
│   │   │   ├── ValueObject.ts
│   │   │   └── Either.ts               # Patrón Either para manejo de errores
│   │   ├── application/
│   │   │   ├── ICommandHandler.ts
│   │   │   ├── IQueryHandler.ts
│   │   │   └── ICommandBus.ts
│   │   └── infrastructure/
│   │       ├── http/
│   │       │   ├── IHttpRequest.ts
│   │       │   ├── IHttpResponse.ts
│   │       │   └── BaseController.ts
│   │       └── messaging/
│   │           ├── IMessagePublisher.ts
│   │           └── IMessageConsumer.ts
│   └── workers/
│       └── FileProcessingWorker.ts      # Worker que consume mensajes
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

&#x20;Si esta estructura te abruma, empieza más simple y refactoriza después. Lo importante es que funcione.

### Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Dashboard
│   │   └── uploads/
│   │       ├── page.tsx               # Lista de uploads
│   │       ├── new/
│   │       │   └── page.tsx          # Formulario de subida
│   │       └── \[id]/
│   │           └── page.tsx          # Detalle y resultados
│   ├── features/
│   │   └── document-processing/
│   │       ├── api/
│   │       │   └── uploadsApi.ts     # React Query hooks
│   │       ├── components/
│   │       │   ├── UploadForm.tsx
│   │       │   ├── UploadList.tsx
│   │       │   ├── UploadDetail.tsx
│   │       │   ├── ProcessingStatus.tsx
│   │       │   └── ResultsTable.tsx
│   │       └── types/
│   │           └── upload.types.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── lib/
│   │       ├── api-client.ts         # Axios configurado
│   │       └── query-client.ts       # React Query config
│   └── styles/
│       └── globals.css
├── package.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

\---

## Requisitos Funcionales

### API REST (Backend)

Implementar los siguientes endpoints:

|Método|Endpoint|Descripción|Request Body|Response|
|-|-|-|-|-|
|POST|`/api/v1/uploads`|Subir archivo CSV|FormData con file|`{ id, status, fileName, createdAt }`|
|GET|`/api/v1/uploads/:id`|Obtener estado de procesamiento|-|`{ id, status, fileName, totalRows, processedRows, errorMessage, ... }`|
|GET|`/api/v1/uploads`|Listar uploads (paginado)|Query params: `?page=1\&limit=10`|`{ data: \[...], total, page, limit }`|
|GET|`/api/v1/uploads/:id/results`|Obtener datos procesados|-|`{ data: \[{ category, amount, unit, date }, ...] }`|

### Base de Datos

#### Schema Prisma Mínimo

```prisma
model Upload {
  id            String   @id
  fileName      String
  fileUrl       String
  status        String   // PENDING, PROCESSING, COMPLETED, FAILED
  userId        String
  totalRows     Int?
  processedRows Int?
  failedRows    Int?
  errorMessage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  activityData  ActivityData\[]
}

model ActivityData {
  id          String   @id
  uploadId    String
  category    String
  amount      Float
  unit        String
  date        DateTime
  createdAt   DateTime @default(now())

  upload Upload @relation(fields: \[uploadId], references: \[id])
}
```

### Formato CSV Esperado

El sistema debe procesar archivos CSV con el siguiente formato:

```csv
category,amount,unit,date
Electricity,150.5,kWh,2024-01-15
Natural Gas,75.2,m3,2024-01-16
Transportation,200,km,2024-01-17
Waste,45.8,kg,2024-01-18
Water,120,m3,2024-01-19
```

**Validaciones requeridas:**

* Todas las columnas son obligatorias
* `amount` debe ser un número positivo
* `date` debe ser una fecha válida en formato YYYY-MM-DD
* `category` no puede estar vacío
* `unit` no puede estar vacío

### Funcionalidades Frontend

#### 1\. Página de Subida (`/uploads/new`)

* Componente drag \& drop o selector de archivo CSV
* Validación de formato de archivo (solo .csv)
* Indicador de progreso durante la subida
* Redirección automática a página de detalle tras completar

#### 2\. Lista de Uploads (`/uploads`)

* Tabla con todos los uploads del usuario
* Columnas: Nombre de archivo, Estado, Fecha de subida, Filas procesadas, Acciones
* Badges de color según estado:

  * PENDING: Amarillo
  * PROCESSING: Azul
  * COMPLETED: Verde
  * FAILED: Rojo
* Paginación (10 items por página)
* Link a página de detalle en cada fila

#### 3\. Página de Detalle (`/uploads/:id`)

* Información del upload (nombre, fecha, estado)
* Barra de progreso si está en PROCESSING
* **Polling automático cada 3 segundos** mientras status = PROCESSING
* Cuando COMPLETED: tabla con todos los datos procesados
* Cuando FAILED: mensaje de error claro
* Botón para volver a la lista

#### 4\. Dashboard (`/`)

* Resumen general:

  * Total de uploads
  * Uploads completados
  * Uploads en proceso
  * Uploads fallidos
* Link a crear nuevo upload

\---

## Arquitectura y Patrones Requeridos

### 1\. Domain-Driven Design (DDD)

**Bounded Context:** `document-processing`

**Aggregate Roots:**

* `Upload` - Representa un archivo subido y su procesamiento

**Value Objects:**

* `UploadStatus` - Enum con estados válidos (PENDING, PROCESSING, COMPLETED, FAILED)
* `FileName` - Validación de nombre de archivo

**Repositories (Interfaces en domain, implementación en infrastructure):**

* `IUploadRepository` - CRUD de uploads
* `IActivityDataRepository` - CRUD de datos de actividad

&#x20;Si no entiendes completamente DDD, al menos separa:

* Entidades (clases que representan datos del negocio)
* Repositorios (interfaces para acceder a la base de datos)
* Servicios (lógica de negocio)

### 2\. Clean Architecture

**Capas:**

* **Domain:** Entidades, Value Objects, Interfaces de repositorios (sin dependencias externas)
* **Application:** Commands, Queries, Handlers, Services (usa domain, no conoce infrastructure)
* **Infrastructure:** Implementaciones de repositorios, servicios externos, persistencia
* **Presentation:** Controllers, Routes, DTOs

**Regla de dependencias:** Las flechas apuntan hacia adentro (infrastructure → application → domain) Al menos separa la lógica de negocio de los controllers. No pongas queries de Prisma directamente en las rutas.

### 3\. CQRS (Command Query Responsibility Segregation)

**Commands (escritura):**

* `CreateUploadCommand` + `CreateUploadCommandHandler`
* `ProcessFileCommand` + `ProcessFileCommandHandler`

**Queries (lectura):**

* `GetUploadByIdQuery` + `GetUploadByIdQueryHandler`
* `ListUploadsQuery` + `ListUploadsQueryHandler`
* `GetUploadResultsQuery` + `GetUploadResultsQueryHandler`

**Patrón:**

```typescript
interface ICommandHandler<TCommand, TResult> {
  execute(command: TCommand): Promise<Either<Error, TResult>>;
}

interface IQueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<Either<Error, TResult>>;
}
```

Al menos separa las funciones de "escribir datos" de las de "leer datos".

### 4\. Either Pattern (Manejo de Errores)

**Uso obligatorio:**

* Todos los handlers deben retornar `Either<Error, Result>`
* No usar `try/catch` en controllers (dejar que los errores suban)
* Implementar un middleware de manejo de errores centralizado

**Ejemplo:**

```typescript
// ✅ Correcto
async execute(command: CreateUploadCommand): Promise<Either<Error, CreateUploadResult>> {
  const fileNameOrError = FileName.create(command.fileName);
  if (fileNameOrError.isLeft()) {
    return Either.left(fileNameOrError.value);
  }
  // ... lógica
  return Either.right(result);
}

// ❌ Incorrecto
async execute(command: CreateUploadCommand): Promise<CreateUploadResult> {
  try {
    // ... lógica
    return result;
  } catch (error) {
    throw error;
  }
}
```

&#x20;Si el Either pattern te confunde, al menos implementa un sistema consistente de manejo de errores (sin throw random en diferentes lugares).

### 5\. Dependency Injection

Usar un contenedor de DI (Awilix recomendado) para:

* Registrar repositorios
* Registrar servicios
* Registrar handlers
* Inyectar dependencias en controllers

&#x20;Al menos usa inyección de dependencias manual en los constructores en lugar de imports directos.

\---

## Procesamiento Asíncrono

### Implementación de Mensajería

**Opción A: AWS SQS con LocalStack (Si tienes experiencia con AWS)**

```yaml
# docker-compose.yml
localstack:
  image: localstack/localstack:latest
  environment:
    SERVICES: s3,sqs
  ports:
    - "4566:4566"
```

**Opción B: Mock Simple** 



Si nunca has trabajado con SQS, implementa un mock simple:

```typescript
// MockMessageQueue.ts
class MockMessageQueue {
  private queue: Array<any> = \[];

  async publish(message: any): Promise<void> {
    this.queue.push(message);
  }

  async poll(): Promise<any | null> {
    return this.queue.shift() || null;
  }
}
```

Luego en tu worker:

```typescript
setInterval(async () => {
  const message = await messageQueue.poll();
  if (message) {
    await processFile(message);
  }
}, 3000); // Poll cada 3 segundos
```

### Worker de Procesamiento

**Archivo:** `src/workers/FileProcessingWorker.ts`

**Responsabilidades:**

1. Consumir mensajes de la cola
2. Descargar archivo desde S3/filesystem
3. Parsear CSV
4. Validar cada fila
5. Guardar datos válidos en base de datos
6. Actualizar estado del upload (COMPLETED o FAILED)
7. Eliminar mensaje de la cola

**Ejecución:**

```bash
npm run worker  # Script separado que ejecuta el worker
```

&#x20;El worker puede ser un script separado que haga polling cada X segundos. No necesitas implementar algo super sofisticado.

\---

## Infraestructura

### Docker Compose

Crear `docker-compose.yml` con:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES\_DB: document\_processing
      POSTGRES\_USER: postgres
      POSTGRES\_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres\_data:/var/lib/postgresql/data

  # OPCIONAL: Solo si usas LocalStack
  localstack:
    image: localstack/localstack:latest
    environment:
      SERVICES: s3,sqs
      DEBUG: 1
    ports:
      - "4566:4566"
    volumes:
      - localstack\_data:/tmp/localstack

volumes:
  postgres\_data:
  localstack\_data:
```

### Diagrama de Arquitectura AWS

Crear un diagrama (puede ser texto ASCII, Mermaid, draw.io, o similar) mostrando:

**Componentes:**

* **VPC** con subnets públicas y privadas
* **Application Load Balancer** (ALB) en subnets públicas
* **ECS Fargate** con 2 servicios:

  * **API Service** (2+ tasks para alta disponibilidad)
  * **Worker Service** (1+ tasks con auto-scaling basado en tamaño de cola)
* **RDS PostgreSQL** (Multi-AZ en subnets privadas)
* **S3 Bucket** (privado, con lifecycle policies)
* **SQS Queue** (con Dead Letter Queue para mensajes fallidos)
* **CloudWatch** (logs y métricas)
* **Secrets Manager** (credenciales de base de datos)

Puede ser un diagrama simple en texto o cualquier herramienta visual. Lo importante es que muestres que entiendes cómo se conectan los componentes.

\---

## Entregables

### 1\. Código Fuente

**Repositorio GitHub/GitLab (público o privado con acceso)**

Estructura esperada:

```
proyecto-raiz/
├── backend/           # Proyecto Node.js/TypeScript
├── frontend/          # Proyecto Next.js
├── docs/
│   └── arquitectura-aws.png  # Diagrama de infraestructura AWS
├── docker-compose.yml
├── README.md          # Instrucciones principales
├── USO-DE-IA.md       # Documenta cómo usaste IA (IMPORTANTE)
└── sample-data.csv    # Datos de prueba
```

### 2\. README Principal

Debe incluir:

1. **Descripción del proyecto**
2. **Requisitos previos** (Node.js, Docker, etc.)
3. **Instrucciones de instalación**

```bash
   # Backend
   cd backend
   npm install
   docker-compose up -d
   npx prisma migrate dev
   npm run dev

   # Worker (en otra terminal)
   npm run worker

   # Frontend (en otra terminal)
   cd frontend
   npm install
   npm run dev
   ```

4. **Arquitectura del sistema**

   * Diagrama de flujo
   * Explicación de bounded contexts
   * Patrones utilizados (DDD, CQRS, Clean Architecture)
5. **Decisiones técnicas**

   * ¿Por qué elegiste X librería?
   * Trade-offs considerados
   * Limitaciones conocidas
6. **Cómo probarlo**

   * URL de la aplicación
   * Pasos para subir un CSV de prueba
   * Qué observar durante el procesamiento

### 3\. Documento de Uso de IA (OBLIGATORIO)

**Archivo:** `USO-DE-IA.md`

Incluye:

```markdown
# Uso de Inteligencia Artificial en esta Prueba

## Herramientas Utilizadas
- \[ ] Claude Code
- \[ ] GitHub Copilot
- \[ ] ChatGPT
- \[ ] Cursor AI
- \[ ] Otra: \_\_\_\_\_\_\_\_\_

## ¿Qué Generé con IA?

### Backend
- \[x] Estructura inicial de carpetas (Claude Code me dio un scaffold)
- \[x] Schema de Prisma (Copilot sugirió los campos)
- \[ ] Lógica de parseo de CSV
- \[x] Configuración de TypeScript

### Frontend
- \[x] Setup inicial de Next.js
- \[x] Componentes base (UploadForm, UploadList)
- \[ ] Lógica de React Query
- \[x] Estilos con Tailwind

## ¿Qué Modifiqué o Corregí?

1. \*\*Handler de CreateUpload:\*\*
   - La IA generó el handler sin Either pattern
   - Lo adapté manualmente para retornar Either<Error, Result>

2. \*\*Validaciones de CSV:\*\*
   - El código generado no validaba fechas correctamente
   - Agregué validación custom con biblioteca date-fns

3. \*\*Polling en Frontend:\*\*
   - Copilot sugirió useEffect básico
   - Lo mejoré usando refetchInterval de React Query

## ¿Qué Aprendí?

1. \*\*React Query:\*\*
   - No lo había usado antes
   - Aprendí sobre staleTime, refetchInterval y cache invalidation
   - La IA me dio buenos ejemplos de inicio

2. \*\*Prisma:\*\*
   - Primera vez usando Prisma
   - La IA me ayudó con la sintaxis del schema y las migraciones
   - Entendí el concepto de mappers entre DB y domain

3. \*\*CQRS:\*\*
   - Concepto nuevo para mí
   - Investigué en blogs después de que la IA me diera ejemplos básicos
   - Implementé una versión simplificada

## Limitaciones Encontradas con IA

1. \*\*Arquitectura DDD:\*\*
   - La IA no entendía bien cómo estructurar bounded contexts
   - Tuve que investigar en documentación oficial
   - Implementé una versión simplificada por falta de tiempo

2. \*\*SQS Integration:\*\*
   - El código de SQS era muy básico
   - Opté por un mock simple porque la integración real era compleja
   - Con más tiempo investigaría LocalStack

## Tiempo Invertido

- Setup y configuración: 1 hora
- Backend (con ayuda de IA): 1.5 horas
- Frontend (con ayuda de IA): 1 hora
- Debugging y ajustes: 30 min
- \*\*Total:\*\* 4 horas
```

### 4\. Documentación de Arquitectura

**Diagrama AWS** mostrando:

* Networking (VPC, subnets, security groups)
* Compute (ECS services, tasks)
* Storage (RDS, S3)
* Messaging (SQS)
* Monitoring (CloudWatch)

### 5\. Archivo de Prueba

Incluir `sample-data.csv` con al menos 50 filas de ejemplo:

```csv
category,amount,unit,date
Electricity,150.5,kWh,2024-01-15
Natural Gas,75.2,m3,2024-01-16
Transportation,200,km,2024-01-17
...
```

\---

## Criterios de Evaluación

### 1\. Arquitectura (30 puntos)

|Criterio|Puntos|Descripción|
|-|-|-|
|Bounded Context correctamente estructurado|8|Al menos separación básica de carpetas|
|CQRS implementado|8|Al menos separación de escritura/lectura|
|DDD aplicado|7|Entidades y repositorios claramente identificables|
|Separación de capas|7|Lógica de negocio NO en controllers|

&#x20;Si no logras implementar todo perfectamente, documenta qué entiendes de cada patrón y cómo intentaste aplicarlo.

### 2\. Backend (25 puntos)

|Criterio|Puntos|Descripción|
|-|-|-|
|API REST funcional con Fastify|5|Endpoints funcionan correctamente|
|Prisma correctamente integrado|5|Queries funcionan, migraciones aplicadas|
|Mensajería implementada|8|Puede ser mock simple, pero debe funcionar|
|Worker procesa archivos|7|CSV se parsea y guarda en DB|

### 3\. Frontend (20 puntos)

|Criterio|Puntos|Descripción|
|-|-|-|
|Next.js App Router|5|Rutas funcionan, navegación correcta|
|React Query|5|Al menos queries básicas funcionando|
|UI funcional|5|No necesita ser hermosa, pero sí usable|
|Polling implementado|5|Estado se actualiza automáticamente|

### 4\. AWS \& Infraestructura (15 puntos)

|Criterio|Puntos|Descripción|
|-|-|-|
|Diagrama de arquitectura|6|Puede ser simple, pero completo|
|Docker Compose funcional|4|PostgreSQL corriendo localmente|
|Variables de entorno|3|Al menos archivo .env funcionando|
|Dockerfile|2|Puede ser básico|

### 5\. Código Limpio (10 puntos)

|Criterio|Puntos|Descripción|
|-|-|-|
|TypeScript sin `any` excesivo|3|Menos del 30% de código con any|
|Código organizado|3|Estructura lógica, nombres claros|
|Manejo de errores|2|Sistema consistente de errores|
|Naming consistente|2|Convenciones claras|

### Puntos Bonus (hasta 20 puntos adicionales)

#### Bonus Técnicos

* Tests unitarios incluidos (+5)
* Tests de integración (+3)
* Logging estructurado (+2)
* Dead Letter Queue implementada (+2)
* Retry logic con exponential backoff (+2)
* UI/UX especialmente pulida (+2)

#### Bonus por Documentación 

* **Documento de uso de IA completo y honesto (+5)**
* Video demo mostrando el sistema funcionando (+3)
* Documento de aprendizajes y limitaciones (+2)
* Diagrama de flujo detallado (+2)

**Total máximo:** 100 puntos base + 20 bonus = 120 puntos

&#x20;Los puntos bonus por documentación son especialmente importantes. Preferimos un candidato que entrega algo funcional y documenta bien su proceso, que alguien que intenta código perfecto pero no funciona.

\---

## Red Flags (Penalización Severa)

❌ **Lógica de negocio en controllers** → Demuestra no entender separación de capas
❌ **No funciona end-to-end** → Incompleto
❌ **Código copiado sin entender** → Se evidencia en entrevista técnica posterior
❌ **No documentó uso de IA** → Falta de honestidad o reflexión

**Nota:** Para juniors, perdonamos complejidad arquitectónica imperfecta, pero NO perdonamos código que no funciona o falta de documentación.

\---

## Green Flags (Señales de Excelencia)

✅ **Sistema funciona end-to-end** (lo más importante)
✅ **Documentación honesta sobre limitaciones**
✅ **Uso inteligente de IA** (sabe cuándo usar y cuándo no)
✅ **Código organizado** aunque no sea arquitectura perfecta
✅ **Aprendizajes documentados** (muestra capacidad de aprender)
✅ **Preguntas inteligentes** durante el proceso
✅ **Commits atómicos** con mensajes descriptivos

\---

## Instrucciones de Entrega

### Formato de Entrega

**Enviar por correo a:** \[correo-de-contacto]

**Asunto:** `Prueba Técnica Full Stack - \[Tu Nombre]`

**Incluir:**

1. Link al repositorio GitHub/GitLab (asegurar acceso público o agregar como colaborador)
2. README con instrucciones claras de instalación y ejecución
3. **USO-DE-IA.md** (OBLIGATORIO)
4. Diagrama de arquitectura AWS (imagen o link a archivo)
5. (Opcional) Video demo de 3-5 minutos mostrando el sistema funcionando
6. (Opcional) Documento adicional de aprendizajes

### Plazo de Entrega

**Fecha límite:** \[FECHA]

**Nota:** Si necesitas más tiempo por razones justificadas, comunícalo con anticipación.

\---

## Preguntas Frecuentes

**P: Soy junior, ¿puedo aplicar aunque no sepa todas estas tecnologías?**
R: ¡Sí! Esa es exactamente la razón por la que permitimos IA. Queremos ver tu capacidad de aprender y adaptarte.

**P: ¿Puedo usar LocalStack en lugar de AWS real?**
R: Sí, o incluso un mock simple. Documenta tu decisión.

**P: ¿Puedo implementar un mock simple de SQS?**
R: Absolutamente. Para juniors es totalmente válido un mock con array en memoria.

**P: Nunca he usado Fastify, ¿puedo usar Express?**
R: Preferimos Fastify, pero si Express te resulta más familiar y lo implementas bien, es aceptable.

**P: ¿Necesito implementar autenticación?**
R: No es obligatorio. Puedes asumir un solo usuario (userId = "user-123").

**P: ¿Qué hago si me trabo en algo?**
R: 1) Usa IA para ayudarte, 2) Investiga en documentación, 3) Si sigue sin funcionar, documenta el problema y continúa con otras partes.

**P: ¿Es mejor hacer todo perfecto o entregar algo funcional?**
R: **FUNCIONAL SIEMPRE.** Preferimos un sistema funcionando con arquitectura simple, que código perfecto pero que no corre.

**P: ¿Cuánto debo documentar sobre el uso de IA?**
R: Sé honesto. No necesitas documentar cada línea generada, pero sí las partes principales y qué aprendiste.

**P: No logré implementar CQRS completo, ¿me descalifican?**
R: No. Documenta qué entendiste del patrón y qué implementaste. Valoramos el aprendizaje.

**P: ¿Puedo hacer preguntas durante la prueba?**
R: Sí, envía email con tus dudas. Responderemos dudas generales (no resolveremos la prueba por ti).

\---

## Mensaje Final para Candidatos

**No te asustes si no dominas estas tecnologías.** Esta prueba está diseñada para evaluar:

1. **Tu capacidad de aprender rápido**
2. **Cómo usas herramientas modernas (IA) para ser productivo**
3. **Tu honestidad y capacidad de documentar limitaciones**
4. **Tu resolución de problemas**

**Lo que NO evaluamos:**

* Conocimiento previo de cada tecnología
* Arquitectura perfecta desde el día 1
* Código sin ayuda de herramientas

**Consejos finales:**

* Prioriza que funcione sobre que sea perfecto
* Documenta TODO (decisiones, limitaciones, aprendizajes)
* Usa IA sin miedo, pero entiende lo que genera
* Si algo no sale, explica por qué y qué intentaste
* Pregunta si tienes dudas

**¡Mucha suerte! Queremos ver tu proceso de pensamiento y aprendizaje.**

\---

## Recursos Útiles

### Documentación Oficial

* **Fastify:** https://fastify.dev/
* **Prisma:** https://www.prisma.io/docs
* **Next.js:** https://nextjs.org/docs
* **React Query:** https://tanstack.com/query/latest
* **AWS SQS:** https://docs.aws.amazon.com/sqs/
* **LocalStack:** https://docs.localstack.cloud/

### Patrones y Arquitectura

* **Clean Architecture:** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
* **DDD:** https://martinfowler.com/tags/domain%20driven%20design.html
* **CQRS:** https://martinfowler.com/bliki/CQRS.html

### Herramientas Recomendadas

* **Diagramas:** draw.io, Excalidraw, Mermaid
* **Testing:** Jest, Supertest
* **Linting:** ESLint, Prettier

### Tutoriales 

* **Prisma Getting Started:** https://www.prisma.io/docs/getting-started
* **Next.js Learn:** https://nextjs.org/learn
* **React Query Tutorial:** https://tkdodo.eu/blog/practical-react-query

\---

## Contacto

Si tienes preguntas sobre la prueba, contacta a:

**Email:** info@carbonbox.app
**Horario de atención:** Lunes a Viernes, 9:00 AM - 6:00 PM

\---

**¡Mucha suerte! Esperamos ver tu solución y tu proceso de aprendizaje.**

\---

*Documento generado para evaluación técnica de CarbonBox
Versión 2.0* 


