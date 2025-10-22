// src/lib/msal.ts
import { PublicClientApplication, type AccountInfo } from "@azure/msal-browser";

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID_SPA!;
const TENANT_ID = import.meta.env.VITE_TENANT_ID!;
const AUTHORITY = import.meta.env.VITE_AUTHORITY || `https://login.microsoftonline.com/${TENANT_ID}`;
// Use o .default (ex.: api://<CLIENT_ID_API>/.default)
const API_SCOPE = import.meta.env.VITE_API_SCOPE!;

let pca: PublicClientApplication | null = null;
let ready: Promise<void> | null = null;

export function initialize(): Promise<void> {
  if (ready) return ready;
  pca = new PublicClientApplication({
    auth: { clientId: CLIENT_ID, authority: AUTHORITY, redirectUri: window.location.origin },
    cache: { cacheLocation: "localStorage", storeAuthStateInCookie: false },
  });
  ready = pca.initialize();
  return ready;
}

function getAccount(): AccountInfo | null {
  const accs = pca!.getAllAccounts();
  return accs[0] ?? null;
}

export async function loginAndAcquireToken(): Promise<string> {
  await initialize();
  let account = getAccount();
  if (!account) {
    const login = await pca!.loginPopup({ scopes: [API_SCOPE] });
    account = login.account!;
  }
  try {
    const res = await pca!.acquireTokenSilent({ account, scopes: [API_SCOPE] });
    return res.accessToken;
  } catch {
    const res = await pca!.acquireTokenPopup({ account, scopes: [API_SCOPE] });
    return res.accessToken;
  }
}
