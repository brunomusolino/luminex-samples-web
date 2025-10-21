import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import type { AccountInfo } from "@azure/msal-browser";
import { authority, clientIdSpa, apiScope } from "./authConfig";

let _pca: PublicClientApplication | null = null;
let _pcaInitPromise: Promise<void> | null = null;

function ensureEnv(v: string | undefined, name: string) {
  if (!v || !v.trim()) {
    throw new Error(`Config inválida: variável ${name} está vazia. Confira .env.local e reinicie o Vite.`);
  }
}

function getPca(): PublicClientApplication {
  if (_pca) return _pca;
  ensureEnv(clientIdSpa, "VITE_CLIENT_ID_SPA");
  _pca = new PublicClientApplication({
    auth: { clientId: clientIdSpa, authority, redirectUri: window.location.origin },
    cache: { cacheLocation: "localStorage" }
  });
  return _pca;
}

async function ensureInitialized(): Promise<PublicClientApplication> {
  const pca = getPca();
  if (!_pcaInitPromise) {
    // Obrigatório no msal-browser v3+
    _pcaInitPromise = pca.initialize();
  }
  await _pcaInitPromise;
  return pca;
}

export async function loginAndAcquireToken(): Promise<{ account: AccountInfo; accessToken: string }> {
  const pca = await ensureInitialized();

  let account = pca.getAllAccounts()[0];
  if (!account) {
    const resLogin = await pca.loginPopup({ scopes: [apiScope] });
    account = resLogin.account!;
  }

  try {
    const res = await pca.acquireTokenSilent({ scopes: [apiScope], account });
    return { account, accessToken: res.accessToken };
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const res2 = await pca.acquireTokenPopup({ scopes: [apiScope], account });
      return { account: res2.account!, accessToken: res2.accessToken };
    }
    throw e;
  }
}
