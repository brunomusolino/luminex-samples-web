import { useEffect, useMemo, useState } from "react";
import type { StockItem, LocationOption } from "../../lib/api";
import { listLocations, createLocation, postTransfer } from "../../lib/api";

type Props = {
  open: boolean;
  product: StockItem;
  onClose: () => void;
  onDone: () => void;
};

export default function TransferModal({ open, product, onClose, onDone }: Props) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [toLabel, setToLabel] = useState<string>("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLocations(await listLocations());
      } catch {
        setLocations([]);
      }
    })();
  }, [open]);

  const canSubmit = useMemo(() => !!toLabel && !submitting, [toLabel, submitting]);
  if (!open) return null;

  const handleCreateLocation = async () => {
    const label = prompt("Novo endereço (formato B-01.3):");
    const val = (label ?? "").trim();
    if (!val) return;
    try {
      setCreating(true);
      const loc = await createLocation(val);
      setLocations((prev) =>
        prev.some((l) => l.id === loc.id) ? prev : [...prev, loc].sort((a, b) => a.label.localeCompare(b.label))
      );
      setToLabel(loc.label);
    } catch (e) {
      alert((e as Error).message || "Falha ao criar endereço.");
    } finally {
      setCreating(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      // encontra id pelo label (backend usa to_location_id)
      const to = locations.find((l) => l.label === toLabel);
      if (!to) {
        alert("Selecione um endereço válido.");
        return;
      }
      await postTransfer({
        product_id: product.product_id,
        to_location_id: to.id,
        note: note || undefined,
      });
      onDone();
    } catch (e) {
      console.error(e);
      alert("Falha ao transferir.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="text-lg font-semibold">Transferir</div>
        <div className="mt-1 text-sm text-gray-600">{product.description}</div>
        <div className="mt-1 text-xs text-gray-500">De: {product.location_label}</div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            Para (endereço)
            <div className="flex gap-2">
              <select
                value={toLabel}
                onChange={(e) => setToLabel(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Selecione…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.label}>{l.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreateLocation}
                className="rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
              >
                {creating ? "Criando…" : "Novo…"}
              </button>
            </div>
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
            disabled={!canSubmit}
            className={`rounded-lg px-3 py-2 text-white ${!canSubmit ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            Confirmar transferência
          </button>
        </div>
      </div>
    </div>
  );
}
