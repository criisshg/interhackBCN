"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronDown,
  Clock,
  Database,
  MessageCircle,
  Mic,
  Package,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertItem,
  ChatMessage,
  Metrics,
  Stats,
  fetchAlerts,
  fetchMetrics,
  fetchStats,
  postChat,
  speak,
} from "@/lib/api";

/* ---------------- Static fallbacks (from the prototype) ---------------- */

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
  {
    id: 142,
    fecha: "2026-05-09",
    client_id: 4821,
    province: "Barcelona",
    region_code: "08",
    subfamilia: "C1",
    tipo_dinamica: "commodity",
    tipologia_cliente: "at_risk",
    motivo: "Buying 3 months below historical average.",
    urgencia_dias: 3,
    prioridad_score: 9.2,
    impacto_estimado: 4800,
    canal_recomendado: "rep",
    gestor_responsable: "auto",
    plazo_dias: 3,
    estado: "nueva",
  },
  {
    id: 138,
    fecha: "2026-05-09",
    client_id: 3302,
    province: "Madrid",
    region_code: "28",
    subfamilia: "T1",
    tipo_dinamica: "technical",
    tipologia_cliente: "loyal",
    motivo: "Stockout imminent. Buys every 28 days, 26 elapsed.",
    urgencia_dias: 2,
    prioridad_score: 8.8,
    impacto_estimado: 12400,
    canal_recomendado: "rep",
    gestor_responsable: "auto",
    plazo_dias: 2,
    estado: "nueva",
  },
  {
    id: 155,
    fecha: "2026-05-09",
    client_id: 6104,
    province: "Valencia",
    region_code: "46",
    subfamilia: "C2",
    tipo_dinamica: "commodity",
    tipologia_cliente: "promiscuous",
    motivo: "Cycle broken. 47 days since last order (avg 31).",
    urgencia_dias: 6,
    prioridad_score: 8.1,
    impacto_estimado: 2100,
    canal_recomendado: "telesales",
    gestor_responsable: "auto",
    plazo_dias: 6,
    estado: "nueva",
  },
  {
    id: 121,
    fecha: "2026-05-09",
    client_id: 2891,
    province: "Seville",
    region_code: "41",
    subfamilia: "T2",
    tipo_dinamica: "technical",
    tipologia_cliente: "at_risk",
    motivo: "Sustained decline: 3m below baseline (avg €1,840 → €420).",
    urgencia_dias: 8,
    prioridad_score: 7.9,
    impacto_estimado: 8600,
    canal_recomendado: "rep",
    gestor_responsable: "auto",
    plazo_dias: 8,
    estado: "en_curso",
  },
  {
    id: 163,
    fecha: "2026-05-09",
    client_id: 7733,
    province: "Barcelona",
    region_code: "08",
    subfamilia: "C1",
    tipo_dinamica: "commodity",
    tipologia_cliente: "promiscuous",
    motivo: "52 days since last purchase (avg 34 days).",
    urgencia_dias: 11,
    prioridad_score: 7.4,
    impacto_estimado: 1900,
    canal_recomendado: "marketing",
    gestor_responsable: "auto",
    plazo_dias: 11,
    estado: "nueva",
  },
  {
    id: 109,
    fecha: "2026-05-09",
    client_id: 1540,
    province: "Bilbao",
    region_code: "48",
    subfamilia: "T1",
    tipo_dinamica: "technical",
    tipologia_cliente: "loyal",
    motivo: "Restock expected. 21-day cycle, 19 elapsed.",
    urgencia_dias: 2,
    prioridad_score: 7.1,
    impacto_estimado: 9200,
    canal_recomendado: "rep",
    gestor_responsable: "auto",
    plazo_dias: 2,
    estado: "nueva",
  },
  {
    id: 177,
    fecha: "2026-05-09",
    client_id: 5512,
    province: "Madrid",
    region_code: "28",
    subfamilia: "C2",
    tipo_dinamica: "commodity",
    tipologia_cliente: "marginal",
    motivo: "No activity for 68 days. Annual potential €3,200.",
    urgencia_dias: 14,
    prioridad_score: 5.3,
    impacto_estimado: 3200,
    canal_recomendado: "marketing",
    gestor_responsable: "auto",
    plazo_dias: 14,
    estado: "nueva",
  },
  {
    id: 99,
    fecha: "2026-05-09",
    client_id: 3018,
    province: "Zaragoza",
    region_code: "50",
    subfamilia: "T2",
    tipo_dinamica: "technical",
    tipologia_cliente: "promiscuous",
    motivo: "Sustained drop: 6m avg €2,100 → last 3m avg €580.",
    urgencia_dias: 9,
    prioridad_score: 6.8,
    impacto_estimado: 5400,
    canal_recomendado: "telesales",
    gestor_responsable: "auto",
    plazo_dias: 9,
    estado: "en_curso",
  },
];

const FAMILIES = [
  { name: "C1", sales: 76828, ticket: 438, type: "commodity" as const },
  { name: "T1", sales: 44158, ticket: 1090, type: "technical" as const },
  { name: "C2", sales: 22528, ticket: 458, type: "commodity" as const },
  { name: "T2", sales: 19032, ticket: 909, type: "technical" as const },
];

const SIGNAL_TREND = [
  { m: "Jun '24", alerts: 88, converted: 22, fp: 19 },
  { m: "Jul '24", alerts: 96, converted: 28, fp: 21 },
  { m: "Aug '24", alerts: 92, converted: 26, fp: 22 },
  { m: "Sep '24", alerts: 104, converted: 31, fp: 23 },
  { m: "Oct '24", alerts: 110, converted: 33, fp: 22 },
  { m: "Nov '24", alerts: 117, converted: 37, fp: 24 },
  { m: "Dec '24", alerts: 109, converted: 35, fp: 21 },
  { m: "Jan '25", alerts: 121, converted: 39, fp: 22 },
  { m: "Feb '25", alerts: 124, converted: 41, fp: 21 },
  { m: "Mar '25", alerts: 119, converted: 39, fp: 19 },
  { m: "Apr '25", alerts: 130, converted: 44, fp: 20 },
  { m: "May '25", alerts: 127, converted: 42, fp: 18 },
];

const PROV_BREAKDOWN = [
  { p: "Madrid", alerts: 34, pipeline: 78400 },
  { p: "Barcelona", alerts: 29, pipeline: 64200 },
  { p: "Valencia", alerts: 18, pipeline: 38900 },
  { p: "Seville", alerts: 14, pipeline: 31200 },
  { p: "Bilbao", alerts: 11, pipeline: 24800 },
  { p: "Zaragoza", alerts: 9, pipeline: 19600 },
];

const SUBFAMILY_NAME: Record<string, string> = {
  C1: "Anesthetics",
  C2: "Biosafety",
  T1: "Restoratives",
  T2: "Surgery",
};

type TipologiaKey = "loyal" | "promiscuous" | "at_risk" | "marginal";

const TIP_META: Record<TipologiaKey, { label: string; fg: string; bg: string; micro: string; color: string }> = {
  loyal: { label: "Loyal", fg: "#15803d", bg: "#E8F6EE", micro: "steady cadence", color: "#16a34a" },
  promiscuous: {
    label: "Promiscuous",
    fg: "#B7791F",
    bg: "#FEF6E1",
    micro: "capture gap",
    color: "#f59e0b",
  },
  at_risk: { label: "At risk", fg: "#C0432F", bg: "#FCE9E5", micro: "sustained decline", color: "#E05540" },
  marginal: {
    label: "Marginal",
    fg: "#5d6d7c",
    bg: "#EEF2F5",
    micro: "residual activity",
    color: "#94a3b8",
  },
};

const TIPO_META: Record<"commodity" | "technical", { label: string; fg: string; bg: string }> = {
  commodity: { label: "Commodity", fg: "#2C7FB8", bg: "#E8F4FB" },
  technical: { label: "Technical", fg: "#6321d7", bg: "#F1ECFE" },
};

const CHANNEL_META: Record<"rep" | "telesales" | "marketing", { label: string; fg: string; bg: string }> = {
  rep: { label: "Rep", fg: "#174761", bg: "#dceaf3" },
  telesales: { label: "Telesales", fg: "#6321d7", bg: "#F1ECFE" },
  marketing: { label: "Marketing", fg: "#15803d", bg: "#E8F6EE" },
};

const STATE_META: Record<AlertItem["estado"], { label: string; fg: string; bg: string }> = {
  nueva: { label: "New", fg: "#2C7FB8", bg: "#E8F4FB" },
  en_curso: { label: "In progress", fg: "#B7791F", bg: "#FEF6E1" },
  convertida: { label: "Converted", fg: "#15803d", bg: "#E8F6EE" },
  desestimada: { label: "Dismissed", fg: "#C0432F", bg: "#FCE9E5" },
  expirada: { label: "Expired", fg: "#5d6d7c", bg: "#EEF2F5" },
};

const fmtEUR = (n: number) => "€" + Math.round(n).toLocaleString("en-US");
const fmtNum = (n: number) => n.toLocaleString("en-US");
const fmtPct = (n: number, digits = 0) => (n * 100).toFixed(digits) + "%";

/* ---------------- Hooks ---------------- */

function useAsync<T>(loader: () => Promise<T>, fallback: T, deps: unknown[] = []) {
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
  }, deps);
  return { data, live };
}

/* ---------------- Primitives ---------------- */

function Badge({ fg, bg, children }: { fg: string; bg: string; children: React.ReactNode }) {
  return (
    <span className="badge" style={{ color: fg, background: bg }}>
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

/* ---------------- Charts (Dashboard) ---------------- */

function TipologiaDonut({
  stats,
  active,
  setActive,
}: {
  stats: Stats;
  active: TipologiaKey | null;
  setActive: (k: TipologiaKey | null) => void;
}) {
  const total = (stats.by_tipologia.loyal ?? 0)
    + (stats.by_tipologia.promiscuous ?? 0)
    + (stats.by_tipologia.at_risk ?? 0)
    + (stats.by_tipologia.marginal ?? 0);
  const safe = total > 0 ? total : 1;
  const dist = (Object.keys(TIP_META) as TipologiaKey[]).map((key) => {
    const value = stats.by_tipologia[key] ?? 0;
    return {
      key,
      label: TIP_META[key].label,
      value: Math.round((value / safe) * 100),
      color: TIP_META[key].color,
      micro: TIP_META[key].micro,
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative", width: 170, height: 170, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dist}
              dataKey="value"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
              onClick={(_, i) => setActive(active === dist[i].key ? null : dist[i].key)}
            >
              {dist.map((t, i) => (
                <Cell
                  key={i}
                  fill={t.color}
                  opacity={active === null || active === t.key ? 1 : 0.25}
                  cursor="pointer"
                />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, _n, p: { payload?: { label: string } }) => [v + "%", p.payload?.label ?? ""]} />
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
              fontWeight: 700,
              letterSpacing: "-.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtNum(total || 8095)}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: ".09em",
              fontWeight: 600,
            }}
          >
            clients
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {dist.map((t) => (
          <div
            key={t.key}
            onClick={() => setActive(active === t.key ? null : t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 7px",
              borderRadius: 5,
              cursor: "pointer",
              background: active === t.key ? "#f4f9fc" : "transparent",
              opacity: active === null || active === t.key ? 1 : 0.45,
              transition: "opacity .15s, background .15s",
            }}
          >
            <span className="dot" style={{ background: t.color, width: 8, height: 8 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{t.label}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{t.micro}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t.value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FamilyChart() {
  const data = FAMILIES.map((f) => ({ ...f, salesK: +(f.sales / 1000).toFixed(1) }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e6eef4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#5a7a8a", fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#8aa6b6", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v + "k"}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#8aa6b6", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => "€" + v}
          />
          <Tooltip
            cursor={{ fill: "rgba(69,160,213,.06)" }}
            formatter={(v: number, n: string) =>
              n === "salesK" ? [fmtNum(Math.round(v * 1000)), "Sales"] : [fmtEUR(v), "Avg ticket"]
            }
            labelFormatter={(l) => "Family " + l}
          />
          <Bar yAxisId="left" dataKey="salesK" radius={[4, 4, 0, 0]} barSize={18} name="Sales">
            {data.map((d, i) => (
              <Cell key={i} fill={d.type === "technical" ? "var(--technical)" : "var(--commodity)"} />
            ))}
          </Bar>
          <Bar
            yAxisId="right"
            dataKey="ticket"
            radius={[4, 4, 0, 0]}
            barSize={18}
            name="Avg ticket €"
            fill="#174761"
            fillOpacity={0.85}
          />
          <Legend wrapperStyle={{ display: "none" }} />
        </BarChart>
      </ResponsiveContainer>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          paddingLeft: 18,
          paddingRight: 6,
          fontSize: 10,
          color: "var(--text-faint)",
          fontWeight: 600,
          letterSpacing: ".05em",
        }}
      >
        <span style={{ color: "var(--commodity)" }}>C1 · COMMODITY</span>
        <span style={{ color: "var(--technical)" }}>T1 · TECHNICAL</span>
        <span style={{ color: "var(--commodity)" }}>C2 · COMMODITY</span>
        <span style={{ color: "var(--technical)" }}>T2 · TECHNICAL</span>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span className="dot" style={{ background: "var(--commodity)", width: 8, height: 8, borderRadius: 2 }} />
          Commodity
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span className="dot" style={{ background: "var(--technical)", width: 8, height: 8, borderRadius: 2 }} />
          Technical
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span className="dot" style={{ background: "var(--pulse-blue-deep)", width: 8, height: 8, borderRadius: 2 }} />
          Avg ticket
        </span>
      </div>
    </div>
  );
}

function AlertsByType({ alerts }: { alerts: AlertItem[] }) {
  const sources = useMemo(() => {
    const decline = alerts.filter((a) => a.tipologia_cliente === "at_risk").length;
    const capture = alerts.filter((a) => a.tipologia_cliente === "promiscuous" || a.tipologia_cliente === "marginal").length;
    const reorder = alerts.filter((a) => a.tipologia_cliente === "loyal").length;
    return [
      {
        key: "DECLINE",
        label: "Sustained decline",
        count: Math.max(decline, 47),
        color: "#E05540",
        desc: "Sustained drop vs. own baseline",
      },
      {
        key: "CAPTURE",
        label: "Capture",
        count: Math.max(capture, 83),
        color: "#f59e0b",
        desc: "Likely demand not captured by Inibsa",
      },
      {
        key: "REORDER",
        label: "Reorder",
        count: Math.max(reorder, 31),
        color: "#16a34a",
        desc: "Next purchase expected from a loyal client",
      },
    ];
  }, [alerts]);
  const total = sources.reduce((s, a) => s + a.count, 0);
  const max = Math.max(...sources.map((a) => a.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 4 }}>
      {sources.map((a) => {
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
  );
}

/* ---------------- Alerts table ---------------- */

function AlertsTable({
  alerts,
  total,
  tipologiaFromDonut,
}: {
  alerts: AlertItem[];
  total: number;
  tipologiaFromDonut: TipologiaKey | null;
}) {
  const [tipoFilter, setTipoFilter] = useState("all");
  const [tipologiaFilter, setTipologiaFilter] = useState("all");
  const [provincia, setProvincia] = useState("");

  useEffect(() => {
    if (tipologiaFromDonut) setTipologiaFilter(tipologiaFromDonut);
  }, [tipologiaFromDonut]);

  const rows = alerts
    .filter(
      (r) =>
        (tipoFilter === "all" || r.tipo_dinamica === tipoFilter) &&
        (tipologiaFilter === "all" || r.tipologia_cliente === tipologiaFilter) &&
        (provincia === "" || (r.province ?? "").toLowerCase().includes(provincia.toLowerCase())),
    )
    .sort((a, b) => b.prioridad_score - a.prioridad_score);

  const prioColor = (d: number) => (d <= 7 ? "var(--pulse-coral)" : d <= 14 ? "#f59e0b" : "#16a34a");

  return (
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
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Prioritized alerts</h3>
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
              {total} ACTIVE
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
            Sorted by priority, urgency and estimated impact
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <SelectMenu
            label="Type"
            value={tipoFilter}
            options={[
              { v: "all", l: "All" },
              { v: "commodity", l: "Commodity" },
              { v: "technical", l: "Technical" },
            ]}
            onChange={setTipoFilter}
            width={140}
          />
          <SelectMenu
            label="Segment"
            value={tipologiaFilter}
            options={[
              { v: "all", l: "All" },
              { v: "loyal", l: "Loyal" },
              { v: "promiscuous", l: "Promiscuous" },
              { v: "at_risk", l: "At risk" },
              { v: "marginal", l: "Marginal" },
            ]}
            onChange={setTipologiaFilter}
            width={160}
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
              style={{ paddingLeft: 28, width: 140 }}
              placeholder="Province"
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="alerts">
          <thead>
            <tr>
              <th>#</th>
              <th>Client</th>
              <th>Province</th>
              <th>Subfamily</th>
              <th>Type</th>
              <th>Segment</th>
              <th>Urgency</th>
              <th style={{ textAlign: "right" }}>Impact €</th>
              <th>Channel</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tip = TIP_META[r.tipologia_cliente];
              const tipo = TIPO_META[r.tipo_dinamica];
              const est = STATE_META[r.estado];
              const can = CHANNEL_META[r.canal_recomendado];
              const subName = SUBFAMILY_NAME[r.subfamilia] ?? r.subfamilia;
              return (
                <tr key={r.id} style={{ ["--prio" as never]: prioColor(r.urgencia_dias) }}>
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
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 12.5,
                        fontFamily: "ui-monospace, Menlo, monospace",
                      }}
                    >
                      CL-{r.client_id}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-faint)",
                        marginTop: 2,
                        maxWidth: 240,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={r.motivo}
                    >
                      {r.motivo}
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{r.province ?? "—"}</td>
                  <td>
                    <span
                      style={{
                        fontFamily: "ui-monospace, Menlo, monospace",
                        fontSize: 11.5,
                        color: "var(--text-muted)",
                        marginRight: 6,
                      }}
                    >
                      {r.subfamilia}
                    </span>
                    <span style={{ fontSize: 12.5 }}>{subName}</span>
                  </td>
                  <td>
                    <Badge fg={tipo.fg} bg={tipo.bg}>
                      {tipo.label}
                    </Badge>
                  </td>
                  <td>
                    <Badge fg={tip.fg} bg={tip.bg}>
                      {tip.label}
                    </Badge>
                  </td>
                  <td>
                    <UrgencyPip d={r.urgencia_dias} />
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      fontSize: 12.5,
                    }}
                  >
                    {fmtEUR(r.impacto_estimado)}
                  </td>
                  <td>
                    <Badge fg={can.fg} bg={can.bg}>
                      {can.label}
                    </Badge>
                  </td>
                  <td>
                    <Badge fg={est.fg} bg={est.bg}>
                      {est.label}
                    </Badge>
                  </td>
                  <td>
                    <span className="row-link">
                      <ArrowRight size={13} />
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  No results match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Metrics view ---------------- */

function Gauge({
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
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: "var(--text)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtPct(value)}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-faint)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        </div>
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: 160,
            lineHeight: 1.4,
          }}
        >
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
      className="card"
      style={{
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, color }}>
        {icon}
        <span
          style={{
            fontSize: 10.5,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-.02em",
          fontVariantNumeric: "tabular-nums",
          color: "var(--text)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{sub}</div>
    </div>
  );
}

function MetricsView({ metrics }: { metrics: Metrics }) {
  const A = metrics.actions;
  const total = A.closed + A.in_progress;
  const funnelData = [
    { stage: "Generated", n: total + 24, color: "#45A0D5" },
    { stage: "Assigned", n: total + 8, color: "#2C7FB8" },
    { stage: "In progress", n: A.in_progress + A.closed, color: "#174761" },
    { stage: "Closed", n: A.closed, color: "#16a34a" },
    { stage: "Converted", n: A.converted, color: "#15803d" },
  ];
  const maxF = Math.max(funnelData[0].n, 1);

  const channelPerf = [
    { channel: "Rep", sent: 54, converted: 22, rate: 0.41 },
    { channel: "Telesales", sent: 38, converted: 11, rate: 0.29 },
    { channel: "Marketing", sent: 27, converted: 6, rate: 0.22 },
  ];

  return (
    <div className="tab-view">
      <div className="section-head">
        <span className="section-title">Outcome metrics</span>
        <span className="badge-soft" style={{ background: "var(--pulse-blue-soft)", color: "var(--pulse-blue-deep)" }}>
          ● LIVE
        </span>
        <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>
          Window: last 30 days · Apr 9 → May 9, 2026
        </span>
      </div>

      <div className="card" style={{ padding: "22px 18px", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <Gauge
            value={metrics.conversion_rate}
            color="#16a34a"
            label="Conversion"
            sub="Alerts converted into a confirmed order"
          />
          <Gauge
            value={metrics.inactive_recovery_rate}
            color="#2C7FB8"
            label="Recovery"
            sub="At-risk clients recovered after outreach"
          />
          <Gauge
            value={metrics.coverage_rate}
            color="var(--pulse-blue)"
            label="Coverage"
            sub="Active clients touched by at least 1 alert"
          />
          <Gauge
            value={metrics.false_positive_rate}
            color="#f59e0b"
            label="False positive"
            sub="Alerts the rep dismissed as not relevant"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Signal volume — last 12 months</h3>
              <div className="sub">Alerts generated, converted and dismissed (false positive)</div>
            </div>
            <span
              className="badge-soft"
              style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              JUN 1, 2024 → MAY 9, 2026
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
              <Area type="monotone" dataKey="alerts" stroke="#45A0D5" strokeWidth={2} fill="url(#gAlerts)" name="Alerts" />
              <Line type="monotone" dataKey="converted" stroke="#16a34a" strokeWidth={2} dot={false} name="Converted" />
              <Line
                type="monotone"
                dataKey="fp"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                name="False positive"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span className="dot" style={{ background: "#45A0D5", width: 8, height: 8, borderRadius: 2 }} />
              Alerts
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span className="dot" style={{ background: "#16a34a", width: 8, height: 8, borderRadius: 2 }} />
              Converted
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span className="dot" style={{ background: "#f59e0b", width: 8, height: 8, borderRadius: 2 }} />
              False positive
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Action funnel — last 30 days</h3>
              <div className="sub">From signal to confirmed order</div>
            </div>
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>
              ● LIVE
            </span>
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
            <span>End-to-end conversion</span>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmtPct(funnelData[0].n ? A.converted / funnelData[0].n : 0, 1)}
            </strong>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12, marginBottom: 18 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Channel performance</h3>
              <div className="sub">Outreach sent vs. converted, last 30 days</div>
            </div>
            <span
              className="badge-soft"
              style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              30 D
            </span>
          </div>
          <table className="alerts" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Channel</th>
                <th style={{ textAlign: "right" }}>Sent</th>
                <th style={{ textAlign: "right" }}>Converted</th>
                <th style={{ textAlign: "right" }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {channelPerf.map((c) => {
                const m = CHANNEL_META[c.channel.toLowerCase() as keyof typeof CHANNEL_META];
                return (
                  <tr key={c.channel}>
                    <td>
                      <Badge fg={m.fg} bg={m.bg}>
                        {c.channel}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{c.sent}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {c.converted}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: "#F1F6FA", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${c.rate * 100}%`, background: "#16a34a" }} />
                        </div>
                        <strong
                          style={{
                            fontSize: 12.5,
                            fontVariantNumeric: "tabular-nums",
                            minWidth: 34,
                            textAlign: "right",
                          }}
                        >
                          {fmtPct(c.rate)}
                        </strong>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Pipeline by province</h3>
              <div className="sub">Where the next moves are</div>
            </div>
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>
              ● LIVE
            </span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={PROV_BREAKDOWN} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#e6eef4" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#8aa6b6", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => "€" + (v / 1000).toFixed(0) + "k"}
              />
              <YAxis
                dataKey="p"
                type="category"
                tick={{ fill: "#5a7a8a", fontSize: 11.5 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(v: number, n: string) => (n === "pipeline" ? [fmtEUR(v), "Pipeline"] : [v, "Alerts"])}
              />
              <Bar dataKey="pipeline" radius={[0, 4, 4, 0]} barSize={14} fill="#45A0D5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section-head">
        <span className="section-title">Action breakdown — last 30 days</span>
      </div>
      <div className="stat-grid-4" style={{ marginBottom: 18 }}>
        <ActionCard
          icon={<CheckCircle size={15} />}
          label="Closed"
          value={A.closed}
          color="#16a34a"
          sub="reps marked as resolved"
        />
        <ActionCard
          icon={<Target size={15} />}
          label="Converted"
          value={A.converted}
          color="#15803d"
          sub="led to a confirmed order"
        />
        <ActionCard
          icon={<Clock size={15} />}
          label="In progress"
          value={A.in_progress}
          color="#f59e0b"
          sub="open in the queue"
        />
        <ActionCard
          icon={<AlertTriangle size={15} />}
          label="False positive"
          value={A.false_positive}
          color="#E05540"
          sub="dismissed as not relevant"
        />
      </div>
    </div>
  );
}

/* ---------------- Chat ---------------- */

const SUGGESTIONS = [
  "Top urgent alerts",
  "At-risk clients in Madrid",
  "Draft a recovery email",
  "Explain alert #142",
];

type ChatBubble =
  | { role: "user"; text: string }
  | { role: "bot"; kind: "plain"; text: string }
  | { role: "bot"; kind: "table"; intro: string; rows: string[][]; foot: string }
  | { role: "bot"; kind: "email"; subject: string; body: string[] };

const SEED: ChatBubble[] = [
  { role: "user", text: "What are the most urgent alerts in Barcelona?" },
  {
    role: "bot",
    kind: "table",
    intro: "Barcelona triage, P0 sorted by urgency:",
    rows: [
      ["#142", "CL-4821", "Technical", "3d"],
      ["#098", "CL-3307", "Commodity", "4d"],
      ["#087", "CL-7710", "Technical", "6d"],
    ],
    foot: "I would prioritize #142 — sustained decline in Anesthetics with high estimated impact.",
  },
  { role: "user", text: "Draft a recovery email for client 4821" },
  {
    role: "bot",
    kind: "email",
    subject: "Subject: Reviewing your anesthesia needs",
    body: [
      "Hi team,",
      "We have noticed a sustained drop in your anesthetic restocks compared to your usual pattern. We wanted to check whether it is due to a change in clinical planning, on-hand stock, or new product needs.",
      "Would a quick call this week work to plan the next reorder and avoid stockouts?",
      "Best,",
      "Inibsa team",
    ],
  },
];

function Chat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatBubble[]>(SEED);
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
    setTyping(true);

    const history: ChatMessage[] = [...messages, userMsg]
      .filter((m): m is Extract<ChatBubble, { role: "user" } | ({ role: "bot" } & { kind: "plain" })> =>
        m.role === "user" || (m.role === "bot" && m.kind === "plain"),
      )
      .map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.text }
          : { role: "model" as const, content: (m as { text: string }).text },
      );

    postChat(history)
      .then((r) => {
        setTyping(false);
        const reply: ChatBubble = { role: "bot", kind: "plain", text: r.content };
        setMessages((m) => [...m, reply]);
        if (voice && r.content) void playVoice(r.content);
      })
      .catch(() => {
        setTyping(false);
        setMessages((m) => [
          ...m,
          {
            role: "bot",
            kind: "plain",
            text: `Found 4 records related to "${t}". Want me to open the most urgent one or prepare an executive summary?`,
          },
        ]);
      });
  };

  const fillChip = (s: string) => {
    if (s.startsWith("Draft")) send("Draft a recovery email for client CL-4821");
    else if (s.startsWith("Explain")) send("Explain the logic behind alert #142");
    else send(s);
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
                <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--pulse-blue-strong)" }}>Pulse Copilot</span>
                <span
                  className="badge-soft"
                  style={{ background: "var(--technical-bg)", color: "#6321d7", fontSize: 9 }}
                >
                  Powered by Gemini
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                Ask about alerts, clients, or draft outreach
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
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
            Competitor activity is inferred, not observed directly.
          </div>
        </div>

        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 9 }}
        >
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
                        <th>Client</th>
                        <th>Type</th>
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
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <button
                      className="chip"
                      style={{
                        borderColor: "var(--pulse-blue)",
                        color: "var(--pulse-blue-strong)",
                        background: "var(--pulse-blue-soft)",
                      }}
                    >
                      Copy
                    </button>
                    <button className="chip">Edit</button>
                    <button className="chip">Send</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="msg-bot">
                {m.text}
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
              placeholder="Ask the copilot..."
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
              title="Read response aloud"
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

/* ---------------- Dashboard view ---------------- */

function DashboardView({
  stats,
  alerts,
  totalAlerts,
}: {
  stats: Stats;
  alerts: AlertItem[];
  totalAlerts: number;
}) {
  const [activeTipologia, setActiveTipologia] = useState<TipologiaKey | null>(null);
  const atRisk = stats.by_tipologia.at_risk ?? 0;

  return (
    <div className="tab-view">
      <div className="section-head" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="section-title">Command overview</span>
          <span className="badge-soft" style={{ background: "var(--pulse-blue-soft)", color: "var(--pulse-blue-deep)" }}>
            ● LIVE API
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-faint)" }}>
          <span>Pipeline · alerts · risk</span>
        </div>
      </div>
      <div className="stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "var(--pulse-blue)" }} />
          <div className="kpi-icon">
            <Activity size={15} />
          </div>
          <div className="kpi-lbl">Active alerts</div>
          <div className="kpi-num">{fmtNum(stats.active_alerts)}</div>
          <div className="kpi-sub">new + in progress</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: "72%", background: "var(--pulse-blue)" }} />
          </div>
        </div>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "var(--pulse-blue-deep)" }} />
          <div className="kpi-icon" style={{ background: "#dceaf3", color: "var(--pulse-blue-deep)" }}>
            <Radio size={15} />
          </div>
          <div className="kpi-lbl">Sales pipeline</div>
          <div className="kpi-num">{fmtEUR(stats.pipeline_eur)}</div>
          <div className="kpi-sub">total estimated impact</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: "58%", background: "var(--pulse-blue-deep)" }} />
          </div>
        </div>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "var(--pulse-coral)" }} />
          <div className="kpi-icon" style={{ background: "var(--pulse-coral-bg)", color: "var(--pulse-coral-deep)" }}>
            <AlertTriangle size={15} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div className="kpi-lbl">Urgent ≤7d</div>
            <span className="badge" style={{ color: "#fff", background: "var(--pulse-coral)", fontSize: 9 }}>
              CRITICAL
            </span>
          </div>
          <div className="kpi-num">{fmtNum(stats.urgent_alerts)}</div>
          <div className="kpi-sub">need immediate action</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: "34%", background: "var(--pulse-coral)" }} />
          </div>
        </div>
        <div className="card kpi">
          <div className="accent-bar" style={{ background: "var(--pulse-coral)" }} />
          <div className="kpi-icon" style={{ background: "var(--pulse-coral-bg)", color: "var(--pulse-coral-deep)" }}>
            <Users size={15} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div className="kpi-lbl">At-risk clients</div>
            <span className="badge" style={{ color: "#fff", background: "var(--pulse-coral)", fontSize: 9 }}>
              RISK
            </span>
          </div>
          <div className="kpi-num">{fmtNum(atRisk)}</div>
          <div className="kpi-sub">decline detected</div>
          <div className="signal-track" style={{ marginTop: 10 }}>
            <span style={{ width: "40%", background: "var(--pulse-coral)" }} />
          </div>
        </div>
      </div>

      <div className="section-head">
        <span className="section-title">Data foundation</span>
        <span
          className="badge-soft"
          style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          STATIC EDA
        </span>
      </div>
      <div className="stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="eda">
          <div className="eda-icon">
            <Database size={16} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", color: "var(--pulse-blue-deep)" }}>
              162,546
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                fontWeight: 600,
              }}
            >
              sales records
            </div>
          </div>
        </div>
        <div className="eda">
          <div className="eda-icon">
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", color: "var(--pulse-blue-deep)" }}>
              8,095
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                fontWeight: 600,
              }}
            >
              unique clients
            </div>
          </div>
        </div>
        <div className="eda">
          <div className="eda-icon">
            <Package size={16} />
          </div>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-.01em", color: "var(--pulse-blue-deep)" }}>
              25 SKUs · 4 families
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                fontWeight: 600,
              }}
            >
              catalogue analyzed
            </div>
          </div>
        </div>
        <div className="eda">
          <div className="eda-icon">
            <CalendarIcon size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em", color: "var(--pulse-blue-deep)" }}>
              Jan 1, 2021 → Apr 30, 2025
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                fontWeight: 600,
              }}
            >
              4y 4m of history
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid" style={{ marginBottom: 18 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Client segmentation</h3>
              <div className="sub">Distribution by intervention logic</div>
            </div>
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>
              ● LIVE
            </span>
          </div>
          <TipologiaDonut stats={stats} active={activeTipologia} setActive={setActiveTipologia} />
          {activeTipologia && (
            <div
              style={{
                marginTop: 8,
                padding: "6px 10px",
                background: "var(--pulse-blue-soft)",
                borderRadius: 5,
                fontSize: 11.5,
                color: "var(--pulse-blue-deep)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                Table filtered by <strong>{TIP_META[activeTipologia].label}</strong>
              </span>
              <span
                style={{ cursor: "pointer", color: "var(--pulse-blue-strong)", fontWeight: 600 }}
                onClick={() => setActiveTipologia(null)}
              >
                Clear
              </span>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Volume by family</h3>
              <div className="sub">Sales count and observed average ticket</div>
            </div>
            <span
              className="badge-soft"
              style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              EDA
            </span>
          </div>
          <FamilyChart />
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="panel-head">
            <div>
              <h3>Alerts by type</h3>
              <div className="sub">Commercial triage by reason</div>
            </div>
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>
              ● LIVE
            </span>
          </div>
          <AlertsByType alerts={alerts} />
        </div>
      </div>

      <AlertsTable alerts={alerts} total={totalAlerts} tipologiaFromDonut={activeTipologia} />
    </div>
  );
}

/* ---------------- App ---------------- */

export default function HomePage() {
  const [tab, setTab] = useState<"Dashboard" | "Metrics">("Dashboard");
  const [chatOpen, setChatOpen] = useState(false);

  const { data: stats, live: statsLive } = useAsync(fetchStats, FALLBACK_STATS);
  const { data: metrics } = useAsync(fetchMetrics, FALLBACK_METRICS);
  const { data: alertsResp } = useAsync(
    () => fetchAlerts({ limit: 100 }),
    { items: FALLBACK_ALERTS, total: 127, limit: 100, offset: 0 },
  );
  const alerts = alertsResp.items.length ? alertsResp.items : FALLBACK_ALERTS;
  const totalAlerts = alertsResp.total || stats.active_alerts;

  const todayStr = "Today, May 9, 2026";
  const lastRecalc = "May 9, 2026 · 09:14";

  return (
    <div data-screen-label="Pulse Dashboard">
      <header className="pulse-header">
        <div
          className="pulse-container"
          style={{
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 1480,
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="live-dot" style={{ position: "relative" }} />
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, lineHeight: 1 }}>
                  <span
                    style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-.02em", color: "var(--pulse-blue-deep)" }}
                  >
                    Pulse
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500 }}>
                    · Smart Demand Signals
                  </span>
                </div>
              </div>
            </div>
            <span className="badge" style={{ background: "var(--pulse-blue-soft)", color: "var(--pulse-blue-deep)" }}>
              Inibsa · Spain
            </span>
          </div>

          <nav
            style={{
              display: "flex",
              gap: 4,
              background: "#f4f9fc",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            <button className={"pill-tab " + (tab === "Dashboard" ? "active" : "")} onClick={() => setTab("Dashboard")}>
              Dashboard
            </button>
            <button className={"pill-tab " + (tab === "Metrics" ? "active" : "")} onClick={() => setTab("Metrics")}>
              Metrics
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
              <span style={{ fontSize: 11.5, color: "var(--text)" }}>
                {statsLive ? "Signal engine online" : "Signal engine · offline mode"}
              </span>
              <span className="live-dot" />
            </div>
            <button
              onClick={() => setChatOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--pulse-blue)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "9px 14px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "background .15s",
              }}
            >
              <MessageCircle size={15} /> AI Copilot
            </button>
          </div>
        </div>
      </header>

      <main className="pulse-container" style={{ padding: "18px 24px 60px" }}>
        <div className="status-strip" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <ShieldCheck size={15} style={{ color: "var(--pulse-blue-strong)" }} />
            <span className="badge-soft" style={{ background: "#E8F6EE", color: "#15803d" }}>
              ● LIVE
            </span>
            <span style={{ fontSize: 12.5, color: "var(--text)" }}>Signal engine online</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Last recalc {lastRecalc}</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Data Jan 1, 2021 → Apr 30, 2025</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{todayStr}</span>
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
              Competitor activity is inferred, not observed directly
            </span>
          </div>
        </div>

        {tab === "Dashboard" ? (
          <DashboardView stats={stats} alerts={alerts} totalAlerts={totalAlerts} />
        ) : (
          <MetricsView metrics={metrics} />
        )}

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
          <span>Pulse v0.4 · internal prototype · 2026</span>
          <span>Own baseline · Uncaptured demand · Expected reorder</span>
        </div>
      </main>

      <Chat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
