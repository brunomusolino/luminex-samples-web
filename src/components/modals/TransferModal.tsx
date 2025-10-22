import { useEffect, useState } from "react";
import { createLocation, postTransfer, searchLocations } from "../../lib/api";

export default function TransferModal({
  open,
  onClose,
  product_id,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  product_id: number;
  onSuccess: (movedQty: number, toLabel: string) => void;
}) {
  const [locQuery, setLocQuery] = useState("");
  const [locOpts, setLocOpts] = useState<{ id: number; location_label: string }[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!locQuery) { setLocOpts([]); return; }
      const rows = await searchLocations(locQuery);
      if (alive) setLocOpts(rows);
    })();
    return () => { alive = false; };
  }, [locQuery]);

  const submit = async () => {
    try {
      const label = locQuery.trim();
      if (!label) throw new Error("Informe o endereço destino (ex.: B-01.3)");
      const dest = await createLocation(label); // cria se não existir
      const r = await postTransfer({ product_id, to_location_id: dest.id, note });
      onSuccess(r.moved_qty, dest.location_label);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3">
        <h3 className="text-lg font-semibold">Transferir endereço (100%)</h3>
        <div className="grid gap-2">
          <label className="text-sm">Destino (ex.: B-01.3)</label>
          <input className="border rounded px-3 py-2" value={locQuery} onChange={(e)=>setLocQuery(e.target.value.toUpperCase())} list="xfer-locs" />
          <datalist id="xfer-locs">{locOpts.map(o=> <option key={o.id} value={o.location_label}/>)}</datalist>
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Observação (opcional)</label>
          <textarea className="border rounded px-3 py-2" value={note} onChange={(e)=>setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2" onClick={onClose}>Cancelar</button>
          <button className="bg-black text-white rounded px-4 py-2" onClick={submit}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}