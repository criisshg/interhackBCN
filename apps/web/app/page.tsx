"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronDown,
  Clock,
  Euro,
  Gauge as GaugeIcon,
  Inbox,
  MessageCircle,
  Mic,
  Phone,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  AlertItem,
  ActionResultado,
  ChatMessage,
  ChartSpec,
  Metrics,
  Stats,
  fetchAlerts,
  fetchMetrics,
  fetchStats,
  postAction,
  postChat,
  speak,
} from "@/lib/api";

/* ---------------- Static fallbacks ---------------- */

const FALLBACK_STATS: Stats = {
  active_alerts: 127,
  pipeline_eur: 284320,
  urgent_alerts: 23,
  by_tipologia: { loyal: 48, promiscuous: 43, at_risk: 19, marginal: 17 },
  by_tipo: { commodity: 89, technical: 38 },
};

const FALLBACK_METRICS: Metrics = {
  conversion_rate: 0.31,
  false_positive_rate: 0.18,
  inactive_recovery_rate: 0.31,
  coverage_rate: 0.74,
  actions: { closed: 39, converted: 12, false_positive: 7, in_progress: 21 },
};

const FALLBACK_ALERTS: AlertItem[] = [
  { id: 142, fecha: "2026-05-09", client_id: 4821, province: "Barcelona", region_code: "CAT", subfamilia: "C1", tipo_dinamica: "commodity", tipologia_cliente: "at_risk",     motivo: "Compra 3 meses por debajo de su media histórica. Caída sostenida del 47% en anestésicos dentales.", urgencia_dias: 3,  prioridad_score: 9.2, impacto_estimado: 4800,  canal_recomendado: "rep",       gestor_responsable: "Laura Vega",  plazo_dias: 7,  estado: "nueva" },
  { id: 138, fecha: "2026-05-09", client_id: 3302, province: "Madrid",    region_code: "MAD", subfamilia: "T1", tipo_dinamica: "technical", tipologia_cliente: "loyal",       motivo: "Rotura de stock inminente. Compra cada 28 días, ya han pasado 26 sin reposición.",                  urgencia_dias: 2,  prioridad_score: 8.8, impacto_estimado: 12400, canal_recomendado: "rep",       gestor_responsable: "Carlos Ruiz", plazo_dias: 5,  estado: "nueva" },
  { id: 155, fecha: "2026-05-09", client_id: 6104, province: "Valencia",  region_code: "VAL", subfamilia: "C2", tipo_dinamica: "commodity", tipologia_cliente: "promiscuous", motivo: "Ciclo roto. 47 días desde la última compra, su media es de 31. Probable pedido a competencia.",     urgencia_dias: 6,  prioridad_score: 8.1, impacto_estimado: 2100,  canal_recomendado: "telesales", gestor_responsable: "Equipo TLV",  plazo_dias: 7,  estado: "nueva" },
  { id: 121, fecha: "2026-05-08", client_id: 2891, province: "Sevilla",   region_code: "AND", subfamilia: "T2", tipo_dinamica: "technical", tipologia_cliente: "at_risk",     motivo: "Caída sostenida: 3 meses por debajo del baseline (€1.840 → €420 de media mensual).",                urgencia_dias: 8,  prioridad_score: 7.9, impacto_estimado: 8600,  canal_recomendado: "rep",       gestor_responsable: "Laura Vega",  plazo_dias: 14, estado: "en_curso" },
  { id: 163, fecha: "2026-05-09", client_id: 7733, province: "Barcelona", region_code: "CAT", subfamilia: "C1", tipo_dinamica: "commodity", tipologia_cliente: "promiscuous", motivo: "52 días desde última compra (media 34d). Cliente promiscuo, ventana de captura abierta.",            urgencia_dias: 11, prioridad_score: 7.4, impacto_estimado: 1900,  canal_recomendado: "marketing", gestor_responsable: "MKT auto.",   plazo_dias: 14, estado: "nueva" },
  { id: 109, fecha: "2026-05-09", client_id: 1540, province: "Bilbao",    region_code: "PVA", subfamilia: "T1", tipo_dinamica: "technical", tipologia_cliente: "loyal",       motivo: "Reposición esperada: ciclo de 21 días, 19 transcurridos. Cliente fiel con cadencia muy estable.",     urgencia_dias: 2,  prioridad_score: 7.1, impacto_estimado: 9200,  canal_recomendado: "rep",       gestor_responsable: "Pablo Mora",  plazo_dias: 5,  estado: "nueva" },
  { id: 99,  fecha: "2026-05-08", client_id: 3018, province: "Zaragoza",  region_code: "ARA", subfamilia: "T2", tipo_dinamica: "technical", tipologia_cliente: "promiscuous", motivo: "Caída sostenida: media 6m €2.100 → últimos 3m €580. Probable shift a competidor técnico.",          urgencia_dias: 9,  prioridad_score: 6.8, impacto_estimado: 5400,  canal_recomendado: "telesales", gestor_responsable: "Equipo TLV",  plazo_dias: 10, estado: "en_curso" },
  { id: 177, fecha: "2026-05-08", client_id: 5512, province: "Madrid",    region_code: "MAD", subfamilia: "C2", tipo_dinamica: "commodity", tipologia_cliente: "marginal",    motivo: "68 días sin actividad. Potencial anual estimado €3.200 según clínicas similares.",                  urgencia_dias: 14, prioridad_score: 5.3, impacto_estimado: 3200,  canal_recomendado: "marketing", gestor_responsable: "MKT auto.",   plazo_dias: 21, estado: "nueva" },
  { id: 184, fecha: "2026-05-08", client_id: 8821, province: "Málaga",    region_code: "AND", subfamilia: "C1", tipo_dinamica: "commodity", tipologia_cliente: "loyal",       motivo: "Pico estacional detectado. Cliente fiel, ventana de cross-sell con productos T1 abierta.",          urgencia_dias: 5,  prioridad_score: 6.5, impacto_estimado: 3400,  canal_recomendado: "rep",       gestor_responsable: "Ana Costa",   plazo_dias: 7,  estado: "nueva" },
  { id: 172, fecha: "2026-05-07", client_id: 4290, province: "Valencia",  region_code: "VAL", subfamilia: "T1", tipo_dinamica: "technical", tipologia_cliente: "at_risk",     motivo: "Frecuencia rota: pasó de pedido mensual a trimestral. Perdimos cuota frente a un competidor técnico.", urgencia_dias: 7,  prioridad_score: 7.6, impacto_estimado: 6700,  canal_recomendado: "rep",       gestor_responsable: "Mar García",  plazo_dias: 10, estado: "nueva" },
  { id: 151, fecha: "2026-05-07", client_id: 9930, province: "Madrid",    region_code: "MAD", subfamilia: "C1", tipo_dinamica: "commodity", tipologia_cliente: "loyal",       motivo: "Compra cada 35 días, hoy 33 transcurridos. Reposición prevista esta semana.",                       urgencia_dias: 4,  prioridad_score: 6.2, impacto_estimado: 2200,  canal_recomendado: "rep",       gestor_responsable: "Carlos Ruiz", plazo_dias: 7,  estado: "nueva" },
  { id: 118, fecha: "2026-05-06", client_id: 1102, province: "Bilbao",    region_code: "PVA", subfamilia: "T2", tipo_dinamica: "technical", tipologia_cliente: "promiscuous", motivo: "43 días desde última compra (media 30d). Patrón compatible con prueba de proveedor alternativo.",   urgencia_dias: 12, prioridad_score: 5.9, impacto_estimado: 4100,  canal_recomendado: "telesales", gestor_responsable: "Equipo TLV",  plazo_dias: 14, estado: "nueva" },
  { id: 87,  fecha: "2026-05-05", client_id: 7710, province: "Barcelona", region_code: "CAT", subfamilia: "T1", tipo_dinamica: "technical", tipologia_cliente: "loyal",       motivo: "Repuesto recurrente con margen alto. Cadencia 14 días, 12 transcurridos.",                          urgencia_dias: 3,  prioridad_score: 6.7, impacto_estimado: 5100,  canal_recomendado: "rep",       gestor_responsable: "Laura Vega",  plazo_dias: 5,  estado: "convertida" },
  { id: 73,  fecha: "2026-05-04", client_id: 6602, province: "Sevilla",   region_code: "AND", subfamilia: "C2", tipo_dinamica: "commodity", tipologia_cliente: "marginal",    motivo: "Cliente reactivado tras 90 días inactivo. Tres pedidos en 30d, validar si patrón se sostiene.",       urgencia_dias: 18, prioridad_score: 4.8, impacto_estimado: 980,   canal_recomendado: "marketing", gestor_responsable: "MKT auto.",   plazo_dias: 21, estado: "convertida" },
  { id: 65,  fecha: "2026-05-03", client_id: 4408, province: "Madrid",    region_code: "MAD", subfamilia: "C1", tipo_dinamica: "commodity", tipologia_cliente: "promiscuous", motivo: "Falsa alarma: la caída se debió a vacaciones. Stock confirmado por delegado.",                      urgencia_dias: 21, prioridad_score: 3.9, impacto_estimado: 1500,  canal_recomendado: "rep",       gestor_responsable: "Carlos Ruiz", plazo_dias: 14, estado: "desestimada" },
  { id: 58,  fecha: "2026-04-28", client_id: 2255, province: "Granada",   region_code: "AND", subfamilia: "T2", tipo_dinamica: "technical", tipologia_cliente: "at_risk",     motivo: "Plazo de gestión vencido sin contacto. Pasa a expirada.",                                            urgencia_dias: 30, prioridad_score: 3.2, impacto_estimado: 2900,  canal_recomendado: "rep",       gestor_responsable: "Pablo Mora",  plazo_dias: 14, estado: "expirada" },
  { id: 201, fecha: "2026-05-09", client_id: 3340, province: "Murcia",    region_code: "MUR", subfamilia: "T1", tipo_dinamica: "technical", tipologia_cliente: "promiscuous", motivo: "Patrón irregular reciente: dos compras pequeñas tras 60d de silencio. Probable test de Inibsa.",      urgencia_dias: 9,  prioridad_score: 5.7, impacto_estimado: 2400,  canal_recomendado: "telesales", gestor_responsable: "Equipo TLV",  plazo_dias: 14, estado: "nueva" },
  { id: 212, fecha: "2026-05-09", client_id: 7080, province: "Madrid",    region_code: "MAD", subfamilia: "T2", tipo_dinamica: "technical", tipologia_cliente: "loyal",       motivo: "Cliente top-10 nacional. Pico de cirugías estacional, riesgo de rotura en próxima semana.",          urgencia_dias: 4,  prioridad_score: 8.4, impacto_estimado: 14800, canal_recomendado: "rep",       gestor_responsable: "Mar García",  plazo_dias: 7,  estado: "nueva" },
];

const SUBFAMILY_NAME: Record<string, string> = {
  C1: "Anestésicos",
  C2: "Bioseguridad",
  T1: "Restauración",
  T2: "Cirugía",
};

const SIGNAL_TREND = [
  { m: "Jun '24", alerts: 88, converted: 22, fp: 19 },
  { m: "Jul '24", alerts: 96, converted: 28, fp: 21 },
  { m: "Ago '24", alerts: 92, converted: 26, fp: 22 },
  { m: "Sep '24", alerts: 104, converted: 31, fp: 23 },
  { m: "Oct '24", alerts: 110, converted: 33, fp: 22 },
  { m: "Nov '24", alerts: 117, converted: 37, fp: 24 },
  { m: "Dic '24", alerts: 109, converted: 35, fp: 21 },
  { m: "Ene '25", alerts: 121, converted: 39, fp: 22 },
  { m: "Feb '25", alerts: 124, converted: 41, fp: 21 },
  { m: "Mar '25", alerts: 119, converted: 39, fp: 19 },
  { m: "Abr '25", alerts: 130, converted: 44, fp: 20 },
  { m: "May '25", alerts: 127, converted: 42, fp: 18 },
];

const TIPOLOGIA_DIST = [
  { key: "loyal" as const, label: "Loyal", color: "#16a34a", micro: "cadencia estable" },
  { key: "promiscuous" as const, label: "Promiscuous", color: "#f59e0b", micro: "ventana de captura" },
  { key: "at_risk" as const, label: "At risk", color: "#E05540", micro: "deterioro sostenido" },
  { key: "marginal" as const, label: "Marginal", color: "#94a3b8", micro: "actividad residual" },
];

const ALERT_BY_TYPE = [
  { key: "DECLINE", label: "Deterioro sostenido", count: 47, color: "#E05540", desc: "Caída sostenida vs. baseline propio" },
  { key: "CAPTURE", label: "Captura", count: 83, color: "#f59e0b", desc: "Demanda probable no capturada por Inibsa" },
  { key: "REORDER", label: "Reposición", count: 31, color: "#16a34a", desc: "Próxima compra esperada de cliente fiel" },
];

type TipologiaKey = (typeof TIPOLOGIA_DIST)[number]["key"];

const TIP_META: Record<TipologiaKey, { label: string; fg: string; bg: string }> = {
  loyal: { label: "Loyal", fg: "#15803d", bg: "#E8F6EE" },
  promiscuous: { label: "Promiscuous", fg: "#B7791F", bg: "#FEF6E1" },
  at_risk: { label: "At risk", fg: "#C0432F", bg: "#FCE9E5" },
  marginal: { label: "Marginal", fg: "#5d6d7c", bg: "#EEF2F5" },
};

const TIPO_META: Record<"commodity" | "technical", { label: string; fg: string; bg: string }> = {
  commodity: { label: "Commodity", fg: "#2C7FB8", bg: "#E8F4FB" },
  technical: { label: "Technical", fg: "#6321d7", bg: "#F1ECFE" },
};

const STATE_META: Record<AlertItem["estado"], { label: string; fg: string; bg: string; color: string }> = {
  nueva: { label: "Nueva", fg: "#2C7FB8", bg: "#E8F4FB", color: "#45A0D5" },
  en_curso: { label: "En curso", fg: "#B7791F", bg: "#FEF6E1", color: "#f59e0b" },
  convertida: { label: "Convertida", fg: "#15803d", bg: "#E8F6EE", color: "#16a34a" },
  desestimada: { label: "Desestimada", fg: "#C0432F", bg: "#FCE9E5", color: "#E05540" },
  expirada: { label: "Expirada", fg: "#5d6d7c", bg: "#EEF2F5", color: "#94a3b8" },
};

const CHANNEL_META: Record<"rep" | "telesales" | "marketing", { label: string; fg: string; bg: string; color: string }> = {
  rep: { label: "Delegado", fg: "#174761", bg: "#dceaf3", color: "#174761" },
  telesales: { label: "Televenta", fg: "#6321d7", bg: "#F1ECFE", color: "#7C3AED" },
  marketing: { label: "Marketing auto.", fg: "#15803d", bg: "#E8F6EE", color: "#16a34a" },
};

const fmtEUR = (n: number) => "€" + Math.round(n).toLocaleString("es-ES");
const fmtPct = (n: number, digits = 0) => (n * 100).toFixed(digits).replace(".", ",") + "%";

/* ---------------- Hooks ---------------- */

function useAsync<T>(loader: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let alive = true;
    loader()
      .then((d) => {
        if (alive) {
          setData(d);
          setLive(true);
        }
      })
      .catch(() => {
        if (alive) setLive(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, live };
}

/* ---------------- Inibsa logo ---------------- */

function InibsaLogo({ size = 38 }: { size?: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: 1 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Inibsa">
        <path d="M 20 4 A 16 16 0 1 1 4.6 24" fill="none" stroke="#E05540" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M 20 13 A 7 7 0 1 1 14 24" fill="none" stroke="#E05540" strokeWidth="4.6" strokeLinecap="round" />
      </svg>
      <span
        style={{
          fontWeight: 800,
          fontSize: 26,
          color: "#45A0D5",
          letterSpacing: "-0.02em",
        }}
      >
        inibsa
      </span>
    </div>
  );
}

/* ---------------- Primitives ---------------- */

function Badge({ fg, bg, children, uc = false }: { fg: string; bg: string; children: React.ReactNode; uc?: boolean }) {
  return (
    <span className={uc ? "badge uc" : "badge"} style={{ color: fg, background: bg }}>
      {children}
    </span>
  );
}

function UrgencyPip({ d }: { d: number }) {
  const c = d <= 7 ? "#E05540" : d <= 14 ? "#f59e0b" : "#16a34a";
  return (
    <span className="urgency-pip" style={{ color: c }}>
      <span className="dot" style={{ background: c, width: 7, height: 7 }} /> {d}d
    </span>
  );
}

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <span className="dot" style={{ background: color, width: 9, height: 9 }} /> {label}
  </span>
);

type SelectOption = { v: string; l: string };

function SelectMenu({
  label,
  value,
  options,
  onChange,
  width = 160,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const cur = options.find((o) => o.v === value)?.l ?? options[0]?.l;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="filter" onClick={() => setOpen((o) => !o)} style={{ minWidth: width }}>
        <span className="filter-label">{label}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{cur}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 12px 28px rgba(20,50,80,.1)",
            padding: 4,
            minWidth: width,
            zIndex: 20,
          }}
        >
          {options.map((o) => (
            <div
              key={o.v}
              onClick={() => {
                onChange(o.v);
                setOpen(false);
              }}
              style={{
                padding: "7px 10px",
                borderRadius: 5,
                cursor: "pointer",
                fontSize: 13,
                background: value === o.v ? "var(--pulse-blue-soft)" : "transparent",
                color: value === o.v ? "var(--pulse-blue-deep)" : "var(--text)",
                fontWeight: value === o.v ? 600 : 400,
              }}
            >
              {o.l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StateChip({ label, n, color }: { label: string; n: number; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 9px",
        borderRadius: 4,
        background: "#fff",
        border: "1px solid var(--border)",
        fontSize: 11.5,
        color: "var(--text)",
      }}
    >
      <span className="dot" style={{ background: color, width: 7, height: 7 }} />
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <strong style={{ fontVariantNumeric: "tabular-nums" }}>{n}</strong>
    </span>
  );
}

function rate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function deriveMetricsFromAlerts(alerts: AlertItem[], fallback: Metrics): Metrics {
  if (!alerts.length) return fallback;

  const converted = alerts.filter((a) => a.estado === "convertida").length;
  const falsePositive = alerts.filter((a) => a.estado === "desestimada").length;
  const expired = alerts.filter((a) => a.estado === "expirada").length;
  const inProgress = alerts.filter((a) => a.estado === "en_curso").length;
  const closed = converted + falsePositive + expired;
  const touched = closed + inProgress;
  const atRiskClosed = alerts.filter(
    (a) => a.tipologia_cliente === "at_risk" && ["convertida", "desestimada", "expirada"].includes(a.estado),
  ).length;
  const atRiskRecovered = alerts.filter((a) => a.tipologia_cliente === "at_risk" && a.estado === "convertida").length;

  return {
    conversion_rate: rate(converted, closed),
    false_positive_rate: rate(falsePositive, closed),
    inactive_recovery_rate: atRiskClosed ? rate(atRiskRecovered, atRiskClosed) : rate(converted, closed),
    coverage_rate: rate(touched, alerts.length),
    actions: {
      closed,
      converted,
      false_positive: falsePositive,
      in_progress: inProgress,
    },
  };
}

/* ---------------- Tab 1 · Alert Center ---------------- */

type ToastFn = (msg: string, kind?: "info" | "success" | "error") => void;

function AlertCenter({
  alerts,
  setAlerts,
  stats,
  metrics,
  onToast,
}: {
  alerts: AlertItem[];
  setAlerts: React.Dispatch<React.SetStateAction<AlertItem[]>>;
  stats: Stats;
  metrics: Metrics;
  onToast: ToastFn;
}) {
  const [tipoFilter, setTipoFilter] = useState("all");
  const [tipologiaFilter, setTipologiaFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("activos");
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());

  const rows = useMemo(() => {
    return alerts
      .filter((r) => {
        if (tipoFilter !== "all" && r.tipo_dinamica !== tipoFilter) return false;
        if (tipologiaFilter !== "all" && r.tipologia_cliente !== tipologiaFilter) return false;
        if (estadoFilter === "activos" && !(r.estado === "nueva" || r.estado === "en_curso")) return false;
        if (
          estadoFilter === "resueltos" &&
          !(r.estado === "convertida" || r.estado === "desestimada" || r.estado === "expirada")
        )
          return false;
        if (
          estadoFilter !== "all" &&
          estadoFilter !== "activos" &&
          estadoFilter !== "resueltos" &&
          r.estado !== estadoFilter
        )
          return false;
        if (search) {
          const q = search.toLowerCase();
          const subName = (SUBFAMILY_NAME[r.subfamilia] ?? r.subfamilia).toLowerCase();
          if (
            !(
              (r.province ?? "").toLowerCase().includes(q) ||
              String(r.client_id).includes(search) ||
              subName.includes(q) ||
              r.motivo.toLowerCase().includes(q)
            )
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => b.prioridad_score - a.prioridad_score);
  }, [alerts, tipoFilter, tipologiaFilter, estadoFilter, search]);

  const prioColor = (d: number) => (d <= 7 ? "var(--pulse-coral)" : d <= 14 ? "#f59e0b" : "#16a34a");

  async function handleAction(alertId: number, resultado: ActionResultado) {
    const previous = alerts.find((a) => a.id === alertId);
    if (!previous) return;
    setPendingIds((s) => {
      const n = new Set(s);
      n.add(alertId);
      return n;
    });
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, estado: resultado } : a)));
    try {
      await postAction({
        alert_id: alertId,
        ejecutado_por: "demo_user",
        resultado,
        comentario: "Marcado desde Alert Center",
      });
      const labels: Record<ActionResultado, string> = {
        convertida: "convertida",
        desestimada: "descartada",
        en_curso: "marcada en curso",
        expirada: "expirada",
      };
      onToast(`Alerta #${alertId} ${labels[resultado]}`, "success");
    } catch {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, estado: previous.estado } : a)));
      onToast(`No se pudo registrar la acción en #${alertId}`, "error");
    } finally {
      setPendingIds((s) => {
        const n = new Set(s);
        n.delete(alertId);
        return n;
      });
    }
  }

  const counts = useMemo(() => {
    const c: Record<AlertItem["estado"], number> = {
      nueva: 0,
      en_curso: 0,
      convertida: 0,
      desestimada: 0,
      expirada: 0,
    };
    alerts.forEach((a) => {
      c[a.estado] = (c[a.estado] || 0) + 1;
    });
    return c;
  }, [alerts]);

  return (
    <div className="tab-view">
      {/* KPI cockpit */}
      <div className="section-head" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="section-title">Cockpit comercial</span>
          <span className="badge-soft" style={{ background: "var(--pulse-blue-soft)", color: "var(--pulse-blue-deep)" }}>
            ● LIVE
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Pipeline · riesgo · win-rate · cobertura</div>
      </div>
      <div className="stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "var(--pulse-blue)" }} />
          <div className="kpi-icon">
            <Euro size={15} />
          </div>
          <div className="kpi-lbl">Pipeline pendiente</div>
          <div className="kpi-num">{fmtEUR(stats.pipeline_eur)}</div>
          <div className="kpi-sub">impacto estimado activo</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: "58%", background: "var(--pulse-blue)" }} />
          </div>
        </div>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "var(--pulse-coral)" }} />
          <div className="kpi-icon" style={{ background: "var(--pulse-coral-bg)", color: "var(--pulse-coral-deep)" }}>
            <TrendingDown size={15} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div className="kpi-lbl">Críticas at-risk</div>
            <span className="badge uc" style={{ color: "#fff", background: "var(--pulse-coral)", fontSize: 9 }}>
              RIESGO
            </span>
          </div>
          <div className="kpi-num">{stats.by_tipologia.at_risk ?? 0}</div>
          <div className="kpi-sub">clientes con deterioro</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: "42%", background: "var(--pulse-coral)" }} />
          </div>
        </div>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "#16a34a" }} />
          <div className="kpi-icon" style={{ background: "var(--loyal-bg)", color: "#15803d" }}>
            <Target size={15} />
          </div>
          <div className="kpi-lbl">Win-rate</div>
          <div className="kpi-num">{fmtPct(metrics.conversion_rate)}</div>
          <div className="kpi-sub">convertidas / cerradas</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: `${metrics.conversion_rate * 100}%`, background: "#16a34a" }} />
          </div>
        </div>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "var(--pulse-blue-deep)" }} />
          <div className="kpi-icon" style={{ background: "#dceaf3", color: "var(--pulse-blue-deep)" }}>
            <GaugeIcon size={15} />
          </div>
          <div className="kpi-lbl">Cobertura &lt;48h</div>
          <div className="kpi-num">{fmtPct(metrics.coverage_rate)}</div>
          <div className="kpi-sub">acciones registradas en plazo</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: `${metrics.coverage_rate * 100}%`, background: "var(--pulse-blue-deep)" }} />
          </div>
        </div>
      </div>

      {/* Quick state strip */}
      <div
        className="card"
        style={{
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Inbox size={15} style={{ color: "var(--pulse-blue-strong)" }} />
          <span style={{ fontSize: 13, color: "var(--pulse-blue-deep)", fontWeight: 700 }}>Cola comercial</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StateChip label="Nueva" n={counts.nueva} color="#45A0D5" />
          <StateChip label="En curso" n={counts.en_curso} color="#f59e0b" />
          <StateChip label="Convertida" n={counts.convertida} color="#16a34a" />
          <StateChip label="Desestimada" n={counts.desestimada} color="#E05540" />
          <StateChip label="Expirada" n={counts.expirada} color="#94a3b8" />
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-faint)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className="live-dot" />
          Última sincronización 09:14
        </div>
      </div>

      {/* TABLE */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>¿A quién llamar hoy?</h3>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 24,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "var(--pulse-coral-bg)",
                  color: "var(--pulse-coral-deep)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: ".05em",
                }}
              >
                {rows.length} EN COLA
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Ordenadas por prioridad, urgencia e impacto estimado · A quién, qué venderle, por qué motivo
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <SelectMenu
              label="Estado"
              value={estadoFilter}
              options={[
                { v: "activos", l: "Activas" },
                { v: "all", l: "Todas" },
                { v: "nueva", l: "Nuevas" },
                { v: "en_curso", l: "En curso" },
                { v: "resueltos", l: "Resueltas" },
              ]}
              onChange={setEstadoFilter}
              width={140}
            />
            <SelectMenu
              label="Tipo"
              value={tipoFilter}
              options={[
                { v: "all", l: "Todos" },
                { v: "commodity", l: "Commodity" },
                { v: "technical", l: "Technical" },
              ]}
              onChange={setTipoFilter}
              width={140}
            />
            <SelectMenu
              label="Segmento"
              value={tipologiaFilter}
              options={[
                { v: "all", l: "Todos" },
                { v: "loyal", l: "Loyal" },
                { v: "promiscuous", l: "Promiscuous" },
                { v: "at_risk", l: "At risk" },
                { v: "marginal", l: "Marginal" },
              ]}
              onChange={setTipologiaFilter}
              width={170}
            />
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-faint)",
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: 28, width: 200 }}
                placeholder="Cliente, motivo, provincia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="alerts">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Provincia</th>
                <th>Qué vender</th>
                <th>Motivo</th>
                <th>Urgencia</th>
                <th style={{ textAlign: "right" }}>Impacto €</th>
                <th>Canal</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tip = TIP_META[r.tipologia_cliente];
                const tipo = TIPO_META[r.tipo_dinamica];
                const est = STATE_META[r.estado];
                const can = CHANNEL_META[r.canal_recomendado];
                const isPending = pendingIds.has(r.id);
                const isResolved = r.estado === "convertida" || r.estado === "desestimada" || r.estado === "expirada";
                const subName = SUBFAMILY_NAME[r.subfamilia] ?? r.subfamilia;
                const cls = (isResolved ? "resolved " : "") + (isPending ? "pending" : "");
                return (
                  <tr key={r.id} className={cls.trim() || undefined} style={{ ["--prio" as never]: prioColor(r.urgencia_dias) }}>
                    <td
                      style={{
                        fontFamily: "ui-monospace, Menlo, monospace",
                        color: "var(--pulse-blue-deep)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      #{r.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12.5, fontFamily: "ui-monospace, Menlo, monospace" }}>
                        CL-{r.client_id}
                      </div>
                      <div style={{ marginTop: 3 }}>
                        <Badge fg={tip.fg} bg={tip.bg}>{tip.label}</Badge>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{r.province ?? "—"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontFamily: "ui-monospace, Menlo, monospace",
                            fontSize: 11.5,
                            color: "var(--text-muted)",
                          }}
                        >
                          {r.subfamilia}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{subName}</span>
                      </div>
                      <div style={{ marginTop: 3 }}>
                        <Badge fg={tipo.fg} bg={tipo.bg}>{tipo.label}</Badge>
                      </div>
                    </td>
                    <td>
                      <div className="reason-cell">{r.motivo}</div>
                    </td>
                    <td>
                      <UrgencyPip d={r.urgencia_dias} />
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        fontSize: 13.5,
                        color: "var(--pulse-blue-deep)",
                      }}
                    >
                      {fmtEUR(r.impacto_estimado)}
                    </td>
                    <td>
                      <Badge fg={can.fg} bg={can.bg}>{can.label}</Badge>
                    </td>
                    <td>
                      <Badge fg={est.fg} bg={est.bg}>{est.label}</Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {isPending ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          <span className="row-spinner" /> Registrando…
                        </span>
                      ) : (
                        <div style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end" }}>
                          <button
                            className="action-btn success"
                            disabled={isPending || r.estado === "convertida"}
                            onClick={() => handleAction(r.id, "convertida")}
                            title="Marcar como convertida"
                          >
                            <CheckCircle size={12} /> <span>Convertido</span>
                          </button>
                          <button
                            className="action-btn progress"
                            disabled={isPending || r.estado === "en_curso"}
                            onClick={() => handleAction(r.id, "en_curso")}
                            title="Marcar en curso"
                          >
                            <Phone size={12} />
                          </button>
                          <button
                            className="action-btn danger"
                            disabled={isPending || r.estado === "desestimada"}
                            onClick={() => handleAction(r.id, "desestimada")}
                            title="Descartar alerta"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No hay alertas con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid var(--border)",
            background: "#FAFCFE",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={11} style={{ color: "var(--amber-text)" }} />
            <span>La actividad de competencia se infiere, no se observa directamente.</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={11} />
            POST /actions · estados sincronizados con backend
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tab 2 · Dashboard ---------------- */

const SOW_BASE: Record<TipologiaKey, number> = {
  loyal: 85,
  promiscuous: 45,
  at_risk: 65,
  marginal: 10,
};

type ScatterDot = {
  x: number;
  y: number;
  z: number;
  client_id: number;
  impacto: number;
  urgencia: number;
  tipo: TipologiaKey;
  motivo: string;
};

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterDot }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const meta = TIP_META[d.tipo];
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: 12,
        boxShadow: "0 8px 24px rgba(20,50,80,.08)",
        maxWidth: 280,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, color: "var(--pulse-blue-deep)" }}>
          CL-{d.client_id}
        </span>
        <span className="badge" style={{ color: meta.fg, background: meta.bg, fontSize: 9 }}>{meta.label}</span>
      </div>
      <div style={{ display: "flex", gap: 10, color: "var(--text-muted)", fontSize: 11.5, marginBottom: 5 }}>
        <span>SoW <strong style={{ color: "var(--text)" }}>{d.x}%</strong></span>
        <span>Urg. <strong style={{ color: "var(--text)" }}>{d.urgencia}d</strong></span>
        <span>Imp. <strong style={{ color: "var(--text)" }}>{fmtEUR(d.impacto)}</strong></span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.4 }}>{d.motivo}</div>
    </div>
  );
}

function ScatterOpportunities({ alerts }: { alerts: AlertItem[] }) {
  const data: ScatterDot[] = useMemo(
    () =>
      alerts.map((a) => {
        const jitter = (a.id % 11) - 5;
        const sow = Math.max(0, Math.min(100, SOW_BASE[a.tipologia_cliente] + jitter));
        return {
          x: sow,
          y: a.urgencia_dias,
          z: a.impacto_estimado,
          client_id: a.client_id,
          impacto: a.impacto_estimado,
          urgencia: a.urgencia_dias,
          tipo: a.tipologia_cliente,
          motivo: a.motivo,
        };
      }),
    [alerts],
  );
  const grouped = useMemo(
    () => ({
      loyal: data.filter((d) => d.tipo === "loyal"),
      promiscuous: data.filter((d) => d.tipo === "promiscuous"),
      at_risk: data.filter((d) => d.tipo === "at_risk"),
      marginal: data.filter((d) => d.tipo === "marginal"),
    }),
    [data],
  );

  const renderDot = (color: string) => (props: { cx?: number; cy?: number; payload?: ScatterDot }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return <g />;
    const minI = 500,
      maxI = 15000;
    const t = Math.min(1, Math.max(0, (payload.impacto - minI) / (maxI - minI)));
    const r = 6 + t * 12;
    return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1.5} />;
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="panel-head">
        <div>
          <h3>Mapa de oportunidades</h3>
          <div className="sub">SoW inferido, urgencia e impacto estimado por cliente</div>
        </div>
        <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 18, right: 24, bottom: 30, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e6eef4" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tick={{ fill: "#8aa6b6", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Share of Wallet →",
              position: "insideBottom",
              offset: -12,
              fill: "#5a7a8a",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[35, 0]}
            reversed
            ticks={[0, 7, 14, 21, 28, 35]}
            tick={{ fill: "#8aa6b6", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Urgencia (días)",
              angle: -90,
              position: "insideLeft",
              offset: 14,
              fill: "#5a7a8a",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <ZAxis dataKey="z" range={[60, 400]} />

          <ReferenceArea x1={0} x2={40} y1={0} y2={10} fill="#E05540" fillOpacity={0.06} stroke="#E05540" strokeOpacity={0.18}>
            <Label value="CAPTURA URGENTE" position="insideTopLeft" offset={8} fill="#C0432F" fontSize={9.5} fontWeight={700} />
          </ReferenceArea>
          <ReferenceArea x1={40} x2={70} y1={0} y2={35} fill="#f59e0b" fillOpacity={0.04} stroke="#f59e0b" strokeOpacity={0.14}>
            <Label value="DESARROLLO" position="insideTopLeft" offset={8} fill="#B7791F" fontSize={9.5} fontWeight={700} />
          </ReferenceArea>
          <ReferenceArea x1={70} x2={100} y1={0} y2={35} fill="#16a34a" fillOpacity={0.04} stroke="#16a34a" strokeOpacity={0.14}>
            <Label value="FIDELIZACIÓN" position="insideTopRight" offset={8} fill="#15803d" fontSize={9.5} fontWeight={700} />
          </ReferenceArea>

          <Tooltip cursor={{ strokeDasharray: "2 3", stroke: "#b6d3e6" }} content={<ScatterTooltip />} />
          <Scatter name="Loyal" data={grouped.loyal} shape={renderDot("#16a34a")} />
          <Scatter name="Promiscuous" data={grouped.promiscuous} shape={renderDot("#f59e0b")} />
          <Scatter name="At risk" data={grouped.at_risk} shape={renderDot("#E05540")} />
          <Scatter name="Marginal" data={grouped.marginal} shape={renderDot("#94a3b8")} />
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)", marginTop: 6, flexWrap: "wrap" }}>
        <LegendDot color="#16a34a" label="Loyal" />
        <LegendDot color="#f59e0b" label="Promiscuous" />
        <LegendDot color="#E05540" label="At risk" />
        <LegendDot color="#94a3b8" label="Marginal" />
        <span style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 10.5 }}>
          SoW aproximado por tipología; competencia inferida, no observada
        </span>
      </div>
    </div>
  );
}

function ChannelDonut({ alerts }: { alerts: AlertItem[] }) {
  const data = useMemo(() => {
    const groups: Record<"rep" | "telesales" | "marketing", number> = { rep: 0, telesales: 0, marketing: 0 };
    alerts.forEach((a) => {
      groups[a.canal_recomendado] = (groups[a.canal_recomendado] || 0) + 1;
    });
    return [
      { key: "rep" as const, name: "Delegado", value: groups.rep, color: "#45A0D5" },
      { key: "telesales" as const, name: "Televenta", value: groups.telesales, color: "#7C3AED" },
      { key: "marketing" as const, name: "Marketing auto.", value: groups.marketing, color: "#16a34a" },
    ];
  }, [alerts]);
  const total = data.reduce((s, d) => s + d.value, 0);

  const gestores = useMemo(() => {
    const groups: Record<string, { count: number; impact: number; channel: AlertItem["canal_recomendado"] }> = {};
    alerts.forEach((a) => {
      if (a.estado !== "nueva" && a.estado !== "en_curso") return;
      const key = a.gestor_responsable || "—";
      if (!groups[key]) groups[key] = { count: 0, impact: 0, channel: a.canal_recomendado };
      groups[key].count += 1;
      groups[key].impact += a.impacto_estimado;
    });
    return Object.entries(groups)
      .map(([g, v]) => ({ g, ...v }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 4);
  }, [alerts]);
  const maxImpact = Math.max(...gestores.map((l) => l.impact), 1);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="panel-head">
        <div>
          <h3>Alertas por canal</h3>
          <div className="sub">Distribución de gestión recomendada</div>
        </div>
        <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={56} outerRadius={78} paddingAngle={2} stroke="none">
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, _n, p: { payload?: { name: string } }) => [
                  `${v} (${total ? Math.round((v / total) * 100) : 0}%)`,
                  p.payload?.name ?? "",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-.02em",
                fontVariantNumeric: "tabular-nums",
                color: "var(--pulse-blue-deep)",
              }}
            >
              {total}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>alertas</div>
          </div>
        </div>
        <div className="legend-row" style={{ flex: 1 }}>
          {data.map((d) => (
            <div key={d.key} className="lr">
              <span className="dot" style={{ background: d.color, width: 9, height: 9 }} />
              <span>{d.name}</span>
              <span className="pct">
                {d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--pulse-blue-deep)" }}>Carga por gestor</span>
          <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>activas en cola</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {gestores.map((l) => {
            const can = CHANNEL_META[l.channel];
            return (
              <div key={l.g} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: can.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: "var(--text)", minWidth: 84 }}>{l.g}</span>
                <div style={{ flex: 1, height: 5, background: "#F1F6FA", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(l.impact / maxImpact) * 100}%`, background: can.color }} />
                </div>
                <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", fontSize: 10.5 }}>
                  {l.count}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 48,
                    textAlign: "right",
                    color: "var(--pulse-blue-deep)",
                  }}
                >
                  {fmtEUR(l.impact)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StackedStateChart({ alerts }: { alerts: AlertItem[] }) {
  const data = useMemo(() => {
    const empty = { nueva: 0, en_curso: 0, convertida: 0, desestimada: 0, expirada: 0 };
    const groups = {
      commodity: { name: "Commodity", ...empty },
      technical: { name: "Technical", ...empty },
    };
    alerts.forEach((a) => {
      const g = groups[a.tipo_dinamica];
      g[a.estado] = (g[a.estado] || 0) + 1;
    });
    return [groups.commodity, groups.technical];
  }, [alerts]);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="panel-head">
        <div>
          <h3>Estado por categoría</h3>
          <div className="sub">Avance operativo por dinámica de producto</div>
        </div>
        <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e6eef4" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#5a7a8a", fontSize: 11.5, fontWeight: 600 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#8aa6b6", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="nueva" name="Nueva" stackId="s" fill="#45A0D5" />
          <Bar dataKey="en_curso" name="En curso" stackId="s" fill="#f59e0b" />
          <Bar dataKey="convertida" name="Convertida" stackId="s" fill="#16a34a" />
          <Bar dataKey="desestimada" name="Desestimada" stackId="s" fill="#E05540" />
          <Bar dataKey="expirada" name="Expirada" stackId="s" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TipologiaDonutCard({ alerts }: { alerts: AlertItem[] }) {
  const data = useMemo(() => {
    const groups: Record<TipologiaKey, number> = { loyal: 0, promiscuous: 0, at_risk: 0, marginal: 0 };
    alerts.forEach((a) => {
      groups[a.tipologia_cliente] = (groups[a.tipologia_cliente] || 0) + 1;
    });
    return TIPOLOGIA_DIST.map((t) => ({ ...t, count: groups[t.key] || 0 }));
  }, [alerts]);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="panel-head">
        <div>
          <h3>Tipología de clientes</h3>
          <div className="sub">Segmentación accionable por lógica de intervención</div>
        </div>
        <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 170, height: 170, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
                {data.map((t, i) => (
                  <Cell key={i} fill={t.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, _n, p: { payload?: { label: string } }) => [
                  `${v} (${total ? Math.round((v / total) * 100) : 0}%)`,
                  p.payload?.label ?? "",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-.02em",
                fontVariantNumeric: "tabular-nums",
                color: "var(--pulse-blue-deep)",
              }}
            >
              {total}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>en cola</div>
          </div>
        </div>
        <div className="legend-row" style={{ flex: 1 }}>
          {data.map((t) => (
            <div key={t.key} className="lr">
              <span className="dot" style={{ background: t.color, width: 9, height: 9 }} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{t.label}</span>
                <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{t.micro}</span>
              </div>
              <span className="pct">{t.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsByType() {
  const total = ALERT_BY_TYPE.reduce((s, a) => s + a.count, 0);
  const max = Math.max(...ALERT_BY_TYPE.map((a) => a.count));
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="panel-head">
        <div>
          <h3>Alertas por tipo</h3>
          <div className="sub">Triage comercial por motivo de la señal</div>
        </div>
        <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
        {ALERT_BY_TYPE.map((a) => {
          const pct = ((a.count / total) * 100).toFixed(0);
          return (
            <div key={a.key} title={a.desc} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{a.label}</span>
                  <span
                    style={{
                      fontSize: 9.5,
                      color: "var(--text-faint)",
                      fontFamily: "ui-monospace, Menlo, monospace",
                      letterSpacing: ".05em",
                    }}
                  >
                    {a.key}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: a.color }}>{a.count}</span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: 8, background: "#F1F6FA", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(a.count / max) * 100}%`,
                    background: a.color,
                    borderRadius: 4,
                    transition: "width .8s cubic-bezier(.2,.7,.2,1)",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{a.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardView({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="tab-view">
      <div className="section-head">
        <span className="section-title">¿Dónde están las oportunidades?</span>
        <span className="badge-soft" style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          CONTEXTO DE DECISIÓN
        </span>
        <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>
          Snapshot{" "}
          {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
        <ScatterOpportunities alerts={alerts} />
        <ChannelDonut alerts={alerts} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <StackedStateChart alerts={alerts} />
        <TipologiaDonutCard alerts={alerts} />
        <AlertsByType />
      </div>
    </div>
  );
}

/* ---------------- Tab 3 · Métricas ---------------- */

function GaugeView({
  value,
  color,
  size = 120,
  label,
  sub,
}: {
  value: number;
  color: string;
  size?: number;
  label: string;
  sub?: string;
}) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg className="gauge-svg" width={size} height={size}>
          <circle className="gauge-bg" cx={size / 2} cy={size / 2} r={r} />
          <circle
            className="gauge-fg"
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeDasharray={c}
            strokeDashoffset={off}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-.02em",
              color: "var(--pulse-blue-deep)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtPct(value)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>
        </div>
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "center", maxWidth: 160, lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  sub: string;
}) {
  return (
    <div
      style={{
        padding: "14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        position: "relative",
        overflow: "hidden",
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 6,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: color }} />
      <div style={{ display: "flex", alignItems: "center", gap: 7, color, paddingLeft: 6 }}>
        {icon}
        <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 700 }}>{label}</span>
      </div>
      <div
        style={{
          paddingLeft: 6,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-.02em",
          fontVariantNumeric: "tabular-nums",
          color: "var(--text)",
        }}
      >
        {value}
      </div>
      <div style={{ paddingLeft: 6, fontSize: 11, color: "var(--text-faint)" }}>{sub}</div>
    </div>
  );
}

function MetricsView({ metrics }: { metrics: Metrics }) {
  const A = metrics.actions;
  const total = A.closed + A.in_progress;
  const funnelData = [
    { stage: "Generadas", n: total + 24, color: "#45A0D5" },
    { stage: "Asignadas", n: total + 8, color: "#2C7FB8" },
    { stage: "En curso", n: A.in_progress + A.closed, color: "#174761" },
    { stage: "Cerradas", n: A.closed, color: "#16a34a" },
    { stage: "Convertidas", n: A.converted, color: "#15803d" },
  ];
  const maxF = Math.max(funnelData[0].n, 1);

  const channelPerf = [
    { channel: "Delegado", sent: 54, converted: 22, rate: 0.41, color: "#174761", bg: "#dceaf3" },
    { channel: "Televenta", sent: 38, converted: 11, rate: 0.29, color: "#6321d7", bg: "#F1ECFE" },
    { channel: "Marketing auto.", sent: 27, converted: 6, rate: 0.22, color: "#15803d", bg: "#E8F6EE" },
  ];

  return (
    <div className="tab-view">
      <div className="section-head">
        <span className="section-title">Aprendizaje y outcome</span>
        <span className="badge-soft" style={{ background: "var(--pulse-blue-soft)", color: "var(--pulse-blue-deep)" }}>
          ● LIVE
        </span>
        <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>
          Ventana: últimos 30 días · 09 abr → 09 may 2026
        </span>
      </div>

      <div className="card" style={{ padding: "22px 18px", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <GaugeView value={metrics.conversion_rate} color="#16a34a" label="Conversión" sub="Alertas que terminan en pedido confirmado" />
          <GaugeView value={metrics.inactive_recovery_rate} color="#2C7FB8" label="Recuperación" sub="Clientes at-risk recuperados tras outreach" />
          <GaugeView value={metrics.coverage_rate} color="var(--pulse-blue)" label="Cobertura" sub="Clientes activos tocados por una alerta" />
          <GaugeView value={metrics.false_positive_rate} color="#f59e0b" label="Falsos positivos" sub="Alertas marcadas como no relevantes" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Volumen de señal — últimos 12 meses</h3>
              <div className="sub">Alertas generadas, convertidas y desestimadas</div>
            </div>
            <span className="badge-soft" style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              JUN 2024 → MAY 2026
            </span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={SIGNAL_TREND} margin={{ top: 8, right: 6, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="gAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#45A0D5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#45A0D5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#e6eef4" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "#8aa6b6", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8aa6b6", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="alerts" stroke="#45A0D5" strokeWidth={2} fill="url(#gAlerts)" name="Alertas" />
              <Line type="monotone" dataKey="converted" stroke="#16a34a" strokeWidth={2} dot={false} name="Convertidas" />
              <Line type="monotone" dataKey="fp" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Falsos positivos" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            <LegendDot color="#45A0D5" label="Alertas" />
            <LegendDot color="#16a34a" label="Convertidas" />
            <LegendDot color="#f59e0b" label="Falsos positivos" />
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Funnel de acción — 30 días</h3>
              <div className="sub">De señal a pedido confirmado</div>
            </div>
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {funnelData.map((f, i) => (
              <div key={f.stage} className="funnel-step" style={{ borderLeft: `3px solid ${f.color}` }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)", width: 14, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{f.stage}</span>
                <div style={{ flex: 2, height: 8, background: "#F1F6FA", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(f.n / maxF) * 100}%`,
                      background: f.color,
                      transition: "width .8s cubic-bezier(.2,.7,.2,1)",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 34,
                    textAlign: "right",
                  }}
                >
                  {f.n}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background: "var(--pulse-blue-soft)",
              borderRadius: 6,
              fontSize: 11.5,
              color: "var(--pulse-blue-deep)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Conversión end-to-end</span>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmtPct(funnelData[0].n ? A.converted / funnelData[0].n : 0, 1)}
            </strong>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Rendimiento por canal</h3>
              <div className="sub">Outreach enviado vs. convertido (30 días)</div>
            </div>
            <span className="badge-soft" style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              30 D
            </span>
          </div>
          <table className="alerts" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Canal</th>
                <th style={{ textAlign: "right" }}>Enviadas</th>
                <th style={{ textAlign: "right" }}>Convertidas</th>
                <th style={{ textAlign: "right" }}>Tasa</th>
              </tr>
            </thead>
            <tbody>
              {channelPerf.map((c) => (
                <tr key={c.channel}>
                  <td>
                    <Badge fg={c.color} bg={c.bg}>{c.channel}</Badge>
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{c.sent}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{c.converted}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "#F1F6FA", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${c.rate * 100}%`, background: "#16a34a" }} />
                      </div>
                      <strong style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "right" }}>
                        {fmtPct(c.rate)}
                      </strong>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Action breakdown — 30 días</h3>
              <div className="sub">Resultado de la cola comercial</div>
            </div>
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ActionCard icon={<CheckCircle size={14} />} label="Cerradas" value={A.closed} color="#16a34a" sub="resueltas por el delegado" />
            <ActionCard icon={<Target size={14} />} label="Convertidas" value={A.converted} color="#15803d" sub="terminaron en pedido" />
            <ActionCard icon={<Clock size={14} />} label="En curso" value={A.in_progress} color="#f59e0b" sub="abiertas en cola" />
            <ActionCard
              icon={<AlertTriangle size={14} />}
              label="Falsos positivos"
              value={A.false_positive}
              color="#E05540"
              sub="descartadas por el equipo"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Chat panel ---------------- */

const SUGGESTIONS = [
  "Dame las 5 alertas más prioritarias",
  "Gráfico de barras: top 5 por impacto",
  "Clientes at-risk en Madrid",
  "Redacta un email para el cliente 1000077009",
  "Explica la alerta 2627",
];

type ChatBubble =
  | { role: "user"; text: string }
  | { role: "bot"; kind: "plain"; text: string }
  | { role: "bot"; kind: "table"; intro: string; rows: string[][]; foot: string }
  | { role: "bot"; kind: "email"; subject: string; body: string[] }
  | { role: "bot"; kind: "chart"; spec: ChartSpec };

const CHAT_INTRO =
  "Estoy conectado a las alertas reales. Pregúntame por prioridades, provincias, clientes o borradores comerciales.";

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const token = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const raw = match[0];
    const key = `${match.index}-${raw}`;
    if (raw.startsWith("**")) parts.push(<strong key={key}>{raw.slice(2, -2)}</strong>);
    else if (raw.startsWith("`")) parts.push(<code key={key}>{raw.slice(1, -1)}</code>);
    else parts.push(<em key={key}>{raw.slice(1, -1)}</em>);
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownSeparator(line: string) {
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    if (line.startsWith("|") && lines[i + 1]?.trim().startsWith("|") && isMarkdownSeparator(lines[i + 1])) {
      const header = splitTableRow(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        body.push(splitTableRow(lines[i]));
        i += 1;
      }
      nodes.push(
        <div className="markdown-table-wrap" key={`table-${i}`}>
          <table>
            <thead>
              <tr>
                {header.map((h) => (
                  <th key={h}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, idx) => (
                <tr key={`${idx}-${row.join("-")}`}>
                  {row.map((cell, cidx) => (
                    <td key={cidx}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${i}`}>
          {items.map((item, idx) => (
            <li key={`${idx}-${item}`}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      nodes.push(<blockquote key={`q-${i}`}>{renderInline(quote.join(" "))}</blockquote>);
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith(">")
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    paragraph.forEach((p, idx) => {
      nodes.push(<p key={`p-${i}-${idx}`}>{renderInline(p)}</p>);
    });
  }

  return <>{nodes}</>;
}

const CHART_PALETTE = ["#1F6FEB", "#C0432F", "#E0A23A", "#2FB48A", "#6321D7", "#666"];

function ChartBubble({ spec }: { spec: ChartSpec }) {
  const { chart_type, data, x_key, y_key, title, caption } = spec;
  return (
    <div className="msg-bot" style={{ padding: 12, width: "90%" }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--pulse-blue-deep)" }}>{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        {chart_type === "line" ? (
          <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey={x_key} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey={y_key} stroke={CHART_PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : chart_type === "bar" ? (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey={x_key} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={y_key} fill={CHART_PALETTE[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <PieChart>
            <Tooltip wrapperStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Pie data={data} dataKey={y_key} nameKey={x_key} outerRadius={70} label={{ fontSize: 10 }}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
      {caption && (
        <div style={{ marginTop: 6, fontSize: 11.5, fontStyle: "italic", opacity: 0.7 }}>{caption}</div>
      )}
    </div>
  );
}

function normalizeQuery(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractChartLimit(text: string, fallback = 5) {
  const match = text.match(/\b(\d{1,2})\b/);
  if (!match) return fallback;
  return Math.min(Math.max(Number(match[1]), 1), 10);
}

function formatRoundedEUR(value: number) {
  return `${Math.round(value).toLocaleString("es-ES")}€`;
}

function relevantAlertsForQuery(text: string, alerts: AlertItem[]) {
  const q = normalizeQuery(text);
  let scoped = alerts;

  const provinceHit = alerts.find((a) => a.province && q.includes(normalizeQuery(a.province)));
  if (provinceHit?.province) {
    const province = normalizeQuery(provinceHit.province);
    scoped = scoped.filter((a) => a.province && normalizeQuery(a.province) === province);
  }

  if (q.includes("at-risk") || q.includes("at risk") || q.includes("riesgo") || q.includes("risc")) {
    scoped = scoped.filter((a) => a.tipologia_cliente === "at_risk");
  } else if (q.includes("promiscu")) {
    scoped = scoped.filter((a) => a.tipologia_cliente === "promiscuous");
  } else if (q.includes("loyal") || q.includes("leal") || q.includes("fiel")) {
    scoped = scoped.filter((a) => a.tipologia_cliente === "loyal");
  } else if (q.includes("marginal")) {
    scoped = scoped.filter((a) => a.tipologia_cliente === "marginal");
  }

  if (q.includes("commodity")) {
    scoped = scoped.filter((a) => a.tipo_dinamica === "commodity");
  } else if (q.includes("technical") || q.includes("tecnico")) {
    scoped = scoped.filter((a) => a.tipo_dinamica === "technical");
  }

  return scoped.length ? scoped : alerts;
}

function priorityLineChart(alerts: AlertItem[], limit: number): ChartSpec | null {
  const top = [...alerts].sort((a, b) => b.prioridad_score - a.prioridad_score).slice(0, limit);
  if (top.length < 2) return null;
  return {
    chart_type: "line",
    data: top.map((a, idx) => ({
      alerta: `${idx + 1} · #${a.id}`,
      prioridad: Number(a.prioridad_score.toFixed(2)),
    })),
    x_key: "alerta",
    y_key: "prioridad",
    title: `Curva de prioridad de las ${top.length} alertas principales`,
    caption: "Ranking descendente por prioridad_score; la pendiente muestra cuánto cae la urgencia comercial.",
  };
}

function impactBarChart(alerts: AlertItem[], limit: number): ChartSpec | null {
  const top = [...alerts].sort((a, b) => b.impacto_estimado - a.impacto_estimado).slice(0, limit);
  if (top.length < 2) return null;
  return {
    chart_type: "bar",
    data: top.map((a) => ({ alerta: `#${a.id}`, impacto: Math.round(a.impacto_estimado) })),
    x_key: "alerta",
    y_key: "impacto",
    title: `Top ${top.length} alertas por impacto estimado`,
    caption: "Impacto estimado en euros, calculado desde las alertas cargadas en el dashboard.",
  };
}

function distributionPieChart(alerts: AlertItem[], key: keyof AlertItem, label: string): ChartSpec | null {
  const counts = alerts.reduce<Record<string, number>>((acc, alert) => {
    const name = String(alert[key] ?? "sin dato");
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([categoria, alertas]) => ({ categoria, alertas }));
  if (data.length < 2) return null;
  return {
    chart_type: "pie",
    data,
    x_key: "categoria",
    y_key: "alertas",
    title: `Distribución de alertas por ${label}`,
    caption: "Distribución calculada desde las alertas cargadas en el dashboard.",
  };
}

function implicitChartsForQuery(text: string, alerts: AlertItem[]): ChartSpec[] {
  const q = normalizeQuery(text);
  if (!alerts.length) return [];

  const asksAboutAlerts =
    q.includes("alerta") || q.includes("cliente") || q.includes("prioridad") || q.includes("urgent") || q.includes("riesgo");
  if (!asksAboutAlerts) return [];

  const scoped = relevantAlertsForQuery(text, alerts);
  const limit = extractChartLimit(q, 5);

  if (q.includes("distribucion") || q.includes("reparto") || q.includes("proporcion") || q.includes("tipologia")) {
    const chart = distributionPieChart(scoped, "tipologia_cliente", "tipología");
    return chart ? [chart] : [];
  }

  if (q.includes("canal")) {
    const chart = distributionPieChart(scoped, "canal_recomendado", "canal");
    return chart ? [chart] : [];
  }

  if (q.includes("estado")) {
    const chart = distributionPieChart(scoped, "estado", "estado");
    return chart ? [chart] : [];
  }

  if (q.includes("impacto") || q.includes("pipeline") || q.includes("€")) {
    const chart = impactBarChart(scoped, limit);
    return chart ? [chart] : [];
  }

  if (
    q.includes("prioritaria") ||
    q.includes("prioritario") ||
    q.includes("prioridad") ||
    q.includes("urgente") ||
    q.includes("at-risk") ||
    q.includes("at risk") ||
    q.includes("riesgo") ||
    q.includes("risc")
  ) {
    const chart = priorityLineChart(scoped, limit);
    return chart ? [chart] : [];
  }

  return [];
}

function chartResponseFromAlerts(text: string, alerts: AlertItem[]): { content: string; charts: ChartSpec[] } | null {
  const q = normalizeQuery(text);
  const wantsChart = [
    "grafico",
    "grafic",
    "chart",
    "barra",
    "barres",
    "barras",
    "pie",
    "pastel",
    "distribucion",
    "evolucion",
    "linea",
  ].some((word) => q.includes(word));
  if (!wantsChart || alerts.length === 0) return null;

  if (
    q.includes("prioritaria") ||
    q.includes("prioritario") ||
    q.includes("prioridad") ||
    q.includes("urgente") ||
    q.includes("at-risk") ||
    q.includes("at risk") ||
    q.includes("riesgo") ||
    q.includes("risc")
  ) {
    const scoped = relevantAlertsForQuery(text, alerts);
    const limit = extractChartLimit(q);
    const spec = priorityLineChart(scoped, limit);
    if (!spec) return null;
    const leader = [...scoped].sort((a, b) => b.prioridad_score - a.prioridad_score)[0];
    return {
      content: `La alerta más prioritaria es **#${leader.id}**, cliente **${leader.client_id}**, con score **${leader.prioridad_score.toFixed(2)}**.`,
      charts: [spec],
    };
  }

  if (q.includes("impacto") || q.includes("ranking") || q.includes("top") || q.includes("barra") || q.includes("barres")) {
    const limit = extractChartLimit(q);
    const scoped = relevantAlertsForQuery(text, alerts);
    const top = [...scoped].sort((a, b) => b.impacto_estimado - a.impacto_estimado).slice(0, limit);
    const spec = impactBarChart(scoped, limit);
    if (!spec) return null;
    const leader = top[0];
    return {
      content: `La alerta con mayor impacto es **#${leader.id}**, cliente **${leader.client_id}**, con **${formatRoundedEUR(leader.impacto_estimado)}** estimados.`,
      charts: [spec],
    };
  }

  if (q.includes("tipologia") || q.includes("canal") || q.includes("tipo") || q.includes("estado") || q.includes("pie") || q.includes("distribucion")) {
    const scoped = relevantAlertsForQuery(text, alerts);
    const key: keyof AlertItem = q.includes("canal")
      ? "canal_recomendado"
      : q.includes("estado")
      ? "estado"
      : q.includes("tipo") && !q.includes("tipologia")
      ? "tipo_dinamica"
      : "tipologia_cliente";
    const label =
      key === "canal_recomendado" ? "canal" : key === "estado" ? "estado" : key === "tipo_dinamica" ? "tipo" : "tipología";
    const spec = distributionPieChart(scoped, key, label);
    if (!spec) return null;
    const data = spec.data as Array<{ categoria: string; alertas: number }>;
    return {
      content: `La categoría principal es **${data[0].categoria}**, con **${data[0].alertas} alertas**.`,
      charts: [spec],
    };
  }

  if (q.includes("evolucion") || q.includes("linea")) {
    const buckets = alerts.reduce<Record<string, number>>((acc, alert) => {
      const month = alert.fecha.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + 1;
      return acc;
    }, {});
    const data = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([mes, alertas]) => ({ mes, alertas }));
    if (data.length <= 1) return null;
    const spec: ChartSpec = {
      chart_type: "line",
      data,
      x_key: "mes",
      y_key: "alertas",
      title: "Evolución de alertas",
      caption: "Alertas agrupadas por mes desde la muestra cargada.",
    };
    return {
      content: `He agrupado **${alerts.length} alertas** por mes para ver la evolución de la señal.`,
      charts: [spec],
    };
  }

  return null;
}

function Chat({ open, onClose, alerts }: { open: boolean; onClose: () => void; alerts: AlertItem[] }) {
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [voice, setVoice] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing, open]);

  const playVoice = async (text: string) => {
    try {
      const blob = await speak(text);
      const url = URL.createObjectURL(blob);
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch {
      /* voice not configured — silent */
    }
  };

  const send = (txt?: string) => {
    const t = (txt ?? draft).trim();
    if (!t) return;
    const userMsg: ChatBubble = { role: "user", text: t };
    setMessages((m) => [...m, userMsg]);
    setDraft("");

    const localChart = chartResponseFromAlerts(t, alerts);
    if (localChart) {
      const reply: ChatBubble = { role: "bot", kind: "plain", text: localChart.content };
      const chartBubbles: ChatBubble[] = localChart.charts.map((spec) => ({
        role: "bot" as const,
        kind: "chart" as const,
        spec,
      }));
      setMessages((m) => [...m, reply, ...chartBubbles]);
      if (voice) void playVoice(localChart.content);
      return;
    }

    setTyping(true);

    const history: ChatMessage[] = [...messages, userMsg]
      .filter(
        (m): m is { role: "user"; text: string } | { role: "bot"; kind: "plain"; text: string } =>
          m.role === "user" || (m.role === "bot" && m.kind === "plain"),
      )
      .map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.text }
          : { role: "model" as const, content: m.text },
      );

    postChat(history)
      .then((r) => {
        setTyping(false);
        const reply: ChatBubble = { role: "bot", kind: "plain", text: r.content };
        const companionCharts = r.charts?.length ? r.charts : implicitChartsForQuery(t, alerts);
        const chartBubbles: ChatBubble[] = companionCharts.map((spec) => ({
          role: "bot" as const,
          kind: "chart" as const,
          spec,
        }));
        setMessages((m) => [...m, reply, ...chartBubbles]);
        if (voice && r.content) void playVoice(r.content);
      })
      .catch(() => {
        setTyping(false);
        setMessages((m) => [
          ...m,
          {
            role: "bot",
            kind: "plain",
            text: "No he podido conectar con el copiloto ahora mismo. Prueba de nuevo en unos segundos.",
          },
        ]);
      });
  };

  const fillChip = (s: string) => {
    send(s);
  };

  return (
    <>
      <div className={"chat-overlay " + (open ? "open" : "")} onClick={onClose} />
      <aside className={"chat-panel " + (open ? "open" : "")} aria-hidden={!open}>
        <header
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <div className="pulse-mark" style={{ width: 34, height: 34 }}>
              <Sparkles size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--pulse-blue-strong)" }}>Copiloto Pulse</span>
                <span className="badge-soft" style={{ background: "var(--technical-bg)", color: "#6321d7", fontSize: 9 }}>
                  Powered by Gemini
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                Pregunta sobre alertas, clientes o redacta outreach
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={15} />
          </button>
        </header>

        <div
          style={{
            margin: "12px 18px 0",
            padding: "9px 11px",
            background: "var(--amber-bg)",
            borderRadius: 6,
            border: "1px solid #f6dbb3",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={13} style={{ color: "var(--amber-text)", marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 11.5, color: "var(--amber-text)", lineHeight: 1.45 }}>
            La actividad de competencia se infiere, no se observa directamente.
          </div>
        </div>

        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 9 }}
        >
          {messages.length === 0 && (
            <div className="msg-bot">
              <p>{CHAT_INTRO}</p>
            </div>
          )}
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className="msg-user">
                  {m.text}
                </div>
              );
            }
            if (m.kind === "table") {
              return (
                <div key={i} className="msg-bot">
                  <div style={{ marginBottom: 4 }}>{m.intro}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Urg.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.rows.map((r, j) => (
                        <tr key={j}>
                          <td
                            style={{
                              fontFamily: "ui-monospace, Menlo, monospace",
                              color: "var(--pulse-blue-deep)",
                              fontWeight: 600,
                            }}
                          >
                            {r[0]}
                          </td>
                          <td style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{r[1]}</td>
                          <td>{r[2]}</td>
                          <td>
                            <span className="badge" style={{ color: "#C0432F", background: "var(--pulse-coral-bg)" }}>
                              {r[3]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 12 }}>{m.foot}</div>
                </div>
              );
            }
            if (m.kind === "email") {
              return (
                <div key={i} className="msg-bot">
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--pulse-blue-deep)" }}>{m.subject}</div>
                  {m.body.map((p, j) => (
                    <p key={j} style={{ margin: "5px 0" }}>
                      {p}
                    </p>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    <button
                      className="chip"
                      style={{ borderColor: "var(--pulse-blue)", color: "var(--pulse-blue-strong)", background: "var(--pulse-blue-soft)" }}
                    >
                      Copiar
                    </button>
                    <button className="chip">Editar</button>
                    <button className="chip">Enviar</button>
                  </div>
                </div>
              );
            }
            if (m.kind === "chart") {
              return <ChartBubble key={i} spec={m.spec} />;
            }
            return (
              <div key={i} className="msg-bot">
                <MarkdownMessage text={m.text} />
              </div>
            );
          })}
          {typing && (
            <div className="msg-bot typing">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        <div style={{ padding: "10px 18px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s) => (
            <span key={s} className="chip" onClick={() => fillChip(s)}>
              {s}
            </span>
          ))}
        </div>

        <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--border)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "4px 6px 4px 12px",
              boxShadow: "inset 0 1px 0 rgba(20,50,80,.02)",
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Pregunta al copiloto..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13.5,
                color: "var(--text)",
                padding: "7px 4px",
              }}
            />
            <button
              className={"icon-btn " + (voice ? "active" : "")}
              onClick={() => setVoice((v) => !v)}
              title="Leer respuesta en voz alta"
            >
              <Mic size={15} />
            </button>
            <button
              className="icon-btn"
              style={{ background: "var(--pulse-blue)", borderColor: "var(--pulse-blue)", color: "#fff" }}
              onClick={() => send()}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ---------------- App ---------------- */

type Tab = "alert" | "dashboard" | "metrics";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("alert");
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "info" | "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onToast: ToastFn = (msg, kind = "info") => {
    setToast({ msg, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const { data: stats, live: statsLive } = useAsync(fetchStats, FALLBACK_STATS);
  const { data: apiMetrics } = useAsync(fetchMetrics, FALLBACK_METRICS);
  const { data: alertsResp } = useAsync(
    () => fetchAlerts({ limit: 100 }),
    { items: FALLBACK_ALERTS, total: FALLBACK_ALERTS.length, limit: 100, offset: 0 },
  );
  const [alerts, setAlerts] = useState<AlertItem[]>(FALLBACK_ALERTS);
  // Sync alerts state once when API resolves
  useEffect(() => {
    if (alertsResp.items.length) setAlerts(alertsResp.items);
  }, [alertsResp]);

  const activeCount = alerts.filter((a) => a.estado === "nueva" || a.estado === "en_curso").length;
  const metrics = useMemo(() => deriveMetricsFromAlerts(alerts, apiMetrics), [alerts, apiMetrics]);

  return (
    <div data-screen-label="Pulse 2 · Alert Center">
      <header className="pulse-header">
        <div className="topbar">
          <div
            className="pulse-container"
            style={{ padding: "6px 24px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}
          >
            <span style={{ opacity: 0.85 }}>Plataforma comercial · uso interno Inibsa</span>
            <span style={{ opacity: 0.55 }}>|</span>
            <span style={{ opacity: 0.85 }}>Soporte: pulse@inibsa.com</span>
            <span style={{ opacity: 0.55 }}>|</span>
            <span className="pill">
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "#fff" }} /> España
            </span>
          </div>
        </div>
        <div
          className="pulse-container"
          style={{
            padding: "0 24px",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <InibsaLogo />
            <span style={{ width: 1, height: 30, background: "var(--border)" }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.01em", color: "var(--pulse-blue-deep)" }}>
                Pulse
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500 }}>
                Alert Notification Center
              </span>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 4 }}>
            <button className={"nav-link " + (tab === "alert" ? "active" : "")} onClick={() => setTab("alert")}>
              <Inbox size={14} /> Alert Center
              <span className="count">{activeCount}</span>
            </button>
            <button className={"nav-link " + (tab === "dashboard" ? "active" : "")} onClick={() => setTab("dashboard")}>
              <BarChart3 size={14} /> Dashboard
            </button>
            <button className={"nav-link " + (tab === "metrics" ? "active" : "")} onClick={() => setTab("metrics")}>
              <GaugeIcon size={14} /> Métricas
            </button>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 11px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "#fff",
              }}
            >
              <Radio size={13} style={{ color: "var(--pulse-blue)" }} />
              <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
                {statsLive ? "Signal engine online" : "Signal engine · offline"}
              </span>
              <span className="live-dot" />
            </div>
            <button
              onClick={() => setChatOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--pulse-coral)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "9px 14px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "background .15s",
                boxShadow: "0 2px 0 rgba(192,67,47,.25)",
              }}
            >
              <MessageCircle size={15} /> Copiloto IA
            </button>
          </div>
        </div>
      </header>

      <main className="pulse-container" style={{ padding: "18px 24px 60px" }}>
        <div className="status-strip" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <ShieldCheck size={15} style={{ color: "var(--pulse-blue-strong)" }} />
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>● LIVE</span>
            <span style={{ fontSize: 12.5, color: "var(--text)" }}>Signal engine online</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Last recalc 9 may 2026 · 09:14</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Datos 1 ene 2021 → 30 abr 2025</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Hoy, 10 may 2026</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 10px",
              background: "var(--amber-bg)",
              border: "1px solid #f6dbb3",
              borderRadius: 5,
            }}
          >
            <AlertTriangle size={12} style={{ color: "var(--amber-text)" }} />
            <span style={{ fontSize: 11.5, color: "var(--amber-text)" }}>
              La actividad de competencia se infiere, no se observa directamente
            </span>
          </div>
        </div>

        {tab === "alert" && (
          <AlertCenter alerts={alerts} setAlerts={setAlerts} stats={stats} metrics={metrics} onToast={onToast} />
        )}
        {tab === "dashboard" && <DashboardView alerts={alerts} />}
        {tab === "metrics" && <MetricsView metrics={metrics} />}

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "var(--text-faint)",
            fontSize: 11,
          }}
        >
          <span>Pulse v0.5 · prototipo interno · 2026</span>
          <span>Baseline propio · Demanda no capturada · Reposición esperada</span>
        </div>
      </main>

      {toast && (
        <div
          className="toast"
          style={
            toast.kind === "error"
              ? { background: "var(--pulse-coral-deep)" }
              : toast.kind === "success"
              ? { background: "#15803d" }
              : undefined
          }
        >
          {toast.kind === "error" ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
          {toast.msg}
        </div>
      )}

      <Chat open={chatOpen} onClose={() => setChatOpen(false)} alerts={alerts} />
    </div>
  );
}
