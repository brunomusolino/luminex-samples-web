import { useEffect, useState } from "react";
import { fetchHistory, type HistoryRow } from "../../lib/api";

type Props = {
  productId: number;
  onClose: () => void;
};

export default function HistoryModal({ productId, onClose }: Props) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchHistory(productId);
        setRows(r);
      } catch (e) {
        setError((e as Error).message || "Falha ao carregar histórico");
        setRows([]);
      }
    })();
  }, [productId]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Histórico de Movimentações</div>
          <button onClick={onClose} className="rounded-lg border px-3 py-1 hover:bg-gray-50">Fechar</button>
        </div>

        {error && <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-red-700 text-sm">{error}</div>}

        {!rows && !error && <div className="mt-3 text-sm text-gray-500">Carregando…</div>}

        {rows && rows.length === 0 && !error && (
          <div className="mt-3 text-sm text-gray-500">Sem movimentações.</div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Data/Hora</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Qtd</th>
                  <th className="py-2 pr-4">Motivo</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Usuário</th>
                  <th className="py-2 pr-4">Endereço</th>
                  <th className="py-2 pr-4">Obs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-4">{new Date(r.occurred_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{r.direction}</td>
                    <td className="py-2 pr-4">{r.qty}</td>
                    <td className="py-2 pr-4">{r.reason ?? "-"}</td>
                    <td className="py-2 pr-4">{r.customer ?? "-"}</td>
                    <td className="py-2 pr-4">{r.user ?? "-"}</td>
                    <td className="py-2 pr-4">{r.location_label ?? "-"}</td>
                    <td className="py-2 pr-4">{r.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
