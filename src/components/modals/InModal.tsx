// src/components/modals/InModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  postIn,
  listLocations,
  createLocation,
  type Reason,
  type StockItem,
  type LocationOption,
} from "../../lib/api";

type Props = {
  open: boolean;
  product: StockItem | null;
  reasons: Reason[];
  onClose: () => void;
  onDone: () => void;
};

export default function InModal({ open, product, reasons, onClose, onDone }: Props) {
  // qty como string para permitir apagar/digitar livremente
  const [qtyInput, setQtyInput] = useState<string>("1");
  const qtyNum = useMemo(() => {
    const n = Number(qtyInput);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }, [qtyInput]);

  const [reasonId, setReasonId] = useState<number | "">("");
  const [customer, setCustomer] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [toLocationId, setToLocationId] = useState<number | "">("");

  // Se o saldo atual é 0, precisamos pedir endereço
  const needsLocation = product ? product.qty === 0 : false;
  const currentLabel = product?.location_label ?? "—";

  // Reseta o formulário ao abrir com um produto
  useEffect(() => {
    if (!open || !product) return;
    setQtyInput("1");
    setReasonId("");
    setCustomer("");
    setNote("");
    setToLocationId("");

    if (needsLocation) {
      // carrega todos os endereços existentes
      listLocations()
        .then((ls) =>
          setLocations(
            [...ls].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
          )
        )
        .catch(() => setLocations([]));
    } else {
      setLocations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  // Validação para habilitar o botão
  const canSubmit = useMemo(() => {
    if (!product) return false;
    const baseOk = qtyNum > 0 && reasonId !== "";
    return needsLocation ? baseOk && toLocationId !== "" : baseOk;
  }, [product, qtyNum, reasonId, needsLocation, toLocationId]);

  // Normaliza qty ao sair do campo (evita zero ou vazio)
  const clampQtyOnBlur = () => {
    if (qtyNum <= 0) setQtyInput("1");
    else setQtyInput(String(qtyNum));
  };

  const handleCreateLocation = async () => {
    const label = prompt("Novo endereço (formato B-01.3):");
    const val = (label ?? "").trim();
    if (!val) return;
    try {
      const loc = await createLocation(val);
      setLocations((prev) =>
        prev.some((l) => l.id === loc.id) ? prev : [...prev, loc].sort((a, b) => a.label.localeCompare(b.label))
      );
      setToLocationId(loc.id);
    } catch (e) {
      alert((e as Error).message || "Falha ao criar endereço.");
    }
  };

  async function submit() {
    if (!product || !canSubmit) return;

    await postIn({
      product_id: product.product_id,
      location_id: needsLocation ? Number(toLocationId) : (product.location_id as number),
      qty: qtyNum,
      reason_id: Number(reasonId),
      customer: customer || "",
      note: note || undefined,
    });

    onDone();   // StockPage marca o item como alterado e refaz o fetch
    onClose();
  }

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Receber amostras</h2>
          <button onClick={onClose} className="rounded-lg border px-3 py-1 hover:bg-gray-50">Fechar</button>
        </div>

        <div className="mb-3 text-sm">
          <div className="font-medium">{product.part_number ?? product.code}</div>
          <div className="text-gray-600">{product.description ?? "—"}</div>
          <div className="mt-1 text-xs text-gray-500">
            Saldo atual: <b>{product.qty}</b> · Endereço atual: <b>{currentLabel}</b>
          </div>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            Quantidade
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={clampQtyOnBlur}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Motivo
            <select
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Selecione…</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>

          {needsLocation && (
            <label className="grid gap-1 text-sm">
              Endereço (novo)
              <div className="flex gap-2">
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value ? Number(e.target.value) : "")}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Selecione…</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCreateLocation}
                  className="rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
                >
                  Novo…
                </button>
              </div>
              <span className="mt-1 text-xs text-gray-500">
                Como o saldo atual é 0, selecione (ou crie) o endereço para receber.
              </span>
            </label>
          )}

          <label className="grid gap-1 text-sm">
            Cliente (opcional)
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Nome do cliente"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Observação (opcional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={3}
              placeholder="Observações adicionais"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-3 py-2 hover:bg-gray-50">Cancelar</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`rounded-lg px-3 py-2 text-white ${!canSubmit ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            Confirmar entrada
          </button>
        </div>
      </div>
    </div>
  );
}
