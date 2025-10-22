import { loginAndAcquireToken } from "../msal";

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

async function authHeader() {
  const token = await loginAndAcquireToken();
  return { Authorization: `Bearer ${token}` };
}

function idempoKey(prefix = "web") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const h = await authHeader();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...h, ...(init?.headers || {}) },
  });

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) errorMessage = data.error;
    } catch (_err) { /* ignore non-JSON error body */ }
    throw new Error(errorMessage);
  }

  try {
    return (await res.json()) as T;
  } catch {
    // sem corpo
    return undefined as unknown as T;
  }
}

// ---------- Lookups ----------
export type Family = { id: number; name: string };
export async function fetchFamilies(): Promise<Family[]> {
  return http<Family[]>(`/api/families`);
}

export type Manufacturer = { id: number; manufacturer: string };
export async function fetchManufacturers(): Promise<Manufacturer[]> {
  // Opcional: se /api/manufacturers não existir, o catch permite esconder o filtro
  try { return await http<Manufacturer[]>(`/api/manufacturers`); }
  catch { return []; }
}

export type LocationItem = { id: number; location_label: string };
export async function searchLocations(q: string): Promise<LocationItem[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return http<LocationItem[]>(`/api/locations${qs}`);
}
export async function createLocation(location_label: string): Promise<LocationItem> {
  return http<LocationItem>(`/api/locations`, { method: "POST", body: JSON.stringify({ location_label }) });
}

// ---------- Stock listing ----------
export type StockItem = {
  product_id: number;
  part_number: string;
  description: string | null;
  manufacturer: string | null;
  qty: number;
  location_id: number | null;
  location_label: string | null;
};
export type StockResponse = { items: StockItem[]; nextOffset: number };

export type StockQuery = {
  q?: string;                      // suporta * como coringa
  manufacturer_id?: number[];      // multi-select
  family_id?: number[];            // multi-select
  location_label?: string;         // por enquanto 1 label (podemos estender depois)
  sort?: "code" | "qty" | "address";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

function toCsv(a?: number[]) { return (a && a.length) ? a.join(",") : undefined; }

export async function fetchStock(q: StockQuery): Promise<StockResponse> {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q.replace(/\*/g, "%"));
  if (q.manufacturer_id?.length) p.set("manufacturer_id", toCsv(q.manufacturer_id)!);
  if (q.family_id?.length) p.set("family_id", toCsv(q.family_id)!);
  if (q.location_label) p.set("location_label", q.location_label);
  if (q.sort) p.set("sort", q.sort);
  if (q.order) p.set("order", q.order);
  p.set("limit", String(q.limit ?? 30));
  p.set("offset", String(q.offset ?? 0));
  return http<StockResponse>(`/api/stock?${p.toString()}`);
}

// ---------- Movements ----------
export type Reason = { id: number; name: string };
export async function fetchMovementReasons(): Promise<Reason[]> {
  return http<Reason[]>(`/api/movement-reasons`);
}

export async function postOut(input: {
  product_id: number; location_id: number; qty: number; reason_id: number; customer: string; note?: string;
}) {
  return http<{ id: number }>(`/api/movements`, {
    method: "POST",
    headers: { "Idempotency-Key": idempoKey("out") },
    body: JSON.stringify({ direction: "OUT", ...input }),
  });
}

export async function postIn(input: {
  product_id: number; location_id: number; qty: number; reason_id: number; customer: string; note?: string;
}) {
  return http<{ id: number }>(`/api/movements`, {
    method: "POST",
    headers: { "Idempotency-Key": idempoKey("in") },
    body: JSON.stringify({ direction: "IN", ...input }),
  });
}

export async function postTransfer(input: { product_id: number; to_location_id: number; note?: string; reason_id?: number; }) {
  return http<{ transfer_group: string; moved_qty: number; from_location_id: number; to_location_id: number }>(`/api/transfer`, {
    method: "POST",
    headers: { "Idempotency-Key": idempoKey("xfer") },
    body: JSON.stringify(input),
  });
}

// ---------- History ----------
export type MovementRow = {
  id: number; occurred_at: string; direction: "IN" | "OUT"; qty: number; reason: string | null;
  customer: string | null; note: string | null; user: string | null; location_label: string | null;
};
export async function fetchHistory(product_id: number, limit = 50): Promise<MovementRow[]> {
  const p = new URLSearchParams({ product_id: String(product_id), limit: String(limit) });
  return http<MovementRow[]>(`/api/movements-history?${p.toString()}`);
}