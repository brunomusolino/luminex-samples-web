import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient, type QueryFunctionContext } from "@tanstack/react-query";
import FiltersBar, { type Filters } from "../components/FiltersBar";
import { type StockItem, type StockResponse, fetchStock } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { sessionChanges } from "../lib/sessionStore";

export default function StockPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    q: "", manufacturer_id: [], family_id: [], location_label: null, sort: "code", order: "asc"
  });
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isFetching
  } = useInfiniteQuery<StockResponse>({
    queryKey: ["stock", filters],
    queryFn: ({ pageParam = 0 }: QueryFunctionContext) =>
      fetchStock({
        q: filters.q,
        manufacturer_id: filters.manufacturer_id,
        family_id: filters.family_id,
        location_label: filters.location_label || undefined,
        sort: filters.sort,
        order: filters.order,
        limit: 30,
        offset: pageParam as number,
      }),
    getNextPageParam: (last: StockResponse) => (last.items.length ? last.nextOffset : undefined),
    initialPageParam: 0,
  });

  // Infinite scroll observer
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!bottomRef.current) return;
    const el = bottomRef.current;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items: StockItem[] = useMemo(() => (data?.pages || []).flatMap((p) => p.items), [data]);

  const filtered: StockItem[] = useMemo(() => {
    if (!showOnlyChanged) return items;
    const set = new Set(sessionChanges.list().map((x) => x.product_id));
    return items.filter((i) => set.has(i.product_id));
  }, [items, showOnlyChanged]);

  const onChanged = (p: { product_id: number; newQty?: number; newLocationLabel?: string | null }) => {
    const current = items.find((i) => i.product_id === p.product_id);
    sessionChanges.mark(p.product_id, current?.qty ?? null, current?.location_label ?? null);
    queryClient.removeQueries({ queryKey: ["stock"] });
    void refetch();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <FiltersBar value={filters} onChange={(f) => { setFilters(f); queryClient.removeQueries({ queryKey: ["stock"] }); }} />

      <div className="max-w-6xl mx-auto w-full px-3 py-3">
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-gray-600">{isFetching ? "Atualizando..." : `${filtered.length} itens`}</div>
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showOnlyChanged} onChange={(e) => setShowOnlyChanged(e.target.checked)} />
              Mostrar apenas alterados nesta sessão
            </label>
          </div>
        </div>

        <div className="grid gap-2">
          {filtered.map((it) => (
            <ProductCard key={`${it.product_id}-${it.location_id ?? 0}`} item={it} onChanged={onChanged} />
          ))}
        </div>

        <div ref={bottomRef} className="h-12" />
        {isFetchingNextPage && <div className="py-4 text-center text-sm text-gray-500">Carregando...</div>}
        {!hasNextPage && <div className="py-8 text-center text-xs text-gray-400">Fim da lista</div>}
      </div>
    </div>
  );
}
