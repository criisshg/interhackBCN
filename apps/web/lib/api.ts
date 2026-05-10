export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AlertItem = {
  id: number;
  fecha: string;
  client_id: number;
  province: string | null;
  region_code: string | null;
  subfamilia: string;
  tipo_dinamica: "commodity" | "technical";
  tipologia_cliente: "loyal" | "promiscuous" | "at_risk" | "marginal";
  motivo: string;
  urgencia_dias: number;
  prioridad_score: number;
  impacto_estimado: number;
  canal_recomendado: "rep" | "telesales" | "marketing";
  gestor_responsable: string;
  plazo_dias: number;
  estado: "nueva" | "en_curso" | "convertida" | "desestimada" | "expirada";
};

export type Stats = {
  active_alerts: number;
  pipeline_eur: number;
  urgent_alerts: number;
  by_tipologia: Record<string, number>;
  by_tipo: Record<string, number>;
};

export type Metrics = {
  conversion_rate: number;
  false_positive_rate: number;
  inactive_recovery_rate: number;
  coverage_rate: number;
  actions: {
    closed: number;
    converted: number;
    false_positive: number;
    in_progress: number;
  };
};

export type ChatMessage = { role: "user" | "model"; content: string };

export type ChartSpec = {
  chart_type: "line" | "bar" | "pie";
  data: Array<Record<string, number | string>>;
  x_key: string;
  y_key: string;
  title: string;
  caption?: string;
};

export type ChatResponse = { role: string; content: string; charts?: ChartSpec[] };

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json() as Promise<T>;
}

export async function fetchAlerts(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {}),
  ).toString();
  return getJson<{ items: AlertItem[]; total: number; limit: number; offset: number }>(
    `/alerts${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchAlert(id: number) {
  return getJson<AlertItem & { features_json: Record<string, unknown>; cliente: unknown }>(
    `/alerts/${id}`,
  );
}

export async function fetchClient(id: number) {
  return getJson<unknown>(`/clients/${id}`);
}

export async function fetchStats() {
  return getJson<Stats>("/stats");
}

export async function fetchMetrics() {
  return getJson<Metrics>("/metrics");
}

export async function postChat(messages: ChatMessage[]) {
  const r = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json() as Promise<ChatResponse>;
}

export type ActionResultado = "convertida" | "desestimada" | "en_curso" | "expirada";

export type ActionPayload = {
  alert_id: number;
  ejecutado_por: string;
  resultado: ActionResultado;
  comentario?: string;
};

export async function postAction(payload: ActionPayload) {
  const r = await fetch(`${API_URL}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json() as Promise<{ ok: boolean; id: number; alert_id: number; estado: string }>;
}

export async function speak(text: string): Promise<Blob> {
  const r = await fetch(`${API_URL}/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.blob();
}
