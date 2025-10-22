import { useEffect, useState } from "react";
import StockPage from "./pages/StockPage";
import { loginAndAcquireToken } from "./lib/msal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const qc = new QueryClient();

export default function App() {
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { (async () => { await loginAndAcquireToken(); setReady(true); })(); }, []);
  if (!ready) return <div className="p-6 text-sm text-gray-600">Autenticando…</div>;

  return (
    <QueryClientProvider client={qc}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-3 h-12 flex items-center gap-3">
            <button className="border rounded px-3 py-1" onClick={() => setMenuOpen((v) => !v)}>☰</button>
            <div className="font-semibold">Luminex — Amostras</div>
          </div>
          {menuOpen && (
            <nav className="border-t">
              <div className="max-w-6xl mx-auto px-3 py-2 text-sm">
                <a className="block py-1" href="#" onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}>Estoque de Amostras</a>
              </div>
            </nav>
          )}
        </header>

        <StockPage />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
