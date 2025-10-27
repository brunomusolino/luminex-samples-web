// src/components/ActionsBar.tsx
import { Plus } from "lucide-react";

type Props = {
  onNewProductIn: () => void;
};

export default function ActionsBar({ onNewProductIn }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-gray-700">
          Ações rápidas
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewProductIn}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={16} />
            Novo Produto
          </button>
        </div>
      </div>
    </div>
  );
}
