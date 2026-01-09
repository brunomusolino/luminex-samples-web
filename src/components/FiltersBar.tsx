import { useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Manufacturer, Family, LocationOption } from "../lib/api";

export type Filters = {
  q: string;
  manufacturerIds: number[]; // [] => Todos
  familyIds: number[];       // [] => Todas
  locationLabel?: string;    // undefined => Todos
  inStockOnly: boolean;      // true => apenas itens com estoque > 0
};

type Props = {
  value: Filters;
  onChange: Dispatch<SetStateAction<Filters>>;
  manufacturers: Manufacturer[];
  families: Family[];
  locations: LocationOption[];
};

type DropState = { makers: boolean; fams: boolean; locs: boolean };

export default function FiltersBar({
  value,
  onChange,
  manufacturers,
  families,
  locations,
}: Props) {
  const [open, setOpen] = useState<DropState>({ makers: false, fams: false, locs: false });
  const [famQuery, setFamQuery] = useState("");
  const famSearchRef = useRef<HTMLInputElement>(null);

  const filteredFamilies = useMemo(() => {
    const q = famQuery.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f) => (f.name || f.family || "").toLowerCase().includes(q));
  }, [families, famQuery]);

  // helpers
  const setQ = (q: string) => onChange((v) => ({ ...v, q }));
  const setMakers = (ids: number[]) => onChange((v) => ({ ...v, manufacturerIds: ids }));
  const setFamilies = (ids: number[]) => onChange((v) => ({ ...v, familyIds: ids }));
  const setLocationLabel = (label?: string) => onChange((v) => ({ ...v, locationLabel: label }));
  const setInStockOnly = (inStockOnly: boolean) => onChange((v) => ({ ...v, inStockOnly }));

  const toggleOneMaker = (id: number) => {
    setMakers(
      value.manufacturerIds.includes(id)
        ? value.manufacturerIds.filter((x) => x !== id)
        : [...value.manufacturerIds, id]
    );
  };
  const toggleOneFamily = (id: number) => {
    setFamilies(
      value.familyIds.includes(id)
        ? value.familyIds.filter((x) => x !== id)
        : [...value.familyIds, id]
    );
  };

  // estilo consistente com o resto da UI
  const btnClass =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  // 👇 sem mt-2; encosta no botão
  const menuClass =
    "absolute left-0 top-full z-30 w-80 max-h-80 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      {/* Busca livre */}
      <div className="flex-1 min-w-[260px]">
        <input
          value={value.q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (ex.: C1*STRADA). Curingas * são adicionados nas extremidades automaticamente."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {/* Fabricantes */}
      <div
        className="relative"
        onMouseEnter={() => setOpen((s) => ({ ...s, makers: true }))}
        onMouseLeave={() => setOpen((s) => ({ ...s, makers: false }))}
      >
        <button
          onClick={() => setOpen((s) => ({ ...s, makers: !s.makers }))}
          className={btnClass}
          type="button"
        >
          Fabricantes {value.manufacturerIds.length > 0 ? `(${value.manufacturerIds.length})` : "(Todos)"}
        </button>
        {open.makers && (
          <div className={`${menuClass} w-72`}>
            <button
              className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-gray-50 rounded-lg"
              onClick={() => setMakers([])}
              type="button"
            >
              Todos
            </button>
            <hr className="my-1" />
            {manufacturers.map((m) => (
              <label key={m.id} className="flex items-center gap-2 px-3 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={value.manufacturerIds.includes(m.id)}
                  onChange={() => toggleOneMaker(m.id)}
                />
                <span className="text-gray-800">{m.name || m.manufacturer}</span>
              </label>
            ))}
            {manufacturers.length === 0 && (
              <div className="p-3 text-sm text-gray-500">Nenhum fabricante encontrado.</div>
            )}
          </div>
        )}
      </div>

      {/* Famílias */}
      <div
        className="relative"
        onMouseEnter={() => {
          setOpen((s) => ({ ...s, fams: true }));
          setTimeout(() => famSearchRef.current?.focus(), 60);
        }}
        onMouseLeave={() => setOpen((s) => ({ ...s, fams: false }))}
      >
        <button
          onClick={() => setOpen((s) => ({ ...s, fams: !s.fams }))}
          className={btnClass}
          type="button"
        >
          Famílias {value.familyIds.length > 0 ? `(${value.familyIds.length})` : "(Todas)"}
        </button>
        {open.fams && (
          <div className={`${menuClass} w-80`}>
            <div className="px-3 py-2">
              <input
                ref={famSearchRef}
                value={famQuery}
                onChange={(e) => setFamQuery(e.target.value)}
                placeholder="Filtrar famílias..."
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <button
              className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-gray-50 rounded-lg"
              onClick={() => setFamilies([])}
              type="button"
            >
              Todas
            </button>
            <hr className="my-1" />
            {filteredFamilies.map((f) => (
              <label key={f.id} className="flex items-center gap-2 px-3 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={value.familyIds.includes(f.id)}
                  onChange={() => toggleOneFamily(f.id)}
                />
                <span className="text-gray-800">{f.name || f.family}</span>
              </label>
            ))}
            {filteredFamilies.length === 0 && (
              <div className="p-3 text-sm text-gray-500">Nenhuma família encontrada.</div>
            )}
          </div>
        )}
      </div>

      {/* Endereços */}
      <div
        className="relative"
        onMouseEnter={() => setOpen((s) => ({ ...s, locs: true }))}
        onMouseLeave={() => setOpen((s) => ({ ...s, locs: false }))}
      >
        <button
          onClick={() => setOpen((s) => ({ ...s, locs: !s.locs }))}
          className={btnClass}
          type="button"
        >
          Endereço {value.locationLabel ? `(${value.locationLabel})` : "(Todos)"}
        </button>
        {open.locs && (
          <div className={`${menuClass} w-72`}>
            <button
              className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-gray-50 rounded-lg"
              onClick={() => setLocationLabel(undefined)}
              type="button"
            >
              Todos
            </button>
            <hr className="my-1" />
            {locations.map((l) => (
              <button
                key={l.id}
                className={`w-full px-3 py-1 text-left text-sm rounded-lg hover:bg-gray-50 ${
                  value.locationLabel === l.label ? "bg-indigo-50" : ""
                }`}
                onClick={() => setLocationLabel(l.label)}
                type="button"
              >
                <span className="text-gray-800">{l.label}</span>
              </button>
            ))}
            {locations.length === 0 && (
              <div className="p-3 text-sm text-gray-500">Nenhum endereço cadastrado.</div>
            )}
          </div>
        )}
      </div>

      {/* Linha inferior: apenas itens em estoque */}
      <div className="w-full border-t border-gray-100 pt-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
          <input
            type="checkbox"
            checked={value.inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          Exibir apenas produtos em estoque
        </label>
      </div>
    </div>
  );
}
