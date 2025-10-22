import { useEffect, useState } from "react";
import type { MovementRow } from "../../lib/api";
import { fetchHistory } from "../../lib/api";

export default function HistoryModal({ open, onClose, product_id }: { open: boolean; onClose: () => void; product_id: number; }) {
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const data = await fetchHistory(product_id, 100);
        if (alive) setRows(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
      }

    })();
    return () => { alive = false; };
  }, [open, product_id]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-4 space-y-3 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Histórico</h3>
          <button className="px-3 py-1" onClick={onClose}>Fechar</button>
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <ul className="divide-y">
          {rows.map(r => (
            <li key={r.id} className="py-2 text-sm flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-white ${r.direction === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{r.direction}</span>
              <span className="w-20 text-right tabular-nums">{r.qty}</span>
              <span className="text-gray-500">{new Date(r.occurred_at).toLocaleString()}</span>
              <span className="flex-1">{r.reason || "—"}</span>
              <span className="w-36 truncate">{r.customer || ""}</span>
              <span className="w-24 text-gray-500">{r.location_label || ""}</span>
              <span className="w-48 truncate">{r.note || ""}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}