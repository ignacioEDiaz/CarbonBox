import { MonthlyRows } from "../types/upload.types";

// Lo que dibuja el gráfico del dashboard: el último año con datos contra el anterior, 12 meses cada uno
export type ActivityChart = {
  latestYear: number;
  previousYear: number;
  latest: number[];
  previous: number[];
};

// null si todavía no hay filas procesadas
export function toActivityChart(data: MonthlyRows[]): ActivityChart | null {
  if (data.length === 0) return null;
  const latestYear = Math.max(...data.map((row) => row.year));
  return {
    latestYear,
    previousYear: latestYear - 1,
    latest: monthlyValues(data, latestYear),
    previous: monthlyValues(data, latestYear - 1),
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
