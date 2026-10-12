"use client";

// Solo diseño: los números llegan por props desde la página. El gráfico "Emisiones por mes" es
// decorativo, como indica el diseño: no hay endpoint que lo alimente.
import Link from "next/link";
import { AppHeader } from "@/shared/components/AppHeader";
import s from "./Dashboard.module.css";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const LINE_A = "M0,150 C60,146 100,140 160,138 S260,128 320,124 S420,110 480,112 S560,100 640,96 S760,80 820,74 S920,60 1000,44";
const LINE_B = "M0,182 C80,180 140,176 200,172 S300,160 360,164 S440,170 500,158 S600,140 660,142 S780,130 840,128 S940,118 1000,106";

// Mientras carga se muestra "…" y si falla "—": por eso el valor puede ser texto
type StatValue = number | string;

type DashboardProps = {
  total: StatValue;
  completed: StatValue;
  processing: StatValue;
  failed: StatValue;
  error?: string;
};

export function Dashboard({ total, completed, processing, failed, error }: DashboardProps) {
  const stats = [
    { label: "Total de uploads", value: total },
    { label: "Completados", value: completed, dot: "#9bd9b8", color: "#9bd9b8" },
    { label: "En proceso", value: processing, dot: "#8f95ff" },
    { label: "Fallidos", value: failed, dot: "#ff8a8a" },
  ];

  return (
    <div className={s.page}>
      <AppHeader active="dashboard" />

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

        <section className={s.panel} aria-hidden="true">
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>Emisiones por mes</h2>
            <div className={s.legend}>
              <span><i style={{ background: "#9bd9b8" }} />2026</span>
              <span><i style={{ background: "#6f76ff" }} />2025</span>
            </div>
          </div>
          <svg viewBox="0 0 1000 220" preserveAspectRatio="none" className={s.chart}>
            <defs>
              <linearGradient id="cbArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#9bd9b8" stopOpacity=".22" />
                <stop offset="1" stopColor="#9bd9b8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g stroke="rgba(255,255,255,.07)" strokeWidth="1">
              {[20, 80, 140, 200].map((y) => <line key={y} x1="0" y1={y} x2="1000" y2={y} />)}
            </g>
            <path d={`${LINE_A} L1000,220 L0,220 Z`} fill="url(#cbArea)" />
            <path d={LINE_A} fill="none" stroke="#9bd9b8" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            <path d={LINE_B} fill="none" stroke="#6f76ff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className={s.months}>{MONTHS.map((month) => <span key={month}>{month}</span>)}</div>
        </section>
      </main>
    </div>
  );
}
