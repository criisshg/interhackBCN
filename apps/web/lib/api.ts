const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchAlerts(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const r = await fetch(`${API_URL}/alerts?${qs}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function fetchAlert(id: number) {
  const r = await fetch(`${API_URL}/alerts/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function fetchClient(id: number) {
  const r = await fetch(`${API_URL}/clients/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}
