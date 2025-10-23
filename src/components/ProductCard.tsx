import type { StockItem } from "../lib/api";
import { Clock, LogIn, LogOut, ArrowLeftRight } from "lucide-react";

type Props = {
  item: StockItem;
  /** quando true, aplica fundo vermelho clarinho para destacar item alterado na sessão */
  highlighted?: boolean;
  onIn: () => void;
  onOut: () => void;
  onTransfer: () => void;
  onHistory: () => void;
};

export default function ProductCard({
  item,
  highlighted = false,
  onIn,
  onOut,
  onTransfer,
  onHistory,
}: Props) {
  const part = item.part_number ?? item.code;

  const base =
    "rounded-xl border p-4 shadow-sm transition-colors";
  const cardClass = highlighted
    ? `${base} bg-rose-50 border-rose-200`
    : `${base} bg-white border-gray-200`;

  return (
    <div className={cardClass}>
      <div className="flex gap-4">
        {/* info principal */}
        <div className="flex-1">
          {/* Part number destacado */}
          <div className="text-base font-medium text-gray-900">{part}</div>
          {/* Descrição mais sutil */}
          <div className="mt-0.5 text-sm text-gray-600">{item.description}</div>
        </div>

        {/* coluna direita com qty/endereço */}
        <div className="flex min-w-[220px] flex-col items-end justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Qtd. em estoque: </span>
            <span className="font-semibold">{item.qty}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Endereço: </span>
            <span className="font-semibold">{item.location_label}</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onIn}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
              title="Entrada (IN)"
            >
              <LogIn size={16} /> IN
            </button>
            <button
              onClick={onOut}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
              title="Saída (OUT)"
            >
              <LogOut size={16} /> OUT
            </button>
            <button
              onClick={onTransfer}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
              title="Transferir"
            >
              <ArrowLeftRight size={16} /> Transf.
            </button>
            <button
              onClick={onHistory}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
              title="Histórico"
            >
              <Clock size={16} /> Hist.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
