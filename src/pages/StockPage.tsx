// src/pages/StockPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  type QueryFunctionContext,
  type InfiniteData,
} from "@tanstack/react-query";

import ActionsBar from "../components/ActionsBar";
import FiltersBar, { type Filters } from "../components/FiltersBar";
import ProductCard from "../components/ProductCard";
import InModal from "../components/modals/InModal";
import OutModal from "../components/modals/OutModal";
import TransferModal from "../components/modals/TransferModal";
import HistoryModal from "../components/modals/HistoryModal";
import NewProductInModal from "../components/modals/NewProductInModal";

import {
  fetchStock,
  fetchMovementReasons,
  fetchManufacturers,
  fetchFamilies,
  listLocations,
  type StockItem,
  type MovementReason,
  type StockQuery,
  type Manufacturer,
  type Family,
  type LocationOption,
  type StockResponse,
} from "../lib/api";

const PAGE_SIZE = 30;

// Garante * nas extremidades, preservando * no meio quando o usuário usar
function wrapWithAsterisks(s: string): string {
  let out = s.trim();
  if (out && !out.startsWith("*")) out = `*${out}`;
  if (out && !out.endsWith("*")) out = `${out}*`;
  return out;
}

type StockKey = readonly ["stock", string, string, string, string?];

export default function StockPage() {
  // --------------------
  // Filtros
  // --------------------
  const [filters, setFilters] = useState<Filters>({
    q: "",
    manufacturerIds: [],
    familyIds: [],
    locationLabel: "",
  });

  // Apenas alterados nesta sessão
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);

  // IDs de produtos alterados na sessão (IN/OUT/Transfer)
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set());
  const markChanged = (id: number) =>
    setChangedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  // Params para API (sempre sort asc por código)
  const queryParams: StockQuery = useMemo(() => {
    const q = filters.q ? wrapWithAsterisks(filters.q) : "";
    return {
      q,
      manufacturer_id: filters.manufacturerIds.length
        ? filters.manufacturerIds
        : undefined,
      family_id: filters.familyIds.length ? filters.familyIds : undefined,
      location_label: filters.locationLabel || undefined,
      sort: "code",
      order: "asc",
      limit: PAGE_SIZE,
    };
  }, [filters]);

  // Chave estável só com primitivos
  const stockKey = useMemo<StockKey>(() => {
    const mans = (queryParams.manufacturer_id ?? []).join(",");
    const fams = (queryParams.family_id ?? []).join(",");
    const loc = queryParams.location_label;
    return ["stock", queryParams.q ?? "", mans, fams, loc] as const;
  }, [queryParams]);

  // String derivada da chave p/ deps estáveis
  const stockKeyStr = (stockKey as readonly unknown[]).join("|");

  // --------------------
  // Catálogos
  // --------------------
  const manufacturersQ = useQuery<Manufacturer[]>({
    queryKey: ["manufacturers"],
    queryFn: fetchManufacturers,
    staleTime: 5 * 60 * 1000,
  });

  const familiesQ = useQuery<Family[]>({
    queryKey: ["families"],
    queryFn: fetchFamilies,
    staleTime: 5 * 60 * 1000,
  });

  const locationsQ = useQuery<LocationOption[]>({
    queryKey: ["locations/all"],
    queryFn: listLocations,
    staleTime: 5 * 60 * 1000,
  });

  const [reasons, setReasons] = useState<MovementReason[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchMovementReasons();
        setReasons(r);
      } catch {
        setReasons([]);
      }
    })();
  }, []);

  // --------------------
  // Infinite Query de estoque
  // --------------------
  const stockQuery = useInfiniteQuery({
    queryKey: stockKey,
    initialPageParam: 0 as number,
    queryFn: ({ pageParam }: QueryFunctionContext<StockKey, number>) => {
      const offset = pageParam ?? 0;
      return fetchStock({ ...queryParams, offset });
    },
    // 👇 Ajuste crítico: não assuma PAGE_SIZE!
    getNextPageParam: (last) =>
      last.items.length === 0 ? undefined : last.nextOffset,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  // Flatten dos itens
  const products: StockItem[] = useMemo(
    () => (stockQuery.data?.pages ?? []).flatMap((p) => p.items),
    [stockQuery.data]
  );

  const productsFiltered = useMemo(() => {
    if (!showOnlyChanged) return products;
    return products.filter((p) => changedIds.has(p.product_id));
  }, [products, showOnlyChanged, changedIds]);

  // Loading inicial
  const isInitialLoading =
    stockQuery.isLoading &&
    !(stockQuery.data as InfiniteData<StockResponse> | undefined);

  // --------------------
  // Lista com scroll próprio + fallbacks
  // --------------------
  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = stockQuery;

  // IntersectionObserver — quando o sentinel entra, busca próxima página
  useEffect(() => {
    const root = listRef.current;
    const sent = sentinelRef.current;
    if (!root || !sent) return;

    const io = new IntersectionObserver(
      async (entries) => {
        const e = entries[0];
        if (
          e?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !fetchingRef.current
        ) {
          fetchingRef.current = true;
          try {
            await fetchNextPage();
          } finally {
            fetchingRef.current = false;
          }
        }
      },
      { root, rootMargin: "300px 0px", threshold: 0 }
    );

    io.observe(sent);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, stockKeyStr, productsFiltered.length]);

  // Fallback: listener de scroll no container
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const onScroll = async () => {
      if (!hasNextPage || isFetchingNextPage || fetchingRef.current) return;
      const nearBottom =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 200;
      if (nearBottom) {
        fetchingRef.current = true;
        try {
          await fetchNextPage();
        } finally {
          fetchingRef.current = false;
        }
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, stockKeyStr]);

  // Auto-carregar quando a lista ainda não tem rolagem (e em redimensionamentos)
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const tryFetch = async () => {
      if (!hasNextPage || isFetchingNextPage || fetchingRef.current) return;
      const noScroll = root.scrollHeight <= root.clientHeight + 8;
      if (noScroll) {
        fetchingRef.current = true;
        try {
          await fetchNextPage();
        } finally {
          fetchingRef.current = false;
        }
      }
    };

    void tryFetch();

    const ro = new ResizeObserver(() => void tryFetch());
    ro.observe(root);
    return () => ro.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, productsFiltered.length, stockKeyStr]);

  // --------------------
  // Modais
  // --------------------
  const [inProduct, setInProduct] = useState<StockItem | null>(null);
  const [outProduct, setOutProduct] = useState<StockItem | null>(null);
  const [transferProduct, setTransferProduct] = useState<StockItem | null>(null);
  const [historyProductId, setHistoryProductId] = useState<number | null>(null);

  // Novo modal: cadastro + entrada
  const [newProdOpen, setNewProdOpen] = useState(false);

  return (
    <>
      {/* Top bar fixa */}
      <div className="fixed top-0 left-0 right-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div>
            <div className="text-2xl font-semibold text-gray-900 leading-tight">
              Luminex App
            </div>
            <div className="text-sm text-gray-500 -mt-0.5">Samples inventory</div>
          </div>
          <div className="text-xs text-gray-400 select-none" />
        </div>
      </div>

      {/* Wrapper com padding para top/footer fixos */}
      <div className="mx-auto max-w-5xl px-4 pt-16 pb-14">
        <div className="flex h-[calc(100vh-64px-56px)] flex-col gap-3">
          {/* Barra de ações */}
          {/* Barra de ações (afastada do topbar) */}
          <div className="mt-3 md:mt-4">
            <ActionsBar onNewProductIn={() => setNewProdOpen(true)} />
          </div>

          {/* Filtros */}
          <div>
            <FiltersBar
              value={filters}
              onChange={setFilters}
              manufacturers={manufacturersQ.data ?? []}
              families={familiesQ.data ?? []}
              locations={locationsQ.data ?? []}
            />
          </div>

          {/* Lista com scroll */}
          <div
            ref={listRef}
            key={stockKeyStr}
            className="flex-1 overflow-y-auto pr-1"
            aria-label="Lista de produtos"
          >
            <div className="flex flex-col gap-3">
              {productsFiltered.map((p) => (
                <ProductCard
                  key={`${p.product_id}-${p.location_label}`}
                  item={p}
                  highlighted={changedIds.has(p.product_id)}
                  onIn={() => setInProduct(p)}
                  onOut={() => setOutProduct(p)}
                  onTransfer={() => setTransferProduct(p)}
                  onHistory={() => setHistoryProductId(p.product_id)}
                />
              ))}

              {isInitialLoading && (
                <div className="text-sm text-gray-500">Carregando produtos...</div>
              )}

              {stockQuery.isError && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-700">
                  Falha ao carregar estoque:{" "}
                  {(stockQuery.error as Error)?.message ?? "erro desconhecido"}
                </div>
              )}

              {!isInitialLoading && productsFiltered.length === 0 && !stockQuery.isError && (
                <div className="text-center text-gray-500">Nenhum item encontrado.</div>
              )}

              {/* Sentinel + botão de fallback manual */}
              {hasNextPage && (
                <div ref={sentinelRef} className="py-3 text-center text-sm text-gray-500">
                  <button
                    onClick={() => fetchNextPage()}
                    className="rounded-lg border px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Carregando mais..." : "Carregar mais…"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé fixo com filtro "Somente alterados" */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showOnlyChanged}
              onChange={(e) => setShowOnlyChanged(e.target.checked)}
            />
            Mostrar somente itens alterados nesta sessão
          </label>

          {changedIds.size > 0 && (
            <div className="text-xs text-gray-500">
              {changedIds.size} produto(s) alterado(s) nesta sessão
            </div>
          )}
        </div>
      </div>

      {/* Modais existentes */}
      {inProduct && (
        <InModal
          open
          product={inProduct}
          reasons={reasons}
          onClose={() => setInProduct(null)}
          onDone={() => {
            const id = inProduct?.product_id;
            setInProduct(null);
            if (id) markChanged(id);
            stockQuery.refetch();
          }}
        />
      )}

      {outProduct && (
        <OutModal
          open
          product={outProduct}
          reasons={reasons}
          onClose={() => setOutProduct(null)}
          onDone={() => {
            const id = outProduct?.product_id;
            setOutProduct(null);
            if (id) markChanged(id);
            stockQuery.refetch();
          }}
        />
      )}

      {transferProduct && (
        <TransferModal
          open
          product={transferProduct}
          onClose={() => setTransferProduct(null)}
          onDone={() => {
            const id = transferProduct?.product_id;
            setTransferProduct(null);
            if (id) markChanged(id);
            stockQuery.refetch();
          }}
        />
      )}

      {historyProductId !== null && (
        <HistoryModal
          productId={historyProductId}
          onClose={() => setHistoryProductId(null)}
        />
      )}

      {/* Modal de cadastro + entrada */}
      {newProdOpen && (
        <NewProductInModal
          open={newProdOpen}
          onClose={() => setNewProdOpen(false)}
          onDone={(newId) => {
            markChanged(newId);
            setNewProdOpen(false);
            stockQuery.refetch();
          }}
        />
      )}
    </>
  );
}
