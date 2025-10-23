import { useEffect, useState } from "react";
import StockPage from "./pages/StockPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { loginAndAcquireToken } from "./lib/msal";

const qc = new QueryClient();

export default function App() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loginAndAcquireToken();
        if (mounted) setReady(true);
      } catch (e) {
        if (mounted) setErr((e as Error).message || "Falha ao autenticar");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md bg-white border rounded-xl p-4">
          <h1 className="text-lg font-semibold mb-2">Erro de autenticação</h1>
          <p className="text-sm text-red-600">{err}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-700">Autenticando…</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={qc}>
      <StockPage />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
