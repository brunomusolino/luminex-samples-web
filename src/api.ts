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
  const idem = opts?.idempotencyKey || (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const r = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, "Idempotency-Key": idem },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}
