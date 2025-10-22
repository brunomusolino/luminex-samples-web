import { useEffect, useState } from "react";
import type { Reason } from "../../lib/api";
import { fetchMovementReasons, postOut } from "../../lib/api";

export default function OutModal({
  open,
  onClose,
  product_id,
  location_id,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  product_id: number;
  location_id: number;
  onSuccess: (newId: number) => void;
}) {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [qty, setQty] = useState(1);
  const [reason_id, setReasonId] = useState<number>(1);
  const [customer, setCustomer] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchMovementReasons().then(setReasons).catch(() => setReasons([])); }, []);

  const submit = async () => {
    try {
      setLoading(true); setErr(null);
      const r = await postOut({ product_id, location_id, qty, reason_id, customer, note });
      onSuccess(r.id); onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    }
    finally { setLoading(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3">
        <h3 className="text-lg font-semibold">Retirar amostras</h3>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <div className="grid gap-2">
          <label className="text-sm">Quantidade</label>
          <input type="number" min={1} className="border rounded px-3 py-2" value={qty} onChange={(e)=>setQty(parseInt(e.target.value||"1",10))} />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Motivo</label>
          <select className="border rounded px-3 py-2" value={reason_id} onChange={(e)=>setReasonId(parseInt(e.target.value,10))}>
            {reasons.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Cliente</label>
          <input className="border rounded px-3 py-2" value={customer} onChange={(e)=>setCustomer(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Observação (opcional)</label>
          <textarea className="border rounded px-3 py-2" value={note} onChange={(e)=>setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2" onClick={onClose}>Cancelar</button>
          <button disabled={loading || !customer || !qty || qty<=0} className="bg-black text-white rounded px-4 py-2" onClick={submit}>
            {loading ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}