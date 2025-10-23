// src/pages/StockPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  type QueryFunctionContext,
  type InfiniteData,
} from "@tanstack/react-query";

import FiltersBar, { type Filters } from "../components/FiltersBar";
import ProductCard from "../components/ProductCard";
import InModal from "../components/modals/InModal";
import OutModal from "../components/modals/OutModal";
import TransferModal from "../components/modals/TransferModal";
import HistoryModal from "../components/modals/HistoryModal";

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

  // Params para API (sempre sort asc por código)
  const queryParams: StockQuery = useMemo(() => {
    const q = filters.q ? wrapWithAsterisks(filters.q) : "";
    return {
      q,
      manufacturer_id: filters.manufacturerIds.length ? filters.manufacturerIds : undefined,
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
    queryKey: ["locations", "all"],
    queryFn: async (): Promise<LocationOption[]> => {
      const list = await listLocations(); // usa sua função atual
      // dedup e ordenação, sem any:
      const map = new Map<number, LocationOption>();
      for (const l of list) {
        if (l && typeof l.id === "number" && l.label) map.set(l.id, l);
      }
      return [...map.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "pt-BR")
      );
    },
    staleTime: 0,                // força buscar no mount
    refetchOnMount: true,        // evita “colar” no cache
    refetchOnWindowFocus: false, // não refetcha ao focar
    retry: 1,                    // uma tentativa extra é suficiente
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
    getNextPageParam: (last) =>
      last.items.length < PAGE_SIZE ? undefined : last.nextOffset,
    refetchOnWindowFocus: false,
  });

  // Flatten dos itens
  const products: StockItem[] = useMemo(
    () => (stockQuery.data?.pages ?? []).flatMap((p) => p.items),
    [stockQuery.data]
  );

  // Loading inicial
  const isInitialLoading =
    stockQuery.isLoading &&
    !(stockQuery.data as InfiniteData<StockResponse> | undefined);

  // --------------------
  // Infinite scroll no scroll da janela
  // --------------------
  const fetchingRef = useRef(false);
  const hasNextPage = stockQuery.hasNextPage;
  const isFetching = stockQuery.isFetching;
  const fetchNextPage = stockQuery.fetchNextPage;

  useEffect(() => {
    const onScroll = async () => {
      if (fetchingRef.current) return;
      if (!hasNextPage || isFetching) return;

      const scrollY = window.scrollY || window.pageYOffset;
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const fullH = document.documentElement.scrollHeight;

      if (scrollY + viewportH + 200 >= fullH) {
        fetchingRef.current = true;
        try {
          await fetchNextPage();
        } finally {
          fetchingRef.current = false;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasNextPage, isFetching, fetchNextPage]);

  // --------------------
  // Modais
  // --------------------
  const [inProduct, setInProduct] = useState<StockItem | null>(null);
  const [outProduct, setOutProduct] = useState<StockItem | null>(null);
  const [transferProduct, setTransferProduct] = useState<StockItem | null>(null);
  const [historyProductId, setHistoryProductId] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-5xl p-4 flex flex-col gap-4">
      <FiltersBar
        value={filters}
        onChange={setFilters}
        manufacturers={manufacturersQ.data ?? []}
        families={familiesQ.data ?? []}
        locations={locationsQ.data ?? []}
      />

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {products.map((p) => (
          <ProductCard
            key={`${p.product_id}-${p.location_label}`}
            item={p}
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
            Falha ao carregar estoque: {(stockQuery.error as Error)?.message ?? "erro desconhecido"}
          </div>
        )}

        {!isInitialLoading && products.length === 0 && !stockQuery.isError && (
          <div className="text-gray-500 text-center">Nenhum item encontrado.</div>
        )}

        {stockQuery.isFetchingNextPage && (
          <div className="text-center text-sm text-gray-500">Carregando mais...</div>
        )}
      </div>

      {/* Modais */}
      {inProduct && (
        <InModal
          open
          product={inProduct}
          reasons={reasons}
          onClose={() => setInProduct(null)}
          onDone={() => {
            setInProduct(null);
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
            setOutProduct(null);
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
            setTransferProduct(null);
            stockQuery.refetch();
          }}
        />
      )}

      {historyProductId !== null && (
        <HistoryModal productId={historyProductId} onClose={() => setHistoryProductId(null)} />
      )}
    </div>
  );
}
