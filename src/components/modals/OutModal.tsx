import { useMemo, useState } from "react";
import type { MovementReason, StockItem } from "../../lib/api";
import { postOut } from "../../lib/api";

type Props = {
  open: boolean;
  product: StockItem;
  reasons: MovementReason[];
  onClose: () => void;
  onDone: () => void;
};

export default function OutModal({ open, product, reasons, onClose, onDone }: Props) {
  const maxQty = useMemo(() => Math.max(0, product.qty ?? 0), [product.qty]);
  const [qty, setQty] = useState<number>(maxQty > 0 ? 1 : 0);
  const [reasonId, setReasonId] = useState<number>(reasons[0]?.id ?? 1);
  const [customer, setCustomer] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const disabled = submitting || qty <= 0 || qty > maxQty;

  if (!open) return null;

  const submit = async () => {
    if (disabled) return;
    try {
      setSubmitting(true);
      await postOut({
        product_id: product.product_id,
        location_id: product.location_id ?? 0,
        qty: Math.min(qty, maxQty),
        reason_id: reasonId,
        customer,
        note: note || undefined,
      });
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="text-lg font-semibold">Saída (OUT)</div>
        <div className="mt-1 text-sm text-gray-600">{product.description}</div>
        <div className="mt-1 text-xs text-gray-500">Endereço: {product.location_label}</div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            Quantidade (máx. {maxQty})
            <input
              type="number"
              min={0}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(Math.max(0, Math.min(Number(e.target.value || 0), maxQty)))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Motivo
            <select
              value={reasonId}
              onChange={(e) => setReasonId(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Cliente (opcional)
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Observação (opcional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-3 py-2 hover:bg-gray-50">Cancelar</button>
          <button
            onClick={submit}
            disabled={disabled}
            className={`rounded-lg px-3 py-2 text-white ${disabled ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            Confirmar saída
          </button>
        </div>
      </div>
    </div>
  );
}
