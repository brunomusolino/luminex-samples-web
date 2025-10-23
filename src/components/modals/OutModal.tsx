// src/components/modals/OutModal.tsx
import { useEffect, useMemo, useState } from "react";
import { postOut, type MovementReason, type StockItem } from "../../lib/api";

type Props = {
  open: boolean;
  product: StockItem;
  reasons: MovementReason[];
  onClose: () => void;
  onDone: () => void;
};

export default function OutModal({ open, product, reasons, onClose, onDone }: Props) {
  // qty como string para permitir apagar e digitar livremente
  const [qtyInput, setQtyInput] = useState<string>("1");
  const [reasonId, setReasonId] = useState<number | "">("");
  const [customer, setCustomer] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const available = useMemo(() => (Number.isFinite(product.qty) ? product.qty : 0), [product.qty]);

  // Converte a string para número inteiro válido (clamp 1..available quando fizer sentido)
  const qtyNum = useMemo(() => {
    if (qtyInput.trim() === "") return 0;
    const n = Math.floor(Number(qtyInput));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return available > 0 ? Math.min(n, available) : 0;
  }, [qtyInput, available]);

  // Reseta ao abrir
  useEffect(() => {
    if (!open) return;
    setQtyInput("1");
    setReasonId("");
    setCustomer("");
    setNote("");
  }, [open, product]);

  if (!open) return null;

  const canSubmit = qtyNum >= 1 && reasonId !== "" && available > 0 && product.location_id != null;

  const onSubmit = async () => {
    if (!canSubmit) return;
    await postOut({
      product_id: product.product_id,
      location_id: product.location_id as number, // para OUT, deve existir
      qty: qtyNum,
      reason_id: Number(reasonId),
      customer: customer || "",
      note: note || undefined,
    });
    onDone();
    onClose();
  };

  // Aceita apenas dígitos; permite vazio durante digitação
  const handleQtyChange = (val: string) => {
    if (!/^\d*$/.test(val)) return; // ignora não numéricos
    if (val === "") {
      setQtyInput(val);
      return;
    }
    // remove zeros à esquerda e clampa
    let s = val.replace(/^0+(\d)/, "$1");
    const n = Number(s);
    if (available > 0 && n > available) s = String(available);
    setQtyInput(s);
  };

  // Normaliza ao sair do campo (1 se houver estoque, 0 se não)
  const handleQtyBlur = () => {
    if (qtyInput.trim() === "") {
      setQtyInput(available > 0 ? "1" : "0");
      return;
    }
    const n = Number(qtyInput);
    if (!Number.isFinite(n) || n < 1) {
      setQtyInput(available > 0 ? "1" : "0");
    } else if (available > 0 && n > available) {
      setQtyInput(String(available));
    } else {
      setQtyInput(String(Math.floor(n)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-3">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b px-4 py-3">
          <div className="text-lg font-semibold">Saída de Estoque</div>
          <div className="text-sm text-gray-600">
            {product.part_number ?? product.code} — {product.description}
          </div>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="text-sm text-gray-700">
            Endereço: <span className="font-medium">{product.location_label}</span>
          </div>
          <div className="text-sm text-gray-700">
            Qtd. disponível: <span className="font-medium">{available}</span>
          </div>

          <label className="block">
            <span className="text-sm text-gray-700">Quantidade</span>
            <input
              type="number"            // mantém setinhas
              inputMode="numeric"
              min={available > 0 ? 1 : 0}
              step={1}
              value={qtyInput}
              onChange={(e) => handleQtyChange(e.target.value)}
              onBlur={handleQtyBlur}
              disabled={available <= 0}
              placeholder={available > 0 ? "1" : "0"}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
            />
            {available === 0 && (
              <div className="mt-1 text-xs text-red-600">
                Sem estoque disponível para saída.
              </div>
            )}
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Motivo</span>
            <select
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : "")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Selecione…</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Cliente (opcional)</span>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Cliente/ordem"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Observações (opcional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
              rows={3}
              placeholder="Observações adicionais"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`rounded-lg px-3 py-2 text-white ${
              canSubmit ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Confirmar saída
          </button>
        </div>
      </div>
    </div>
  );
}
