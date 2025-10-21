// debug opcional: ver se as envs entraram mesmo
// console.log("ENV", import.meta.env.VITE_TENANT_ID, import.meta.env.VITE_CLIENT_ID_API, import.meta.env.VITE_CLIENT_ID_SPA, import.meta.env.VITE_API_HOST);


export const tenantId     = import.meta.env.VITE_TENANT_ID as string;
export const clientIdSpa  = import.meta.env.VITE_CLIENT_ID_SPA as string;
export const clientIdApi  = import.meta.env.VITE_CLIENT_ID_API as string;
export const apiHost      = import.meta.env.VITE_API_HOST as string;

export const authority = `https://login.microsoftonline.com/${tenantId}`;
export const apiScope  = `api://${clientIdApi}/user_impersonation`;
export const apiBaseUrl = `https://${apiHost}`;
