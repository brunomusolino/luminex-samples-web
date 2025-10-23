import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Manufacturer, Family, LocationOption } from "../lib/api";

export type Filters = {
  q: string;
  manufacturerIds: number[]; // [] => Todos
  familyIds: number[];       // [] => Todas
  locationLabel?: string;    // undefined => Todos
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
  const famSearchRef = useRef<HTMLInputElement>(null);
  const [famQuery, setFamQuery] = useState("");

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const targets = Array.from(document.querySelectorAll("[data-dropdown]"));
      if (targets.some((t) => t.contains(e.target as Node))) return;
      setOpen({ makers: false, fams: false, locs: false });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

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

  const toggleMaker = () => setOpen((s) => ({ ...s, makers: !s.makers }));
  const toggleFams = () => {
    setOpen((s) => ({ ...s, fams: !s.fams }));
    setTimeout(() => famSearchRef.current?.focus(), 0);
  };
  const toggleLocs = () => setOpen((s) => ({ ...s, locs: !s.locs }));

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

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Busca livre */}
      <div className="flex-1 min-w-[260px]">
        <input
          value={value.q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (ex.: C1*STRADA). Curingas * são adicionados nas extremidades automaticamente."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {/* Fabricantes */}
      <div className="relative" data-dropdown>
        <button onClick={toggleMaker} className="rounded-lg border border-gray-300 px-3 py-2 bg-white hover:bg-gray-50">
          Fabricantes {value.manufacturerIds.length > 0 ? `(${value.manufacturerIds.length})` : "(Todos)"}
        </button>
        {open.makers && (
          <div className="absolute z-20 mt-2 w-72 max-h-72 overflow-auto rounded-xl border bg-white p-2 shadow-lg">
            <button
              className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 font-medium"
              onClick={() => setMakers([])} // ← “Todos” limpa (não envia IDs)
            >
              Todos
            </button>
            <hr className="my-1" />
            {manufacturers.map((m) => (
              <label key={m.id} className="flex items-center gap-2 px-2 py-1">
                <input
                  type="checkbox"
                  checked={value.manufacturerIds.includes(m.id)}
                  onChange={() => toggleOneMaker(m.id)}
                />
                <span>{m.name || m.manufacturer}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Famílias (com busca) */}
      <div className="relative" data-dropdown>
        <button onClick={toggleFams} className="rounded-lg border border-gray-300 px-3 py-2 bg-white hover:bg-gray-50">
          Famílias {value.familyIds.length > 0 ? `(${value.familyIds.length})` : "(Todas)"}
        </button>
        {open.fams && (
          <div className="absolute z-20 mt-2 w-80 max-h-80 overflow-auto rounded-xl border bg-white p-2 shadow-lg">
            <div className="px-2 py-1">
              <input
                ref={famSearchRef}
                value={famQuery}
                onChange={(e) => setFamQuery(e.target.value)}
                placeholder="Filtrar famílias..."
                className="w-full rounded border border-gray-300 px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <button
              className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 font-medium"
              onClick={() => setFamilies([])} // ← “Todas” limpa (não envia IDs)
            >
              Todas
            </button>
            <hr className="my-1" />
            {filteredFamilies.map((f) => (
              <label key={f.id} className="flex items-center gap-2 px-2 py-1">
                <input
                  type="checkbox"
                  checked={value.familyIds.includes(f.id)}
                  onChange={() => toggleOneFamily(f.id)}
                />
                <span>{f.name || f.family}</span>
              </label>
            ))}
            {filteredFamilies.length === 0 && (
              <div className="p-2 text-sm text-gray-500">Nenhuma família encontrada.</div>
            )}
          </div>
        )}
      </div>

      {/* Endereços */}
      <div className="relative" data-dropdown>
        <button onClick={toggleLocs} className="rounded-lg border border-gray-300 px-3 py-2 bg-white hover:bg-gray-50">
          Endereço {value.locationLabel ? `(${value.locationLabel})` : "(Todos)"}
        </button>
        {open.locs && (
          <div className="absolute z-20 mt-2 w-72 max-h-80 overflow-auto rounded-xl border bg-white p-2 shadow-lg">
            <button
              className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 font-medium"
              onClick={() => setLocationLabel(undefined)}
            >
              Todos
            </button>
            <hr className="my-1" />
            {locations.map((l) => (
              <button
                key={l.id}
                className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${
                  value.locationLabel === l.label ? "bg-indigo-50" : ""
                }`}
                onClick={() => setLocationLabel(l.label)}
              >
                {l.label}
              </button>
            ))}
            {locations.length === 0 && (
              <div className="p-2 text-sm text-gray-500">Nenhum endereço cadastrado.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
