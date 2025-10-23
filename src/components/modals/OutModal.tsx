import { useEffect, useMemo, useState } from "react";
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
  // mantemos uma string para permitir apagar e digitar livremente
  const [qtyStr, setQtyStr] = useState<string>("1");
  const [reasonId, setReasonId] = useState<number | undefined>(undefined);
  const [customer, setCustomer] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const available = useMemo(() => (Number.isFinite(product.qty) ? product.qty : 0), [product.qty]);

  // converte qtyStr → número válido (ou undefined se vazio/indefinido)
  const qtyNum = useMemo(() => {
    if (qtyStr.trim() === "") return undefined;
    const n = Number(qtyStr);
    return Number.isFinite(n) ? n : undefined;
  }, [qtyStr]);

  useEffect(() => {
    if (!open) return;
    setQtyStr("1");
    setReasonId(undefined);
    setCustomer("");
    setNote("");
  }, [open, product]);

  if (!open) return null;

  const canSubmit =
    typeof qtyNum === "number" &&
    qtyNum >= 1 &&
    qtyNum <= available &&
    typeof reasonId === "number" &&
    reasonId > 0;

  const onSubmit = async () => {
    if (!canSubmit) return;
    await postOut({
      product_id: product.product_id,
      location_id: product.location_id ?? 0,
      qty: qtyNum!,
      reason_id: reasonId!,
      customer,
      note: note || undefined,
    });
    onDone();
  };

  // aceita apenas dígitos; permite vazio durante a digitação
  const handleQtyChange = (val: string) => {
    if (!/^\d*$/.test(val)) return; // ignora caracteres não numéricos
    if (val === "") {
      setQtyStr(val);
      return;
    }
    let s = val.replace(/^0+(\d)/, "$1"); // remove zero à esquerda (ex.: 01 → 1)
    const n = Number(s);
    if (available > 0 && n > available) {
      s = String(available); // clamp imediato no máximo permitido
    }
    setQtyStr(s);
  };

  // ao sair do campo, normaliza para pelo menos 1 (se houver estoque)
  const handleQtyBlur = () => {
    if (qtyStr.trim() === "") {
      setQtyStr(available > 0 ? "1" : "0");
      return;
    }
    const n = Number(qtyStr);
    if (!Number.isFinite(n) || n < 1) {
      setQtyStr(available > 0 ? "1" : "0");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-3">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b px-4 py-3">
          <div className="text-lg font-semibold">Saída de Estoque</div>
          <div className="text-sm text-gray-600">
            {product.code} — {product.description}
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="text-sm text-gray-700">
            Endereço: <span className="font-medium">{product.location_label}</span>
          </div>
          <div className="text-sm text-gray-700">
            Qtd. disponível: <span className="font-medium">{available}</span>
          </div>

          <label className="block">
            <span className="text-sm text-gray-700">Quantidade</span>
            <input
              type="text" // ← texto para permitir apagar/digitar livremente
              inputMode="numeric"
              value={qtyStr}
              onChange={(e) => handleQtyChange(e.target.value)}
              onBlur={handleQtyBlur}
              disabled={available <= 0}
              placeholder={available > 0 ? "1" : "0"}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
            />
            {available === 0 && (
              <div className="mt-1 text-xs text-red-600">Sem estoque disponível para saída.</div>
            )}
            {typeof qtyNum === "number" && qtyNum > available && (
              <div className="mt-1 text-xs text-red-600">
                A quantidade não pode exceder o estoque disponível.
              </div>
            )}
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Motivo</span>
            <select
              value={reasonId ?? ""}
              onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : undefined)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Selecione...</option>
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
            disabled={!canSubmit}
            onClick={onSubmit}
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
