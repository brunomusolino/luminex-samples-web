import { useState } from "react";
import OutModal from "./modals/OutModal";
import InModal from "./modals/InModal";
import TransferModal from "./modals/TransferModal";
import HistoryModal from "./modals/HistoryModal";
import type { StockItem } from "../lib/api";
import { sessionChanges } from "../lib/sessionStore";

export default function ProductCard({ item, onChanged }: { item: StockItem; onChanged: (p: { product_id: number; newQty?: number; newLocationLabel?: string | null; }) => void; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [inOpen, setInOpen] = useState(false);
  const [xferOpen, setXferOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);

  const changed = sessionChanges.has(item.product_id);
  const snapshot = sessionChanges.get(item.product_id);

  const qtyChanged = changed && snapshot?.lastQty != null && snapshot.lastQty !== item.qty;
  const locChanged = changed && snapshot?.lastLocationLabel != null && snapshot.lastLocationLabel !== item.location_label;

  return (
    <div className="border rounded-xl p-3 flex items-center justify-between hover:shadow-sm transition">
      <div className="min-w-0">
        <div className="font-semibold truncate">{item.part_number}</div>
        <div className="text-xs text-gray-600 truncate">{item.description || "—"}</div>
        <div className="text-xs text-gray-500 truncate">{item.manufacturer || ""}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className={`text-lg tabular-nums ${qtyChanged ? 'text-blue-700 underline' : ''}`}>{item.qty}</div>
        <div className={`text-sm ${locChanged ? 'text-blue-700 underline' : ''}`}>{item.location_label || "(sem endereço)"}</div>
        <div className="relative">
          <button className="border rounded px-2 py-1" onClick={() => setMenuOpen(v => !v)}>⋯</button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow">
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setOutOpen(true); }}>Retirar</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setInOpen(true); }}>Receber</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setXferOpen(true); }}>Transferir</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setMenuOpen(false); setHistOpen(true); }}>Histórico</button>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <OutModal
        open={outOpen}
        onClose={()=>setOutOpen(false)}
        product_id={item.product_id}
        location_id={item.location_id!}
        onSuccess={() => onChanged({ product_id: item.product_id })}
      />

      <InModal
        open={inOpen}
        onClose={()=>setInOpen(false)}
        product_id={item.product_id}
        currentQty={item.qty}
        currentLocationId={item.location_id}
        onSuccess={(_id, newLoc)=> onChanged({ product_id: item.product_id, newLocationLabel: newLoc ?? undefined })}
      />

      <TransferModal
        open={xferOpen}
        onClose={()=>setXferOpen(false)}
        product_id={item.product_id}
        onSuccess={(_moved, toLabel)=> onChanged({ product_id: item.product_id, newLocationLabel: toLabel })}
      />

      <HistoryModal open={histOpen} onClose={()=>setHistOpen(false)} product_id={item.product_id} />
    </div>
  );
}