// src/lib/api.ts
import { loginAndAcquireToken } from "./msal";

// =====================
// Tipos
// =====================
export interface MovementReason { id: number; name: string; }
// Compat: alguns componentes referem-se a `Reason`
export type Reason = MovementReason;

export interface Manufacturer { id: number; name: string; manufacturer?: string }
export interface Family       { id: number; name: string; family?: string }

export interface LocationOption { id: number; label: string; }

export type Direction = "IN" | "OUT";

export interface StockItem {
  product_id: number;
  code: string;
  /** Compat com UI antiga */
  part_number?: string;
  description: string;
  /** Opcional para evitar erro “string | undefined → string” */
  manufacturer?: string;
  qty: number;
  /** Compat: alguns componentes usam `location_id` */
  location_id?: number;
  location_label: string;
  family?: string | null;
}

// Histórico
export interface HistoryRow {
  id: number;
  occurred_at: string; // ISO
  direction: Direction;
  qty: number;
  reason?: string | null;
  customer?: string | null;
  user?: string | null;
  note?: string | null;
  location_label?: string | null;
}
// Compat: alguns arquivos importam `MovementRow`
export type MovementRow = HistoryRow;

/** Resposta padronizada para a lista de estoque */
export interface StockResponse {
  items: StockItem[];
  nextOffset: number;
}

// Query de estoque
export interface StockQuery {
  q?: string;
  manufacturer_id?: number[];
  family_id?: number[];
  location_label?: string;
  sort?: "code" | "qty" | "loc";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface MovementPayload {
  product_id: number;
  location_id: number;
  qty: number;
  reason_id: number;
  customer: string;
  note?: string;
  occurred_at?: string;
}

export interface TransferPayload {
  product_id: number;
  to_location_id: number;
  note?: string;
  occurred_at?: string;
}

export interface ProductCreatePayload {
  part_number: string;           // ou "code" no backend
  description?: string;
  manufacturer_id: number;       // OBRIGATÓRIO (NOT NULL no banco)
  family_id?: number | null;     // opcional
}

export interface ProductCreateResponse {
  product_id: number;
}

export interface ProductBasic {
  product_id: number;
  part_number: string;
  description: string;
  manufacturer?: string;
  is_active?: boolean;
  family_id?: number;
}


// =====================
// Helpers (runtime guards)
// =====================
type UnknownRecord = Record<string, unknown>;
const isObject = (u: unknown): u is UnknownRecord => typeof u === "object" && u !== null;

const readStr = (o: UnknownRecord, keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string") return v;
  }
  return undefined;
};

const readNum = (o: UnknownRecord, keys: string[]): number | undefined => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
};

const is404 = (e: unknown): boolean => e instanceof Error && e.message.includes("404");

function toLocationArray(raw: unknown): LocationOption[] {
  const arr: LocationOption[] = [];
  if (Array.isArray(raw)) {
    for (const u of raw) {
      if (isObject(u)) {
        const id = readNum(u, ["id"]);
        const label = readStr(u, ["label", "location_label"]);
        if (id !== undefined && label) arr.push({ id, label });
      }
    }
    return arr;
  }
  if (isObject(raw) && Array.isArray((raw as UnknownRecord).items)) {
    return toLocationArray((raw as UnknownRecord).items as unknown[]);
  }
  return [];
}

// =====================
// HTTP base (com query segura)
// =====================
export type QueryValue = string | number | boolean | Array<string | number> | undefined;
export interface HttpInit extends RequestInit {
  query?: Record<string, QueryValue>;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base =
    (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL ||
    `https://${(import.meta as unknown as { env: Record<string, string> }).env.VITE_API_HOST}`;

  const full = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const url = new URL(full);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (Array.isArray(v)) {
        v.forEach((val) => url.searchParams.append(k, String(val)));
      } else if (typeof v !== "undefined") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

// Substitua sua função http<T>(...) por esta versão
async function http<T>(path: string, init: HttpInit = {}): Promise<T> {
  const url = buildUrl(path, init.query);

  // Headers
  const headers = new Headers(init.headers);
  // Define Content-Type somente quando estamos enviando body
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  // Token
  let token = await loginAndAcquireToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const doFetch = async () => fetch(url, { ...init, headers });

  // 1ª tentativa
  let res = await doFetch();

  // Log de depuração (remova depois, se quiser)
  // Mostra se o header Authorization foi enviado e o status recebido
  // (não imprime o token)
  console.debug(
    "[api] ->", url,
    "auth=", headers.has("Authorization") ? "yes" : "no",
    "status=", res.status
  );

  // Se 401, renova token e tenta 1x novamente
  if (res.status === 401) {
    token = await loginAndAcquireToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      res = await doFetch();
    }
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // Monta mensagem sem usar `any`
    let message = `${res.status} ${res.statusText}`;
    if (text) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (isObject(parsed)) {
          // tenta extrair campo "error" como string
          const errMsg = readStr(parsed, ["error"]);
          if (errMsg) {
            message = `${message} - ${errMsg}`;
          } else {
            // Se não há "error", anexa o corpo original como texto
            message = `${message} - ${text}`;
          }
        } else {
          message = `${message} - ${text}`;
        }
      } catch {
        message = `${message} - ${text}`;
      }
    }
    throw new Error(message);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("Invalid JSON from API");
    }
  }

  // Resposta não-JSON
  return text as unknown as T;
}


function newIdemKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getJsonWithFallback<T>(paths: string[], init?: HttpInit): Promise<T> {
  let lastError: unknown = null;
  for (const p of paths) {
    try {
      return await http<T>(p, init);
    } catch (err: unknown) {
      if (is404(err)) { lastError = err; continue; }
      throw err;
    }
  }
  throw (lastError ?? new Error("All fallback paths failed"));
}

// =====================
// GETs
// =====================
export async function fetchManufacturers(): Promise<Manufacturer[]> {
  return getJsonWithFallback<Manufacturer[]>(
    ["/api/manufacturers", "/api/lookup/manufacturers"]
  );
}

export async function fetchFamilies(): Promise<Family[]> {
  return getJsonWithFallback<Family[]>(
    ["/api/families", "/api/product-families", "/api/lookup/families"]
  );
}

export async function fetchMovementReasons(): Promise<MovementReason[]> {
  return getJsonWithFallback<MovementReason[]>(
    ["/api/movement-reasons", "/api/lookup/movement-reasons"]
  );
}

// Busca por endereço (prefixo). '*' é removido; vazio => lista completa
export async function searchLocations(q: string): Promise<LocationOption[]> {
  const stripped = (q ?? "").replace(/\*/g, "").trim();
  if (!stripped) {
    // se veio vazio (ou só '*'), volta a lista completa
    return listLocations();
  }
  const raw = await http<unknown>("/api/locations/search", {
    query: { q: stripped },
  });
  return toLocationArray(raw).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
  );
}

export async function fetchStock(params: StockQuery): Promise<StockResponse> {
  // arrays -> CSV (ou undefined quando “Todos/Todas”)
  const query = {
    sort: params.sort ?? "code",
    order: params.order ?? "asc",
    limit: params.limit ?? 30,
    offset: params.offset ?? 0,
    q: params.q ?? "",
    manufacturer_id: params.manufacturer_id && params.manufacturer_id.length ? params.manufacturer_id.join(",") : undefined,
    family_id: params.family_id && params.family_id.length ? params.family_id.join(",") : undefined,
    location_label: params.location_label,
  } as const;

  const raw = await getJsonWithFallback<unknown>(
    ["/api/stock", "/api/stock-balances", "/api/lookup/stock"],
    { query }
  );

  const toStockItem = (u: unknown): StockItem | null => {
    if (typeof u !== "object" || u === null) return null;
    const o = u as Record<string, unknown>;
    const product_id    = typeof o.product_id === "number" ? o.product_id : typeof o.id === "number" ? o.id : undefined;
    const code          = typeof o.code === "string" ? o.code : typeof o.part_number === "string" ? o.part_number : undefined;
    const description   = typeof o.description === "string" ? o.description : typeof o.desc === "string" ? o.desc : "";
    const manufacturer  = typeof o.manufacturer === "string" ? o.manufacturer : undefined;
    const qty           = typeof o.qty === "number" ? o.qty : typeof o.quantity === "number" ? o.quantity : undefined;
    const locationLabel = typeof o.location_label === "string" ? o.location_label : typeof o.label === "string" ? o.label : undefined;
    const location_id   = typeof o.location_id === "number" ? o.location_id : undefined;
    if (product_id === undefined || code === undefined || qty === undefined || !locationLabel) return null;
    return { product_id, code, part_number: code, description, manufacturer, qty, location_label: locationLabel, location_id };
  };

  const fromArray = (arr: unknown[]): StockResponse => {
    const items = arr.map(toStockItem).filter((x): x is StockItem => x !== null);
    const off = typeof query.offset === "number" ? query.offset : Number(query.offset ?? 0);
    // próxima página = off + PAGE_SIZE (consistente com getNextPageParam)
    const nextOffset = off + (typeof query.limit === "number" ? query.limit : 30);
    return { items, nextOffset };
  };

  if (Array.isArray(raw)) {
    return fromArray(raw);
  }

  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    const itemsArr = Array.isArray(o.items) ? o.items as unknown[] :
                     Array.isArray(o.data)  ? o.data  as unknown[] : [];
    const resp = fromArray(itemsArr);
    const n1 = typeof o.nextOffset === "number" ? o.nextOffset : undefined;
    const n2 = typeof o.next_offset === "number" ? o.next_offset : undefined;
    return { items: resp.items, nextOffset: n1 ?? n2 ?? resp.nextOffset };
  }

  const off = typeof query.offset === "number" ? query.offset : Number(query.offset ?? 0);
  return { items: [], nextOffset: off };
}

export async function fetchHistory(product_id: number): Promise<HistoryRow[]> {
  // Tentamos primeiro o endpoint correto e, em seguida, alguns legados
  const raw = await getJsonWithFallback<unknown>(
    [
      "/api/movements-history",
      "/api/movements/history",
      "/api/history/movements",
      `/api/stock/${product_id}/history`,
      `/api/products/${product_id}/history`,
      "/api/history",
    ],
    // Passa product_id como query quando o endpoint for agregador
    { query: { product_id } }
  );

  // Normaliza resposta: aceita array direto ou {items:[]}/{data:[]}
  const toArray = (u: unknown): unknown[] => {
    if (Array.isArray(u)) return u;
    if (typeof u === "object" && u !== null) {
      const o = u as Record<string, unknown>;
      if (Array.isArray(o.items)) return o.items as unknown[];
      if (Array.isArray(o.data)) return o.data as unknown[];
    }
    return [];
  };

  const arr = toArray(raw);

  const rows: HistoryRow[] = [];
  for (const it of arr) {
    if (typeof it !== "object" || it === null) continue;
    const o = it as Record<string, unknown>;

    const id =
      typeof o.id === "number" ? o.id : undefined;
    const qty =
      typeof o.qty === "number"
        ? o.qty
        : typeof o.quantity === "number"
        ? o.quantity
        : undefined;

    const dirRaw =
      typeof o.direction === "string"
        ? o.direction
        : typeof o.dir === "string"
        ? o.dir
        : typeof o.movement === "string"
        ? o.movement
        : "OUT";
    const direction: Direction = dirRaw.toUpperCase() === "IN" ? "IN" : "OUT";

    const occurred_at =
      typeof o.occurred_at === "string"
        ? o.occurred_at
        : typeof o.created_at === "string"
        ? o.created_at
        : typeof o.timestamp === "string"
        ? o.timestamp
        : "";

    const reason =
      typeof o.reason === "string"
        ? o.reason
        : typeof o.reason_name === "string"
        ? o.reason_name
        : null;

    const customer = typeof o.customer === "string" ? o.customer : null;

    const user =
      typeof o.user === "string"
        ? o.user
        : typeof o.display_name === "string"
        ? o.display_name
        : typeof o.upn === "string"
        ? o.upn
        : null;

    const note = typeof o.note === "string" ? o.note : null;

    const location_label =
      typeof o.location_label === "string"
        ? o.location_label
        : typeof o.label === "string"
        ? o.label
        : null;

    if (typeof id === "number" && occurred_at && typeof qty === "number") {
      rows.push({ id, occurred_at, direction, qty, reason, customer, user, note, location_label });
    }
  }

  return rows;
}


// Lista todos os endereços (NÃO usa /locations/search?q=*)
export async function listLocations(): Promise<LocationOption[]> {
  const raw = await getJsonWithFallback<unknown>(
    ["/api/locations", "/api/lookup/locations"]
  );
  return toLocationArray(raw).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
  );
}


// Busca produto por código (match exato, case-insensitive)
export async function findProductByCode(part_number: string): Promise<ProductBasic | null> {
  const q = (part_number ?? "").trim();
  if (!q) return null;

  const data = await http<unknown>("/api/products", {
    query: { q, limit: 50, offset: 0 },
  });

  let arr: unknown[] = [];
  if (Array.isArray(data)) {
    arr = data as unknown[];
  } else if (isObject(data) && Array.isArray((data as Record<string, unknown>).items)) {
    arr = (data as Record<string, unknown>).items as unknown[];
  }

  for (const u of arr) {
    if (!isObject(u)) continue;
    const pn = readStr(u, ["part_number"]) ?? "";
    if (pn.toLowerCase() !== q.toLowerCase()) continue;

    const id = readNum(u, ["product_id", "id"]) ?? 0;
    const description = readStr(u, ["description"]) ?? "";
    const manufacturer = readStr(u, ["manufacturer"]);
    const active =
      typeof (u as Record<string, unknown>).is_active === "boolean"
        ? ((u as Record<string, unknown>).is_active as boolean)
        : undefined;

    return {
      product_id: id,
      part_number: pn,
      description,
      manufacturer,
      is_active: active,
    };
  }
  return null;
}

// =====================
// POSTs
// =====================
export async function postOut(payload: MovementPayload): Promise<void> {
  const idem = newIdemKey();
  await http<unknown>("/api/movements", {
    method: "POST",
    headers: { "X-Idempotency-Key": idem },
    body: JSON.stringify({
      direction: "OUT",
      product_id: payload.product_id,
      location_id: payload.location_id,
      qty: payload.qty,
      reason_id: payload.reason_id,
      customer: payload.customer,
      note: payload.note ?? null,
      occurred_at: payload.occurred_at ?? null,
    }),
  });
}

export async function postIn(payload: MovementPayload): Promise<void> {
  const idem = newIdemKey();
  await http<unknown>("/api/movements", {
    method: "POST",
    headers: { "X-Idempotency-Key": idem },
    body: JSON.stringify({
      direction: "IN",
      product_id: payload.product_id,
      location_id: payload.location_id,
      qty: payload.qty,
      reason_id: payload.reason_id,
      customer: payload.customer,
      note: payload.note ?? null,
      occurred_at: payload.occurred_at ?? null,
    }),
  });
}

export async function postTransfer(p: TransferPayload): Promise<void> {
  const idem = newIdemKey();
  await http<unknown>("/api/transfer", {
    method: "POST",
    headers: { "X-Idempotency-Key": idem },
    body: JSON.stringify({
      product_id: p.product_id,
      to_location_id: p.to_location_id,
      note: p.note ?? null,
      occurred_at: p.occurred_at ?? null,
    }),
  });
}

// Criação de local (para o caso de permitir criar label on-the-fly)
export async function createLocation(label: string): Promise<LocationOption> {
  const data = await http<unknown>("/api/locations", {
    method: "POST",
    body: JSON.stringify({ label }),
  });
  if (isObject(data)) {
    const id  = readNum(data, ["id"]);
    const lbl = readStr(data, ["label", "location_label"]);
    if (id !== undefined && lbl) return { id, label: lbl };
  }
  throw new Error("Invalid response creating location");
}

// Função de criação (adicione junto aos POSTs existentes)
export async function createProduct(
  p: ProductCreatePayload
): Promise<ProductCreateResponse> {
  const body = {
    // backend aceita 'part_number' ou 'code'; aqui enviamos 'part_number'
    part_number: p.part_number,
    description: p.description ?? null,
    manufacturer_id: p.manufacturer_id,
    family_id: typeof p.family_id === "number" ? p.family_id : null,
  };

  const data = await http<unknown>("/api/products", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const id = obj.product_id;
    if (typeof id === "number" && id > 0) {
      return { product_id: id };
    }
  }
  throw new Error("Invalid response creating product");
}

// Tipos auxiliares
export interface ProductBasic {
  product_id: number;
  part_number: string;
  description: string;
  manufacturer?: string;
  is_active?: boolean;
  family_id?: number;
}

// Cria nova família (tenta /api/families e fallback /api/product-families)
export async function createFamily(name: string): Promise<Family> {
  const data = await http<unknown>("/api/families", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    const id = typeof o.id === "number" ? o.id : undefined;
    const nm = typeof o.name === "string" ? o.name : undefined;
    if (id !== undefined && nm) return { id, name: nm };
  }
  throw new Error("Invalid response creating family");
}

// Atualiza produto (best-effort; ignora se endpoint não existir)
export async function updateProduct(
  product_id: number,
  patch: {
    part_number?: string;
    description?: string;
    manufacturer_id?: number;
    family_id?: number;
    is_active?: boolean;
  }
): Promise<void> {
  try {
    await http<unknown>(`/api/products/${product_id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    return;
  } catch (e) {
    if (!(e instanceof Error && e.message.includes("404"))) throw e;
  }
  try {
    await http<unknown>(`/api/products/${product_id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  } catch (e) {
    if (!(e instanceof Error && e.message.includes("404"))) throw e;
  }
}
