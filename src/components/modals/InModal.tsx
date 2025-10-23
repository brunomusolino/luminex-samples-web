import { useEffect, useMemo, useState } from "react";
import { postIn, searchLocations, type Reason, type StockItem } from "../../lib/api";

type Props = {
  open: boolean;
  product: StockItem | null;
  reasons: Reason[];
  onClose: () => void;
  onDone: () => void;
};

type Loc = { id: number; label: string };

export default function InModal({ open, product, reasons, onClose, onDone }: Props) {
  const [qty, setQty] = useState<number>(1);
  const [reasonId, setReasonId] = useState<number | "">("");
  const [customer, setCustomer] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [locations, setLocations] = useState<Loc[]>([]);
  const [toLocationId, setToLocationId] = useState<number | "">("");

  const needsLocation = product ? product.qty === 0 : false;
  const currentLabel = product?.location_label ?? "—";

  useEffect(() => {
    let mounted = true;
    if (needsLocation) {
      searchLocations("")
        .then((ls) => { if (mounted) setLocations(ls); })
        .catch(() => { if (mounted) setLocations([]); });
    } else {
      setLocations([]);
    }
    return () => { mounted = false; };
  }, [needsLocation]);

  const canSubmit = useMemo(() => {
    if (!product) return false;
    const baseOk = qty > 0 && reasonId !== "";
    return needsLocation ? baseOk && toLocationId !== "" : baseOk;
  }, [product, qty, reasonId, needsLocation, toLocationId]);

  async function submit() {
    if (!product || !canSubmit) return;

    await postIn({
      product_id: product.product_id,
      location_id: needsLocation ? Number(toLocationId) : (product.location_id as number),
      qty,
      reason_id: Number(reasonId),
      customer: customer || "",
      note: note || undefined,
    });

    onDone();
    onClose();
  }

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Receber amostras</h2>
          <button onClick={onClose} className="px-3 py-1 border rounded-lg">Fechar</button>
        </div>

        <div className="text-sm mb-3">
          <div className="font-medium">{product.part_number}</div>
          <div className="text-gray-600">{product.description ?? "—"}</div>
          <div className="text-gray-500 text-xs mt-1">
            Saldo atual: <b>{product.qty}</b> · Endereço atual: <b>{currentLabel}</b>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Quantidade</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Motivo</label>
            <select
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : "")}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Selecione…</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {needsLocation && (
            <div>
              <label className="text-sm block mb-1">Endereço (novo)</label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value ? Number(e.target.value) : "")}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Como o saldo atual é 0, selecione o endereço para receber.
              </div>
            </div>
          )}

          <div>
            <label className="text-sm block mb-1">Cliente (opcional)</label>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Nome do cliente"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Observação (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Observações adicionais"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded-lg">Cancelar</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            Confirmar entrada
          </button>
        </div>
      </div>
    </div>
  );
}
