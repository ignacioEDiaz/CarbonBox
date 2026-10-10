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

## ¿Qué Generé con IA?

### Backend

- [x] Configuración de Spec Kit y constitución del proyecto
- [ ] _(se completa a medida que avancen los specs)_

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

## Limitaciones Encontradas con IA

- _(completar a medida que aparezcan)_

## Tiempo Invertido

- Setup y constitución: _(completar)_
- Backend: _(completar)_
- Frontend: _(completar)_
- Debugging y ajustes: _(completar)_
- **Total:** _(completar)_
