// src/lib/msal.ts
import {
  PublicClientApplication,
  LogLevel,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser";

/**
 * Requer no .env.local:
 * - VITE_CLIENT_ID_SPA
 * - VITE_TENANT_ID
 * - VITE_AUTHORITY (ex.: https://login.microsoftonline.com/<TENANT> ou com /v2.0)
 * - VITE_API_SCOPE  (ex.: api://<API_APP_ID>/user_impersonation)
 */
const CLIENT_ID = (import.meta.env.VITE_CLIENT_ID_SPA as string | undefined)?.trim();
const TENANT_ID = (import.meta.env.VITE_TENANT_ID as string | undefined)?.trim();
const AUTHORITY =
  (import.meta.env.VITE_AUTHORITY as string | undefined)?.trim() ||
  (TENANT_ID ? `https://login.microsoftonline.com/${TENANT_ID}` : undefined);
const API_SCOPE = (import.meta.env.VITE_API_SCOPE as string | undefined)?.trim();

function assertEnv() {
  const missing: string[] = [];
  if (!CLIENT_ID) missing.push("VITE_CLIENT_ID_SPA");
  if (!AUTHORITY) missing.push("VITE_AUTHORITY");
  if (!API_SCOPE) missing.push("VITE_API_SCOPE");
  if (missing.length) throw new Error(`MSAL: faltam variáveis no .env.local -> ${missing.join(", ")}`);
}
assertEnv();

const LOGIN_SCOPES = ["openid", "profile", "offline_access"];
const API_SCOPES = [API_SCOPE!];

let pca: PublicClientApplication | null = null;
let initPromise: Promise<void> | null = null;
let inflightToken: Promise<string> | null = null;

export function initialize(): Promise<void> {
  if (initPromise) return initPromise;
  pca = new PublicClientApplication({
    auth: {
      clientId: CLIENT_ID!,
      authority: AUTHORITY!,
      redirectUri: window.location.origin,
      navigateToLoginRequestUrl: false,
    },
    cache: { cacheLocation: "localStorage", storeAuthStateInCookie: false },
    system: {
      loggerOptions: {
        piiLoggingEnabled: false,
        logLevel: LogLevel.Verbose,
        loggerCallback: (_lvl, msg, containsPii) => {
          if (!containsPii && msg) console.log("[msal]", msg);
        },
      },
    },
  });
  initPromise = pca.initialize();
  return initPromise;
}

function getAccount(): AccountInfo | null {
  const accs = pca!.getAllAccounts();
  return accs[0] ?? null;
}

// ⚠️ devolve apenas boolean para evitar narrowing estranho do TS
function isAccessTokenForApi(res: AuthenticationResult | null): boolean {
  if (!res) return false;
  const scp = res.scopes || [];
  return scp.some((s) => s.toLowerCase() === API_SCOPES[0]!.toLowerCase());
}

function clearMsalCaches() {
  [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
    .filter((k) => k.startsWith("msal."))
    .forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
}

export async function loginAndAcquireToken(): Promise<string> {
  await initialize();

  if (inflightToken) return inflightToken;

  inflightToken = (async () => {
    const handled: AuthenticationResult | null = await pca!
      .handleRedirectPromise()
      .catch(() => null);

    // Se veio token já com o escopo da API, usa direto
    if (isAccessTokenForApi(handled)) {
      return (handled as AuthenticationResult).accessToken;
    }

    // Extrai conta de forma segura sem provocar "never"
    const accFromHandled: AccountInfo | null =
      handled && "account" in handled ? (handled.account ?? null) : null;
    const acc: AccountInfo | null = accFromHandled ?? getAccount();

    if (!acc) {
      try {
        await pca!.loginRedirect({ scopes: LOGIN_SCOPES, prompt: "select_account" });
        return new Promise<string>(() => {}); // aguarda redirect
      } catch {
        clearMsalCaches();
        await pca!.loginRedirect({ scopes: LOGIN_SCOPES, prompt: "select_account" });
        return new Promise<string>(() => {});
      }
    }

    try {
      const silent = await pca!.acquireTokenSilent({ account: acc, scopes: API_SCOPES });
      return silent.accessToken;
    } catch {
      await pca!.acquireTokenRedirect({ account: acc, scopes: API_SCOPES });
      return new Promise<string>(() => {});
    }
  })();

  try {
    return await inflightToken;
  } finally {
    inflightToken = null;
  }
}
