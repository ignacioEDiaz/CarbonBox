"use client";

// Solo diseño: los números y el gráfico llegan por props desde la página
import Link from "next/link";
import { ActivityChart, toLinePath } from "./activityChart";
import s from "./Dashboard.module.css";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Mientras carga se muestra "…" y si falla "—": por eso el valor puede ser texto
type StatValue = number | string;

type DashboardProps = {
  total: StatValue;
  completed: StatValue;
  processing: StatValue;
  failed: StatValue;
  chart: ActivityChart | null; // null: todavía no hay filas procesadas
  error?: string;
};

export function Dashboard({ total, completed, processing, failed, chart, error }: DashboardProps) {
  const stats = [
    { label: "Total de uploads", value: total },
    { label: "Completados", value: completed, dot: "#9bd9b8", color: "#9bd9b8" },
    { label: "En proceso", value: processing, dot: "#8f95ff" },
    { label: "Fallidos", value: failed, dot: "#ff8a8a" },
  ];

  return (
    <main className={s.main}>
      <div className={s.top}>
        <div>
          <span className={s.badge}><span className={s.dot} />Resumen</span>
          <h1 className={s.title}>Dashboard</h1>
        </div>
        <Link href="/uploads/new" className={s.cta}>Subir un CSV →</Link>
      </div>

      {error && <p className={s.error}>{error}</p>}
      <div className={s.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.stat}>
            <div className={s.statLabel}>
              {stat.dot && <span className={s.statDot} style={{ background: stat.dot }} />}
              {stat.label}
            </div>
            <div className={s.statValue} style={stat.color ? { color: stat.color } : undefined}>{stat.value}</div>
          </div>
        ))}
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <h2 className={s.panelTitle}>Registros de actividad por mes</h2>
          {chart && (
            <div className={s.legend}>
              <span><i style={{ background: "#9bd9b8" }} />{chart.latestYear}</span>
              {chart.previousYear !== null && <span><i style={{ background: "#6f76ff" }} />{chart.previousYear}</span>}
            </div>
          )}
        </div>
        {chart ? <ChartLines chart={chart} /> : <p className={s.empty}>Todavía no hay filas procesadas.</p>}
        <div className={s.months}>{MONTHS.map((month) => <span key={month}>{month}</span>)}</div>
      </section>
    </main>
  );
}

// Las dos líneas comparten la escala (el máximo de los dos años), así se pueden comparar
function ChartLines({ chart }: { chart: ActivityChart }) {
  const max = Math.max(...chart.latest, ...(chart.previous ?? []));
  const latest = toLinePath(chart.latest, max);
  const previous = chart.previous === null ? null : toLinePath(chart.previous, max);
  const years = chart.previousYear === null ? `${chart.latestYear}` : `${chart.latestYear} y ${chart.previousYear}`;
  return (
    <svg
      viewBox="0 0 1000 220"
      preserveAspectRatio="none"
      className={s.chart}
      role="img"
      aria-label={`Filas de actividad por mes en ${years}`}
    >
      <defs>
        <linearGradient id="cbArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9bd9b8" stopOpacity=".22" />
          <stop offset="1" stopColor="#9bd9b8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(255,255,255,.07)" strokeWidth="1">
        {[20, 80, 140, 200].map((y) => <line key={y} x1="0" y1={y} x2="1000" y2={y} />)}
      </g>
      <path d={`${latest} L1000,220 L0,220 Z`} fill="url(#cbArea)" />
      {previous && <path d={previous} fill="none" stroke="#6f76ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
      <path d={latest} fill="none" stroke="#9bd9b8" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
