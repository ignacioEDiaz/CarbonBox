import { MonthlyRows } from "../types/upload.types";

// Lo que dibuja el gráfico del dashboard: los dos años más recientes con datos, 12 meses cada uno.
// previous es null si todos los datos son de un solo año
export type ActivityChart = {
  latestYear: number;
  previousYear: number | null;
  latest: number[];
  previous: number[] | null;
};

// null si todavía no hay filas procesadas
export function toActivityChart(data: MonthlyRows[]): ActivityChart | null {
  if (data.length === 0) return null;
  // Los años que tienen filas, del más nuevo al más viejo. No se usa latestYear - 1: si hay datos
  // de 2026 y 2024, el año anterior (2025) estaría vacío y los de 2024 no se verían
  const years = [...new Set(data.map((row) => row.year))].sort((a, b) => b - a);
  const [latestYear, previousYear = null] = years;
  return {
    latestYear,
    previousYear,
    latest: monthlyValues(data, latestYear),
    previous: previousYear === null ? null : monthlyValues(data, previousYear),
  };
}

// 12 valores, uno por mes (enero = posición 0); los meses sin filas quedan en 0
function monthlyValues(data: MonthlyRows[], year: number): number[] {
  const values = Array.from({ length: 12 }, () => 0);
  for (const row of data.filter((item) => item.year === year)) {
    values[row.month - 1] = row.rows;
  }
  return values;
}

// La línea en el lienzo del SVG (1000 x 220): x reparte los 12 meses y y escala contra el máximo,
// dejando 20 px arriba para que el pico no toque el borde
export function toLinePath(values: number[], max: number): string {
  const points = values.map((value, index) => {
    const x = (index * 1000) / 11;
    const y = 210 - (max === 0 ? 0 : (value / max) * 190);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${points.join(" L")}`;
}
