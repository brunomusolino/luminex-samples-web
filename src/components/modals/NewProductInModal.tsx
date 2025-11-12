// src/components/modals/NewProductInModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  fetchManufacturers,
  fetchFamilies,
  listLocations,
  createLocation,
  createFamily,   // deve existir em lib/api
  createProduct,  // deve existir em lib/api
  postIn,
  fetchMovementReasons,
  type Manufacturer,
  type Family,
  type LocationOption,
} from "../../lib/api";
import { useQuery } from "@tanstack/react-query";
import { loginAndAcquireToken } from "../../lib/msal";


type Props = {
  open: boolean;
  onClose: () => void;
  onDone: (newId: number) => void;
};

// Helpers de tipo para evitar "any"
type UnknownRecord = Record<string, unknown>;
const isObject = (u: unknown): u is UnknownRecord =>
  typeof u === "object" && u !== null;

function readStr(o: UnknownRecord, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}
function readNum(o: UnknownRecord, key: string): number | undefined {
  const v = o[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return undefined;
}
// Extrai um array de itens de respostas que podem vir como { items: [...] } ou direto [...]
function extractItemsArray(u: unknown): UnknownRecord[] {
  if (Array.isArray(u)) return u as UnknownRecord[];
  if (isObject(u) && Array.isArray((u as UnknownRecord).items)) {
    return (u as UnknownRecord).items as UnknownRecord[];
  }
  return [];
}

function pickDefaultReasonId(list: { id: number; name: string }[]): number | null {
  if (!Array.isArray(list) || list.length === 0) return null;

  const preferred = [
    "Ajuste inventário",
    "Ajuste",
    "Inventário",
    "Entrada",
  ];

  // tenta match exato por nome
  for (const target of preferred) {
    const found = list.find(r => r.name?.toLowerCase() === target.toLowerCase());
    if (found) return found.id;
  }

  // tenta match por inclusão (mais tolerante)
  const byIncludes = list.find(r => /ajuste|invent/i.test(r.name || ""));
  if (byIncludes) return byIncludes.id;

  // fallback: primeiro da lista
  return list[0].id ?? null;
}

export default function NewProductInModal({ open, onClose, onDone }: Props) {
  // Catálogos
  const mansQ = useQuery<Manufacturer[]>({
    queryKey: ["manufacturers"],
    queryFn: fetchManufacturers,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });
  const famsQ = useQuery<Family[]>({
    queryKey: ["families"],
    queryFn: fetchFamilies,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });
  const locsQ = useQuery<LocationOption[]>({
    queryKey: ["locations/all"],
    queryFn: listLocations,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturerId, setManufacturerId] = useState<number | "">("");
  const [familyId, setFamilyId] = useState<number | "">("");
  const [qtyStr, setQtyStr] = useState("1");
  const [toLabel, setToLabel] = useState("");
  const [note, setNote] = useState("");

  // Estado de verificação de duplicado
  const [existsInfo, setExistsInfo] = useState<
    | null
    | {
        product_id: number;
        part_number: string;
        description: string;
        manufacturer?: string;
        family?: string;
      }
  >(null);
  const exists = !!existsInfo;

  // Reset quando abre
  useEffect(() => {
    if (!open) return;
    setCode("");
    setDescription("");
    setManufacturerId("");
    setFamilyId("");
    setQtyStr("1");
    setToLabel("");
    setNote("");
    setExistsInfo(null);
  }, [open]);

  // Verifica se o produto (código) já existe ao sair do campo
  const checkExisting = async () => {
    const candidate = code.trim();
    if (!candidate) {
      setExistsInfo(null);
      return;
    }
    try {
      const base =
        (import.meta as unknown as { env: Record<string, string> }).env
          .VITE_API_BASE_URL ||
        `https://${
          (import.meta as unknown as { env: Record<string, string> }).env
            .VITE_API_HOST
        }`;
      const url = new URL("/api/products", base);
      // backend faz LIKE/contains; depois conferimos igualdade exata de part_number
      url.searchParams.set("q", candidate);

      const token = await loginAndAcquireToken();
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const json: unknown = await res.json().catch(() => ({} as unknown));
      const items = extractItemsArray(json);

      const found = items.find((r) => {
        const pn = (readStr(r, "part_number") ?? "").trim().toLowerCase();
        return pn === candidate.toLowerCase();
      });

      if (found) {
        setExistsInfo({
          product_id:
            readNum(found, "product_id") ??
            readNum(found, "id") ??
            0,
          part_number: readStr(found, "part_number") ?? candidate,
          description: readStr(found, "description") ?? "",
          manufacturer: readStr(found, "manufacturer") ?? undefined,
          family: readStr(found, "family") ?? undefined,
        });
        // Preenche campos com info existente (somente leitura visual)
        setDescription(readStr(found, "description") ?? "");
      } else {
        setExistsInfo(null);
      }
    } catch {
      // Em caso de erro na verificação, não bloquear criação
      setExistsInfo(null);
    }
  };

  // quantidade (texto para permitir apagar)
  const qtyNum = useMemo(() => {
    if (qtyStr.trim() === "") return undefined;
    const n = Number(qtyStr);
    return Number.isFinite(n) ? n : undefined;
  }, [qtyStr]);

  const canSubmit =
    open &&
    !exists && // bloqueia quando já existe
    code.trim().length > 0 &&
    description.trim().length > 0 &&
    typeof manufacturerId === "number" &&
    manufacturerId > 0 &&
    (typeof familyId === "number" ? familyId > 0 : true) &&
    typeof qtyNum === "number" &&
    qtyNum >= 1 &&
    toLabel.trim().length > 0;

  const onCreateFamily = async () => {
    const name = prompt("Nome da nova família:");
    const val = (name ?? "").trim();
    if (!val) return;
    try {
      const fam = await createFamily(val);
      // Atualiza seleção para a família criada
      setFamilyId(fam.id);
      // Atualiza cache de famílias (opcional)
      famsQ.refetch();
    } catch (e) {
      alert((e as Error).message || "Falha ao criar família.");
    }
  };

  const onCreateLocation = async () => {
    const label = prompt("Novo endereço (formato B-01.3):");
    const val = (label ?? "").trim();
    if (!val) return;
    try {
      const loc = await createLocation(val);
      setToLabel(loc.label);
      // Atualiza cache de endereços (opcional)
      locsQ.refetch();
    } catch (e) {
      alert((e as Error).message || "Falha ao criar endereço.");
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      // 1) cria produto (sem is_active para evitar erro de tipo)
      const product = await createProduct({
        part_number: code.trim(),
        description: description.trim(),
        manufacturer_id: Number(manufacturerId),
        family_id: typeof familyId === "number" ? familyId : undefined,
      });

      const pid =
        (isObject(product) && readNum(product as UnknownRecord, "id")) ??
        (isObject(product) && readNum(product as UnknownRecord, "product_id"));

      if (!pid) {
        alert("Falha ao criar produto.");
        return;
      }

      // 2) resolve reason_id dinamicamente
      const reasons = await fetchMovementReasons();
      const reasonId = pickDefaultReasonId(reasons);
      if (!reasonId) {
        alert("Nenhum motivo de movimentação disponível. Cadastre um motivo (ex.: 'Ajuste de inventário').");
        return;
      }

      // 3) dá entrada
      const allLocs = locsQ.data ?? [];
      const found = allLocs.find((l) => l.label === toLabel);
      if (!found) {
        alert("Selecione um endereço válido.");
        return;
      }

      await postIn({
        product_id: pid,
        location_id: found.id,      // ou resolva pelo label como já faz hoje
        qty: qtyNum,
        reason_id: reasonId,
        customer: "",
        note: note || undefined,
      });


      onDone(pid);
    } catch (e) {
      alert((e as Error).message || "Falha ao salvar.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-3">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b px-4 py-3">
          <div className="text-lg font-semibold">Novo produto + entrada</div>
          <div className="text-sm text-gray-600">
            Cadastre o produto e já dê entrada no estoque.
          </div>
        </div>

        {exists && (
          <div className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-800">
            Produto já existe: <b>{existsInfo?.part_number}</b> — não é possível atualizar via este modal.
          </div>
        )}

        <div className="px-4 py-3 space-y-3">
          <div className="grid gap-3">
            <label className="block">
              <span className="text-sm text-gray-700">Código (part number)</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onBlur={checkExisting}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Ex.: C1-ABC-123"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">Descrição</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={exists}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">Fabricante</span>
              <select
                value={manufacturerId}
                onChange={(e) =>
                  setManufacturerId(e.target.value ? Number(e.target.value) : "")
                }
                disabled={exists}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
              >
                <option value="">Selecione…</option>
                {(mansQ.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.manufacturer}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">Família</span>
              <div className="mt-1 flex gap-2">
                <select
                  value={familyId}
                  onChange={(e) =>
                    setFamilyId(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={exists}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                >
                  <option value="">(sem família)</option>
                  {(famsQ.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name || f.family}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onCreateFamily}
                  disabled={exists}
                  className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 disabled:bg-gray-100"
                >
                  Novo…
                </button>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-gray-700">Quantidade</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={qtyStr}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!/^\d*$/.test(v)) return;
                    const normalized =
                      v === "" ? "" : v === "0" ? "0" : v.replace(/^0+(\d)/, "$1");
                    setQtyStr(normalized);
                  }}
                  onBlur={() => {
                    if (qtyStr.trim() === "" || Number(qtyStr) < 1) setQtyStr("1");
                  }}
                  disabled={exists}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-700">Endereço</span>
                <div className="mt-1 flex gap-2">
                  <select
                    value={toLabel}
                    onChange={(e) => setToLabel(e.target.value)}
                    disabled={exists}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                  >
                    <option value="">Selecione…</option>
                    {(locsQ.data ?? []).map((l) => (
                      <option key={l.id} value={l.label}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onCreateLocation}
                    disabled={exists}
                    className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 disabled:bg-gray-100"
                  >
                    Novo…
                  </button>
                </div>
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-gray-700">Observação (opcional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={exists}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100"
                rows={3}
              />
            </label>
          </div>
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
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
