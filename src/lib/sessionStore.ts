// Sessão de alterações para destacar cards modificados (qty/location)
// Guarda também o último snapshot para comparar e evidenciar mudanças

export type ChangedItem = {
  product_id: number;
  lastQty?: number | null;
  lastLocationLabel?: string | null;
};

class SessionChanges {
  private map = new Map<number, ChangedItem>();

  mark(product_id: number, lastQty?: number | null, lastLocationLabel?: string | null) {
    const prev = this.map.get(product_id);
    this.map.set(product_id, {
      product_id,
      lastQty: lastQty ?? prev?.lastQty ?? null,
      lastLocationLabel: lastLocationLabel ?? prev?.lastLocationLabel ?? null,
    });
  }

  has(product_id: number) { return this.map.has(product_id); }
  get(product_id: number) { return this.map.get(product_id); }
  list() { return Array.from(this.map.values()); }
  clear() { this.map.clear(); }
}

export const sessionChanges = new SessionChanges();