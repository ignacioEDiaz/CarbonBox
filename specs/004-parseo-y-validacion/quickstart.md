# Quickstart: validar el spec 004

El parser no tiene endpoint ni worker todavía (los usa el spec 005), así que se valida con sus
tests unitarios y con una prueba a mano desde la terminal. **No hace falta Docker.**

## Requisitos

- Rama `004-parseo-y-validacion` y `npm install` corrido en `backend/` (instala `csv-parse`).

## 1. Tests del parser

```bash
cd backend
npm run test:unit -- --verbose
```

Esperado: todos en verde y código de salida 0 (223 tests al cerrar el spec, 48 del parser).
Hay que correrlos con el script de npm: un `npx jest` directo no agrega el flag
`--experimental-vm-modules` y fallan los tests HTTP (no los del parser). Los del parser cubren,
por historia:

| Historia | Qué prueban |
|---|---|
| US1 | Filas válidas con sus valores y el `uploadId`; cada error con su línea y motivo (categoría, unidad, cantidad `0`, `-5`, `abc`, `12,5`, `1e3`, vacía; fechas `2024-02-31`, `2024-13-01`, `31/01/2024`, `2024-1-5`, vacía; 3 y 5 columnas); un solo motivo por fila; espacios recortados; válidas + errores = total; mismo contenido, mismo resultado |
| US2 | Error de archivo, sin filas, para: otro encabezado, punto y coma, solo encabezado, encabezado y líneas vacías, bytes que no son UTF-8, comilla sin cerrar, texto después de la comilla de cierre. Encabezado con mayúsculas, espacios, `\r\n` y BOM aceptado |
| US3 | Comas y comillas dentro de comillas; mismo resultado con `\n` y `\r\n`; líneas vacías y de solo espacios ignoradas con los números de línea correctos; fila de varias líneas informada en la línea donde empieza |
| SC-003 | Un CSV de 10 MB generado en el test se procesa en menos de 10 s |

## 2. Todos los tests y el typecheck

```bash
npm run test:unit
npx tsc --noEmit
```

Esperado: los dos con código de salida 0. Los tests de integración no cambian en este spec;
si se quieren correr: `docker compose up -d --wait` desde la raíz y `npm run test:integration`.

## 3. Prueba a mano (opcional)

Desde `backend/` en Git Bash, con un CSV que tiene filas rotas. El script de `tsx` va en **una
sola línea**: en Windows `npx` es un `.cmd` y `cmd.exe` corta el argumento en el primer salto
de línea (un script de varias líneas no se ejecuta y no muestra ningún error).

```bash
printf 'category,amount,unit,date\nElectricidad,120.5,kWh,2024-03-01\n,10,kWh,2024-03-02\nGas,12,5,m3,2024-03-03\n' > prueba.csv
npx tsx -e "import { readFileSync } from 'node:fs'; import { CsvParserService } from './src/document-processing/application/services/CsvParserService'; const r = new CsvParserService().parse(readFileSync('prueba.csv'), 'upload-de-prueba'); console.log(r.isLeft() ? r.value.message : { validas: r.value.validRows.length, errores: r.value.rowErrors, total: r.value.totalRows });"
rm prueba.csv
```

Esperado (verificado):

```text
{
  validas: 1,
  errores: [
    { line: 3, message: 'La categoría no puede estar vacía' },
    { line: 4, message: 'La fila tiene 5 columnas y se esperaban 4' }
  ],
  total: 3
}
```

(La línea 4 tiene 5 columnas porque `12,5` sin comillas son dos valores: por eso el formato de
la cantidad usa punto decimal.)

## Criterio de "listo" del spec

Un CSV con filas rotas devuelve las válidas y los errores por separado (plan general en
`CLAUDE.md`), con los tests de arriba en verde.
