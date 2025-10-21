import { apiBaseUrl } from "./authConfig";
import { loginAndAcquireToken } from "./msal";

export async function apiGet<T>(path: string): Promise<T> {
  const { accessToken } = await loginAndAcquireToken();
  const r = await fetch(`${apiBaseUrl}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, opts?: { idempotencyKey?: string }): Promise<T> {
  const { accessToken } = await loginAndAcquireToken();
  const idem = opts?.idempotencyKey || (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const r = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "Idempotency-Key": idem },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const text = await r.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      if (j && typeof j === "object") {
        const o = j as Record<string, unknown>;
        const m =
          (typeof o.error === "string" && o.error) ||
          (typeof o.message === "string" && o.message);
        if (m) msg = m;
      }
    } catch (err: unknown) {
      // não era JSON – mantenha o texto cru; loga em dev só para diagnóstico
      if (import.meta.env.DEV) console.debug("apiPost: error body not JSON", err);
    }
    throw new Error(`HTTP ${r.status} ${r.statusText} - ${msg}`);
  }

  return r.json() as Promise<T>;
}
