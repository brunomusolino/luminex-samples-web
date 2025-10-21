import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo } from "@azure/msal-browser";
import { authority, clientIdSpa, apiScope } from "./authConfig";

export const pca = new PublicClientApplication({
  auth: { clientId: clientIdSpa, authority, redirectUri: window.location.origin },
  cache: { cacheLocation: "localStorage" }
});

export async function loginAndAcquireToken(): Promise<{account: AccountInfo, accessToken: string}> {
  const accounts = pca.getAllAccounts();
  const account = accounts[0] || (await pca.loginPopup({ scopes: [apiScope] })).account!;
  try {
    const res = await pca.acquireTokenSilent({ scopes: [apiScope], account });
    return { account, accessToken: res.accessToken };
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const res2 = await pca.acquireTokenPopup({ scopes: [apiScope], account });
      return { account, accessToken: res2.accessToken };
    }
    throw e;
  }
}
