import { useEffect, useMemo, useState } from "react";
import type { Family, Manufacturer } from "../lib/api";
import { fetchFamilies, fetchManufacturers, searchLocations, createLocation } from "../lib/api";

export type Filters = {
  q: string;
  manufacturer_id: number[];
  family_id: number[];
  location_label: string | null; // por enquanto 1 label; depois estendemos p/ multi
  sort: "code" | "qty" | "address";
  order: "asc" | "desc";
};

export default function FiltersBar({ value, onChange }: { value: Filters; onChange: (f: Filters) => void; }) {
  const [mans, setMans] = useState<Manufacturer[]>([]);
  const [fams, setFams] = useState<Family[]>([]);
  const [locQuery, setLocQuery] = useState("");
  const [locOpts, setLocOpts] = useState<{ id: number; location_label: string }[]>([]);

  useEffect(() => { fetchManufacturers().then(setMans).catch(() => setMans([])); }, []);
  useEffect(() => { fetchFamilies().then(setFams).catch(() => setFams([])); }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      const q = locQuery.trim();
      if (!q) { setLocOpts([]); return; }
      const rows = await searchLocations(q);
      if (alive) setLocOpts(rows);
    })();
    return () => { alive = false; };
  }, [locQuery]);

  const update = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  const onCreateLocation = async () => {
    const label = prompt("Digite o novo endereço no formato B-01.3");
    if (!label) return;
    const r = await createLocation(label.trim());
    update({ location_label: r.location_label });
  };

  const sortLabel = useMemo(() => ({ code: "Código", qty: "Qtd", address: "Endereço" }), []);

  return (
    <div className="w-full sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-3 py-2 grid gap-2 md:grid-cols-12 items-center">
        {/* Busca livre */}
        <div className="md:col-span-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Código ou descrição (use * como coringa)"
            value={value.q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>

        {/* Fabricante (multi) */}
        <div className="md:col-span-3">
          {mans.length ? (
            <select
              multiple
              className="w-full border rounded px-2 py-2 h-10"
              value={value.manufacturer_id.map(String)}
              onChange={(e) => {
                const ids = Array.from(e.target.selectedOptions).map(o => parseInt(o.value, 10)).filter(n => n>0);
                update({ manufacturer_id: ids });
              }}
            >
              {mans.map(m => <option key={m.id} value={m.id}>{m.manufacturer}</option>)}
            </select>
          ) : (
            <div className="text-xs text-gray-500">Fabricantes indisponíveis</div>
          )}
        </div>

        {/* Família (multi) */}
        <div className="md:col-span-3">
          <select
            multiple
            className="w-full border rounded px-2 py-2 h-10"
            value={value.family_id.map(String)}
            onChange={(e) => {
              const ids = Array.from(e.target.selectedOptions).map(o => parseInt(o.value, 10)).filter(n => n>0);
              update({ family_id: ids });
            }}
          >
            {fams.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Endereço (1 seleção por enquanto) */}
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Endereço (ex.: B-01.3)"
            value={value.location_label ?? ""}
            onChange={(e) => update({ location_label: e.target.value.toUpperCase() })}
            list="loc-list"
            onInput={(e) => setLocQuery((e.target as HTMLInputElement).value)}
          />
          <datalist id="loc-list">
            {locOpts.map(o => <option key={o.id} value={o.location_label} />)}
          </datalist>
          <button className="border rounded px-2 py-2" onClick={onCreateLocation}>+ Endereço</button>
        </div>

        {/* Ordenação */}
        <div className="md:col-span-12 flex items-center gap-2 pt-1">
          <label className="text-sm">Ordenar por:</label>
          <select className="border rounded px-2 py-1" value={value.sort}
            onChange={(e) => update({ sort: e.target.value as Filters["sort"] })}>
            <option value="code">{sortLabel.code}</option>
            <option value="qty">{sortLabel.qty}</option>
            <option value="address">{sortLabel.address}</option>
          </select>
          <select className="border rounded px-2 py-1" value={value.order}
            onChange={(e) => update({ order: e.target.value as Filters["order"] })}>
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <button className="ml-auto text-sm underline" onClick={() => onChange({ q: "", manufacturer_id: [], family_id: [], location_label: null, sort: "code", order: "asc" })}>Limpar filtros</button>
        </div>
      </div>
    </div>
  );
}