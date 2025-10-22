import { useEffect, useState } from "react";
import type { Reason } from "../../lib/api";
import { fetchMovementReasons, postIn, searchLocations, createLocation } from "../../lib/api";

export default function InModal({
  open,
  onClose,
  product_id,
  currentQty,
  currentLocationId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  product_id: number;
  currentQty: number;
  currentLocationId: number | null;
  onSuccess: (newId: number, newLocationLabel?: string | null) => void;
}) {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [qty, setQty] = useState(1);
  const [reason_id, setReasonId] = useState<number>(3); // "Novos Recebimentos" no seu seed
  const [customer, setCustomer] = useState("Fornecedor");
  const [note, setNote] = useState("");

  const [locQuery, setLocQuery] = useState("");
  const [locOpts, setLocOpts] = useState<{ id: number; location_label: string }[]>([]);
  const [locationLabel, setLocationLabel] = useState<string>("");

  useEffect(() => { fetchMovementReasons().then(setReasons).catch(() => setReasons([])); }, []);
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
      let location_id = currentLocationId ?? undefined;
      let locLabel: string | undefined;

      if (!currentLocationId || currentQty <= 0) {
        // precisa definir endereço quando saldo zero
        const label = (locationLabel || locQuery).trim();
        if (!label) throw new Error("Informe o endereço (ex.: B-01.3)");
        // tenta criar/obter id
        const created = await createLocation(label);
        location_id = created.id;
        locLabel = created.location_label;
      }

      const r = await postIn({ product_id, location_id: location_id!, qty, reason_id, customer, note });
      onSuccess(r.id, locLabel ?? null);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    }
  };

  if (!open) return null;
  const needsAddress = !currentLocationId || currentQty <= 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3">
        <h3 className="text-lg font-semibold">Receber amostras</h3>
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
          <label className="text-sm">Cliente/Origem</label>
          <input className="border rounded px-3 py-2" value={customer} onChange={(e)=>setCustomer(e.target.value)} />
        </div>
        <div className="grid gap-2">
        <label className="text-sm">Observação (opcional)</label>
        <textarea
          className="border rounded px-3 py-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
        {needsAddress && (
          <div className="grid gap-2">
            <label className="text-sm">Endereço (ex.: B-01.3)</label>
            <input className="border rounded px-3 py-2" value={locationLabel} onChange={(e)=>setLocationLabel(e.target.value.toUpperCase())} list="in-locs" onInput={(e)=>setLocQuery((e.target as HTMLInputElement).value)} />
            <datalist id="in-locs">{locOpts.map(o=> <option key={o.id} value={o.location_label}/>)}</datalist>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2" onClick={onClose}>Cancelar</button>
          <button className="bg-black text-white rounded px-4 py-2" onClick={submit}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}